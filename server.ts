import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { SEED_ROOMS } from './src/utils/seedData.ts';
import { GroupOrderRoom, MenuItem, ParticipantOrder } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Storage for Group Order Rooms
const roomsStore = new Map<string, GroupOrderRoom>();

// Seed with default rooms
for (const room of SEED_ROOMS) {
  roomsStore.set(room.id, JSON.parse(JSON.stringify(room)));
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// List and get rooms
app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(roomsStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ success: true, rooms });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomsStore.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: '找不到該團購房間' });
  }
  res.json({ success: true, room });
});

// Create new room
app.post('/api/rooms', (req, res) => {
  const newRoom: GroupOrderRoom = {
    id: req.body.id || `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: req.body.title || '新團購活動',
    storeName: req.body.storeName || '團購店家',
    storePhone: req.body.storePhone || '',
    storeAddress: req.body.storeAddress || '',
    category: req.body.category || 'other',
    description: req.body.description || '',
    organizerName: req.body.organizerName || '團購主揪',
    cutoffTime: req.body.cutoffTime,
    targetAmount: req.body.targetAmount ? Number(req.body.targetAmount) : undefined,
    targetCount: req.body.targetCount ? Number(req.body.targetCount) : undefined,
    paymentInfo: req.body.paymentInfo || { allowCash: true },
    items: req.body.items || [],
    orders: req.body.orders || [],
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  roomsStore.set(newRoom.id, newRoom);
  res.json({ success: true, room: newRoom });
});

// Update room settings or menu items
app.put('/api/rooms/:id', (req, res) => {
  const existing = roomsStore.get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: '房間不存在' });
  }

  const updated: GroupOrderRoom = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: Date.now(),
  };

  roomsStore.set(existing.id, updated);
  res.json({ success: true, room: updated });
});

// Toggle Item In-Stock / Out-of-Stock (缺貨開關)
app.post('/api/rooms/:id/toggle-stock', (req, res) => {
  const { itemId, isAvailable } = req.body;
  const room = roomsStore.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: '房間不存在' });
  }

  const item = room.items.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ success: false, error: '找不到該商品品項' });
  }

  item.isAvailable = typeof isAvailable === 'boolean' ? isAvailable : !item.isAvailable;
  room.updatedAt = Date.now();

  res.json({ success: true, room, item });
});

// Submit or edit order in room
app.post('/api/rooms/:id/orders', (req, res) => {
  const room = roomsStore.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: '房間不存在' });
  }

  const orderData: ParticipantOrder = {
    id: req.body.id || `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    participantName: req.body.participantName?.trim() || '神秘團友',
    contact: req.body.contact || '',
    paid: Boolean(req.body.paid),
    createdAt: req.body.createdAt || Date.now(),
    note: req.body.note || '',
    primaryChoice: req.body.primaryChoice,
    backupChoice: req.body.backupChoice || null,
    backupStrategy: req.body.backupStrategy || 'substitute',
  };

  // Check if existing order from same ID or user update
  const existingIndex = room.orders.findIndex(o => o.id === orderData.id);
  if (existingIndex >= 0) {
    room.orders[existingIndex] = orderData;
  } else {
    room.orders.push(orderData);
  }

  room.updatedAt = Date.now();
  res.json({ success: true, room, order: orderData });
});

// Toggle participant payment status (已付款/未付款)
app.post('/api/rooms/:id/toggle-paid', (req, res) => {
  const { orderId } = req.body;
  const room = roomsStore.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: '房間不存在' });
  }

  const order = room.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: '找不到該筆訂單' });
  }

  order.paid = !order.paid;
  room.updatedAt = Date.now();
  res.json({ success: true, room, order });
});

// Delete order
app.delete('/api/rooms/:id/orders/:orderId', (req, res) => {
  const room = roomsStore.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: '房間不存在' });
  }

  room.orders = room.orders.filter(o => o.id !== req.params.orderId);
  room.updatedAt = Date.now();
  res.json({ success: true, room });
});

// -----------------------------------------------------------------------------
// AI ENDPOINT 1: MENU PHOTO / TEXT EXTRACTION (gemini-3.8-flash)
// -----------------------------------------------------------------------------
app.post('/api/menu/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', textPrompt, categoryHint } = req.body;

    const parts: any[] = [];
    if (imageBase64) {
      // Strip base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    const instruction = `
You are an expert menu & group-order parsing assistant for Taiwanese / Asian group ordering.
Analyze the provided menu image and/or text description, and decompose it into structured items with customization option groups.

The user explicitly requested:
- If it's Drinks (飲料): Extract items, default prices, and option groups for Ice Level (正常冰/少冰/微冰/去冰/溫/熱), Sweetness (正常糖/少糖/半糖/微糖/二分糖/無糖), Size (中杯 M / 大杯 L / 瓶裝), and Add-ons/Toppings (e.g. 珍珠/波霸/椰果/仙草/茶凍/布丁 with price deltas like +10 or +15).
- If it's Bento/Food (便當/簡餐): Extract items, prices, and option groups for Rice/Base (標準白飯/半飯/不要飯換菜), Spice/Flavor (不辣/微辣/大辣), Sides/Add-ons (滷蛋 +15/豆腐 +15/湯品 +25).
- If it's Clothing (衣服/團體服): Extract sizes (XS/S/M/L/XL/2XL/3XL), Colors (黑色/白色/海軍藍等), and optional embroidery or customization.
- Other merchandise: Extract appropriate sensible options.

Respond ONLY with a valid JSON object matching this schema:
{
  "storeName": "Store or brand name detected",
  "title": "A descriptive title for the group order",
  "category": "drink" | "bento" | "clothing" | "other",
  "description": "Brief description or recommendation",
  "items": [
    {
      "name": "Item Name (e.g. 波霸奶茶, 炸排骨便當, 重磅短T)",
      "category": "Category name (e.g. 找奶茶, 招牌便當, 連帽T)",
      "defaultPrice": 60,
      "description": "brief note",
      "optionGroups": [
        {
          "name": "Group name (e.g. 冰量, 甜度, 容量尺寸, 加料, 飯量, 辣度, 尺寸, 顏色)",
          "required": true or false,
          "multiple": true or false,
          "options": [
            { "name": "Option name (e.g. 微冰, 無糖, 大杯(L), 珍珠, 白飯, S號)", "priceDelta": 0 }
          ]
        }
      ]
    }
  ]
}
Category hint: ${categoryHint || 'auto-detect'}
Additional user prompt: ${textPrompt || 'Please extract all available items and sensible options'}
`;

    parts.push({ text: instruction });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(rawText);

    // Format into standard MenuItem structure with UUIDs
    const formattedItems: MenuItem[] = (parsedData.items || []).map((item: any, iIdx: number) => ({
      id: `ai-item-${Date.now()}-${iIdx}`,
      name: item.name || `品項 ${iIdx + 1}`,
      category: item.category || '精選推薦',
      defaultPrice: typeof item.defaultPrice === 'number' ? item.defaultPrice : 50,
      description: item.description || '',
      isAvailable: true,
      optionGroups: (item.optionGroups || []).map((grp: any, gIdx: number) => ({
        id: `opt-grp-${iIdx}-${gIdx}`,
        name: grp.name || '客製選項',
        required: Boolean(grp.required),
        multiple: Boolean(grp.multiple),
        options: (grp.options || []).map((opt: any, oIdx: number) => ({
          id: `opt-${iIdx}-${gIdx}-${oIdx}`,
          name: opt.name || '選項',
          priceDelta: typeof opt.priceDelta === 'number' ? opt.priceDelta : 0,
        })),
      })),
    }));

    res.json({
      success: true,
      data: {
        storeName: parsedData.storeName || '精選店家',
        title: parsedData.title || `${parsedData.storeName || '美味'} 團購調查`,
        category: parsedData.category || 'other',
        description: parsedData.description || '歡迎大家踴躍填單！',
        items: formattedItems,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing menu image with Gemini:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI 解析菜單時發生錯誤，請稍後再試或使用手動輸入',
    });
  }
});

// -----------------------------------------------------------------------------
// AI ENDPOINT 2: SEARCH GROUNDING FOR STORE & MENU (gemini-3.8-flash)
// -----------------------------------------------------------------------------
app.post('/api/menu/search-store', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: '請輸入店家名稱或關鍵字' });
    }

    const prompt = `
Search Google for information, menu items, prices, popular recommendations, address, and telephone number for this store or group-buying product: "${query}".

Analyze the store and return a complete JSON object with the real menu items, categories, price, and customizable options.
Format:
{
  "storeName": "Official store name",
  "storePhone": "Store phone number if found",
  "storeAddress": "Store address if found",
  "category": "drink" | "bento" | "clothing" | "other",
  "summary": "Short 1-2 sentence introduction about what this store is known for",
  "items": [
    {
      "name": "Item name",
      "category": "Category name",
      "defaultPrice": 65,
      "description": "brief description",
      "optionGroups": [
        {
          "name": "冰量 / 甜度 / 尺寸 / 加料 / 辣度 / 飯量 / 尺碼 / 顏色",
          "required": true,
          "multiple": false,
          "options": [
            { "name": "Option name", "priceDelta": 0 }
          ]
        }
      ]
    }
  ]
}
Return ONLY valid JSON.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const formattedItems: MenuItem[] = (parsed.items || []).map((item: any, iIdx: number) => ({
      id: `search-item-${Date.now()}-${iIdx}`,
      name: item.name || `品項 ${iIdx + 1}`,
      category: item.category || '熱門品項',
      defaultPrice: typeof item.defaultPrice === 'number' ? item.defaultPrice : 50,
      description: item.description || '',
      isAvailable: true,
      optionGroups: (item.optionGroups || []).map((grp: any, gIdx: number) => ({
        id: `opt-grp-${iIdx}-${gIdx}`,
        name: grp.name || '規格選項',
        required: Boolean(grp.required),
        multiple: Boolean(grp.multiple),
        options: (grp.options || []).map((opt: any, oIdx: number) => ({
          id: `opt-${iIdx}-${gIdx}-${oIdx}`,
          name: opt.name || '選項',
          priceDelta: typeof opt.priceDelta === 'number' ? opt.priceDelta : 0,
        })),
      })),
    }));

    res.json({
      success: true,
      data: {
        storeName: parsed.storeName || query,
        storePhone: parsed.storePhone || '',
        storeAddress: parsed.storeAddress || '',
        category: parsed.category || 'other',
        summary: parsed.summary || '',
        items: formattedItems,
      },
    });
  } catch (error: any) {
    console.error('Error in search grounding store:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// AI ENDPOINT 3: TTS BROADCAST (gemini-3.8-flash-tts)
// -----------------------------------------------------------------------------
app.post('/api/tts/briefing', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: '請提供播報文字' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: '親切熱情、咬字清晰的辦公室團購主揪播報員，帶有愉悅活力的口吻',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ success: false, error: '未能生成語音資料' });
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error generating TTS with gemini-3.8-flash-tts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// AI ENDPOINT 4: NATURAL VOICE ORDER PARSER (gemini-3.8-flash)
// -----------------------------------------------------------------------------
app.post('/api/voice/parse-order', async (req, res) => {
  try {
    const { transcript, items } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, error: '請提供語音逐字稿' });
    }

    const prompt = `
A customer or coworker wants to place an order via voice.
Spoken transcript: "${transcript}"

Available menu items and options:
${JSON.stringify(items, null, 2)}

Parse their primary item choice and backup item choice (備選方案, e.g. "如果沒有就換...", "萬一售完我要...").
Match to available menu items and their option groups (Ice, Sugar, Size, Add-ons, etc.).
Also detect their participant name if mentioned (e.g. "我是小明", "David點的").

Return JSON:
{
  "participantName": "Name if detected, otherwise ''",
  "primaryItemName": "exact item name",
  "primaryOptions": { "optionGroupName": ["SelectedOptionName"] },
  "hasBackup": true or false,
  "backupItemName": "exact backup item name or ''",
  "backupOptions": { "optionGroupName": ["SelectedOptionName"] },
  "backupStrategy": "substitute" | "cancel_if_out_of_stock",
  "note": "any special instructions"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error parsing voice order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// WEBSOCKET BRIDGE FOR GEMINI LIVE API (gemini-3.8-live)
// -----------------------------------------------------------------------------
wss.on('connection', async (clientWs) => {
  console.log('Client connected to Live API WebSocket');
  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          '你是一個貼心的團購點餐小助手，會以親切自然的繁體中文協助同事點餐、確認品項與備選方案。',
      },
      callbacks: {
        onmessage: (message) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && session) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Error handling live client message:', err);
      }
    });

    clientWs.on('close', () => {
      if (session) {
        try {
          session.close();
        } catch (_) {}
      }
    });
  } catch (liveErr) {
    console.error('Error initializing Gemini Live API session:', liveErr);
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({ error: 'Live API connection error' }));
    }
  }
});

// -----------------------------------------------------------------------------
// SERVER SETUP & VITE MIDDLEWARES
// -----------------------------------------------------------------------------
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Group Order server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
