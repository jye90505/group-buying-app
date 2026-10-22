import React, { useState } from 'react';
import {
  UploadCloud,
  Search,
  FileText,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  ArrowRight,
  Clock,
  DollarSign,
  Coffee,
  Utensils,
  Shirt,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { GroupCategory, GroupOrderRoom, MenuItem, OptionGroup, OptionItem } from '../types.ts';
import { PRESET_SAMPLES } from '../utils/sampleMenus.ts';

interface CreateGroupWizardProps {
  onRoomCreated: (room: GroupOrderRoom) => void;
  onNavigateToRoom: (roomId: string, role: 'order' | 'host') => void;
}

export const CreateGroupWizard: React.FC<CreateGroupWizardProps> = ({
  onRoomCreated,
  onNavigateToRoom,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputTab, setInputTab] = useState<'upload' | 'search' | 'text'>('upload');

  // Input states
  const [category, setCategory] = useState<GroupCategory>('drink');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Review states (Step 2)
  const [roomTitle, setRoomTitle] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [description, setDescription] = useState('');
  const [organizerName, setOrganizerName] = useState('團長');
  const [cutoffHours, setCutoffHours] = useState('2');
  const [targetCount, setTargetCount] = useState('10');
  const [linePayId, setLinePayId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [allowCash, setAllowCash] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Published state (Step 3)
  const [publishedRoom, setPublishedRoom] = useState<GroupOrderRoom | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvitation, setCopiedInvitation] = useState(false);

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick preset loader
  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_SAMPLES.find(p => p.id === presetId);
    if (!preset) return;
    setCategory(preset.category);
    setStoreName(preset.storeName);
    setRoomTitle(`🥤 ${preset.storeName} 團購調查`);
    setDescription('歡迎大家點餐，萬一品項售完記得選擇備選方案！');
    setItems(JSON.parse(JSON.stringify(preset.items)));
    setTextInput(preset.sampleText);
    setStep(2);
  };

  // Trigger AI parsing
  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);

    try {
      if (inputTab === 'search') {
        if (!searchQuery.trim()) {
          throw new Error('請輸入想搜尋的店家名稱或商品關鍵字');
        }
        setLoadingMessage('正在透過 Google 搜尋最新店家菜單、價格與營業資訊...');

        const res = await fetch('/api/menu/search-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || '搜尋店家失敗');
        }

        const d = data.data;
        setStoreName(d.storeName || searchQuery);
        setStorePhone(d.storePhone || '');
        setStoreAddress(d.storeAddress || '');
        setCategory(d.category || category);
        setRoomTitle(`🛒 ${d.storeName || searchQuery} 團購調查`);
        setDescription(d.summary || '今日辦公室團購，請大家盡速完成登記！');
        setItems(d.items || []);
        setStep(2);
      } else {
        // Image or text
        setLoadingMessage('AI 正在仔細辨識菜單文字、餐點名稱與客製規格（冰量/甜度/尺寸/加料）...');

        const payload: any = {
          categoryHint: category,
          textPrompt: textInput,
        };

        if (imagePreview) {
          payload.imageBase64 = imagePreview;
          payload.mimeType = imageFile?.type || 'image/jpeg';
        }

        if (!imagePreview && !textInput.trim()) {
          throw new Error('請先上傳菜單照片，或填寫菜單文字描述');
        }

        const res = await fetch('/api/menu/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'AI 辨識菜單失敗');
        }

        const d = data.data;
        setStoreName(d.storeName || '團購店家');
        setCategory(d.category || category);
        setRoomTitle(d.title || `${d.storeName || '精選店家'} 團購點餐`);
        setDescription(d.description || '請在截止時間前填單，萬一賣完請設定備選方案！');
        setItems(d.items || []);
        setStep(2);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '處理時發生錯誤，請檢查輸入或選擇預設範本試試');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Modify items in Step 2
  const handleItemChange = (idx: number, field: keyof MenuItem, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const handleDeleteItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleAddNewItem = () => {
    const newItem: MenuItem = {
      id: `custom-item-${Date.now()}`,
      name: '新商品',
      defaultPrice: 60,
      category: '自訂品項',
      isAvailable: true,
      optionGroups: [
        {
          id: `opt-grp-${Date.now()}-1`,
          name: category === 'drink' ? '甜度' : category === 'clothing' ? '尺寸' : '口味',
          required: true,
          multiple: false,
          options:
            category === 'drink'
              ? [
                  { id: '1', name: '半糖', priceDelta: 0 },
                  { id: '2', name: '微糖', priceDelta: 0 },
                  { id: '3', name: '無糖', priceDelta: 0 },
                ]
              : [
                  { id: '1', name: '標準', priceDelta: 0 },
                  { id: '2', name: '加量', priceDelta: 10 },
                ],
        },
      ],
    };
    setItems([...items, newItem]);
    setExpandedItemId(newItem.id);
  };

  // Option Group editing
  const handleAddOptionGroup = (itemIdx: number) => {
    const updated = [...items];
    const newGrp: OptionGroup = {
      id: `opt-grp-${Date.now()}`,
      name: '自訂選項組',
      required: false,
      multiple: false,
      options: [
        { id: 'opt-1', name: '選項A', priceDelta: 0 },
        { id: 'opt-2', name: '選項B', priceDelta: 0 },
      ],
    };
    updated[itemIdx].optionGroups.push(newGrp);
    setItems(updated);
  };

  const handleAddOptionItem = (itemIdx: number, grpIdx: number) => {
    const updated = [...items];
    const newOpt: OptionItem = {
      id: `opt-${Date.now()}`,
      name: '新選項',
      priceDelta: 0,
    };
    updated[itemIdx].optionGroups[grpIdx].options.push(newOpt);
    setItems(updated);
  };

  // Step 2 -> Step 3: Final publish
  const handleConfirmAndPublish = async () => {
    if (items.length === 0) {
      setError('請至少保留一個商品品項');
      return;
    }

    const cutoffDate = new Date(Date.now() + parseFloat(cutoffHours || '2') * 3600000);

    const roomData: GroupOrderRoom = {
      id: `room-${Date.now().toString(36)}`,
      title: roomTitle.trim() || `${storeName} 團購`,
      storeName: storeName.trim() || '團購店家',
      storePhone: storePhone.trim() || undefined,
      storeAddress: storeAddress.trim() || undefined,
      category,
      description: description.trim() || '請大家在截止時間前完成點餐！',
      organizerName: organizerName.trim() || '團長',
      cutoffTime: cutoffDate.toISOString(),
      targetCount: targetCount ? parseInt(targetCount, 10) : undefined,
      paymentInfo: {
        linePayId: linePayId.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        allowCash,
        paymentNote: linePayId || bankAccount ? '請於點餐後盡速完成付款' : undefined,
      },
      items,
      orders: [],
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      setLoading(true);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '發布失敗');
      }

      onRoomCreated(data.room);
      setPublishedRoom(data.room);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roomShareUrl = publishedRoom
    ? `${window.location.origin}${window.location.pathname}?room=${publishedRoom.id}`
    : '';

  const invitationMessage = publishedRoom
    ? `📢 大家來點餐囉！【${publishedRoom.title}】
📍 店家：${publishedRoom.storeName}
⏰ 預計截止：${new Date(publishedRoom.cutoffTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
👉 專屬點餐連結：${roomShareUrl}
💡 貼心提醒：系統支援「萬一售完時的第2備選方案」，不怕想喝的品項賣完喔！`
    : '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-stone-200 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 transition-all duration-300 z-0"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step >= 1 ? 'bg-amber-500 text-white shadow-md' : 'bg-stone-200 text-stone-500'
              }`}
            >
              1
            </div>
            <span className="text-xs font-semibold text-stone-700 mt-2">上傳/解析菜單</span>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step >= 2 ? 'bg-amber-500 text-white shadow-md' : 'bg-stone-200 text-stone-500'
              }`}
            >
              2
            </div>
            <span className="text-xs font-semibold text-stone-700 mt-2">確認與微調品項</span>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step >= 3 ? 'bg-amber-500 text-white shadow-md' : 'bg-stone-200 text-stone-500'
              }`}
            >
              3
            </div>
            <span className="text-xs font-semibold text-stone-700 mt-2">發布專屬網址</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">提示訊息</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD & SOURCE */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              發起新團購：AI 智慧菜單解析
            </h1>
            <p className="text-stone-600 text-sm mt-1">
              只需上傳一張菜單照片或輸入店家名稱，AI 會自動將商品分解為尺寸、冰塊、甜度、配料等選項！
            </p>
          </div>

          {/* Quick Preset Samples */}
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                ⚡ 免上傳！點擊直接帶入經典範例
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleLoadPreset(sample.id)}
                  className="p-3 bg-white hover:bg-amber-100/60 border border-amber-200/80 rounded-lg text-left transition-all hover:scale-[1.02] flex items-center gap-2.5 shadow-xs"
                >
                  <span className="text-2xl">{sample.icon}</span>
                  <div>
                    <div className="font-semibold text-stone-800 text-sm">{sample.name}</div>
                    <div className="text-[11px] text-stone-500 line-clamp-1">{sample.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Picker */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              團購類型
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'drink', label: '手搖飲料', icon: Coffee, desc: '冰塊、甜度、加料' },
                { id: 'bento', label: '便當正餐', icon: Utensils, desc: '口味、飯量、辣度' },
                { id: 'clothing', label: '衣服週邊', icon: Shirt, desc: '尺碼、顏色、款式' },
                { id: 'other', label: '綜合/其他', icon: Layers, desc: '自訂客製選項' },
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as GroupCategory)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-stone-500'}`} />
                      <span className="font-bold text-sm">{cat.label}</span>
                    </div>
                    <span className="text-[11px] text-stone-500">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-stone-200">
              <button
                type="button"
                onClick={() => setInputTab('upload')}
                className={`flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  inputTab === 'upload'
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                上傳菜單圖片 (照片/傳單)
              </button>
              <button
                type="button"
                onClick={() => setInputTab('search')}
                className={`flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  inputTab === 'search'
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <Search className="w-4 h-4" />
                Google 搜尋真實店家
              </button>
              <button
                type="button"
                onClick={() => setInputTab('text')}
                className={`flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
                  inputTab === 'text'
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                文字貼上 / 手動輸入
              </button>
            </div>

            <div className="pt-4">
              {inputTab === 'upload' && (
                <div>
                  <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-amber-50/20 relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="上傳菜單照片"
                    />
                    {imagePreview ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={imagePreview}
                          alt="菜單預覽"
                          className="max-h-56 rounded-lg object-contain shadow-md mb-3"
                        />
                        <p className="text-xs text-stone-600 font-medium">已選取圖片，點擊可重新選擇</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-stone-800 text-sm">
                          點擊或拖曳菜單照片到此處
                        </p>
                        <p className="text-xs text-stone-500 mt-1">支援 JPG, PNG, WEBP 手機拍照截圖</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      補充說明或指定要求 (選填)
                    </label>
                    <input
                      type="text"
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      placeholder="例如：請幫我加上大杯加10元、珍珠加10元的選項..."
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {inputTab === 'search' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">
                    使用 Google 搜尋即時查找知名店家（如：麻古茶坊、五桐號、池上木片便當、UQ團服），自動帶出菜單與價格。
                  </p>
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="輸入店家名稱，例如：迷客夏 大安店、八方雲集、梁社漢..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {inputTab === 'text' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">
                    直接複製貼上店家文字菜單、LINE訊息或簡單條列品項，AI 會自動結構化為點餐規格：
                  </p>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder={`例如：
波霸奶茶 55 (中杯45)
四季春茶 35
紅茶拿鐵 65
甜度：無糖、微糖、半糖、正常
冰塊：去冰、微冰、少冰
加料：珍珠+10、布丁+15`}
                    className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              解析後您可以在下一步自由增刪修改品項與價格
            </span>

            <button
              type="button"
              disabled={loading}
              onClick={handleAnalyze}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-sm rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI 解析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>開始 AI 智慧解析</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {loading && loadingMessage && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-xs text-amber-800 font-medium animate-pulse">{loadingMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW & CUSTOMIZE BEFORE PUBLISHING */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Header Info Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  菜單確認與團購設定
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  請確認 AI 解析出的品項與客製選項，您可以在此自由微調價格或補充設定！
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                返回重新解析
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  團購活動名稱
                </label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={e => setRoomTitle(e.target.value)}
                  placeholder="例如：週五下午茶 50嵐揪團"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  店家/品牌名稱
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="例如：50嵐 (大安旗艦店)"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  主揪稱呼 (您)
                </label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={e => setOrganizerName(e.target.value)}
                  placeholder="例如：團長小安"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  截止時間 (倒數計時)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={cutoffHours}
                    onChange={e => setCutoffHours(e.target.value)}
                    className="w-24 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-sm text-stone-600">小時後截止</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  團購公告與備註
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="例如：慶祝專案上線！滿 15 杯免運，若第一志願賣完會依備選方案替換喔！"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  LINE Pay 帳號 (選填)
                </label>
                <input
                  type="text"
                  value={linePayId}
                  onChange={e => setLinePayId(e.target.value)}
                  placeholder="例如：annie_pay_88"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  銀行轉帳帳號 (選填)
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  placeholder="例如：國泰世華 (013) 12345678"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Items & Options Editor */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-stone-900 text-lg">商品品項與選項清單 ({items.length} 項)</h3>
                <p className="text-xs text-stone-500">
                  每項商品皆已配置對應的客製規格（如冰糖、尺寸、配料等），點擊展開可修改
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition-colors border border-amber-200"
              >
                <Plus className="w-3.5 h-3.5" />
                新增商品
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, itemIdx) => {
                const isExpanded = expandedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-stone-200 rounded-xl overflow-hidden transition-all bg-white"
                  >
                    {/* Item Row Header */}
                    <div className="p-3.5 flex items-center justify-between gap-3 bg-stone-50/70">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {itemIdx + 1}
                        </span>

                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleItemChange(itemIdx, 'name', e.target.value)}
                          className="font-bold text-sm text-stone-800 bg-white border border-stone-200 px-2.5 py-1 rounded-md flex-1 max-w-xs focus:ring-1 focus:ring-amber-500"
                          placeholder="品項名稱"
                        />

                        <div className="flex items-center gap-1 text-xs text-stone-600">
                          <span>$</span>
                          <input
                            type="number"
                            value={item.defaultPrice}
                            onChange={e =>
                              handleItemChange(itemIdx, 'defaultPrice', parseInt(e.target.value || '0', 10))
                            }
                            className="w-16 font-semibold bg-white border border-stone-200 px-2 py-1 rounded-md text-stone-900"
                          />
                        </div>

                        <span className="text-xs text-stone-400 hidden sm:inline">
                          ({item.optionGroups.length} 組客製選項)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 bg-white border border-stone-200 rounded-md"
                        >
                          {isExpanded ? (
                            <>
                              <span>收合選項</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>編輯規格選項</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(itemIdx)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
                          aria-label={`刪除品項 ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Option Groups Editor */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-stone-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                            客製化規格選項組（提供給填單人勾選）
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOptionGroup(itemIdx)}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            新增選項組 (如: 冰塊/甜度/配料)
                          </button>
                        </div>

                        <div className="space-y-3">
                          {item.optionGroups.map((grp, grpIdx) => (
                            <div key={grp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={grp.name}
                                    onChange={e => {
                                      const updated = [...items];
                                      updated[itemIdx].optionGroups[grpIdx].name = e.target.value;
                                      setItems(updated);
                                    }}
                                    className="font-semibold text-xs text-stone-800 bg-white border border-stone-200 px-2 py-1 rounded-md w-32"
                                    placeholder="選項組名稱"
                                  />
                                  <label className="text-[11px] text-stone-500 flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={grp.required}
                                      onChange={e => {
                                        const updated = [...items];
                                        updated[itemIdx].optionGroups[grpIdx].required = e.target.checked;
                                        setItems(updated);
                                      }}
                                    />
                                    必選
                                  </label>
                                  <label className="text-[11px] text-stone-500 flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={grp.multiple}
                                      onChange={e => {
                                        const updated = [...items];
                                        updated[itemIdx].optionGroups[grpIdx].multiple = e.target.checked;
                                        setItems(updated);
                                      }}
                                    />
                                    可多選 (如加料)
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    updated[itemIdx].optionGroups.splice(grpIdx, 1);
                                    setItems(updated);
                                  }}
                                  className="text-[11px] text-stone-400 hover:text-red-500"
                                >
                                  刪除組
                                </button>
                              </div>

                              {/* Option Chips */}
                              <div className="flex flex-wrap gap-2 items-center">
                                {grp.options.map((opt, optIdx) => (
                                  <div
                                    key={opt.id}
                                    className="flex items-center gap-1 bg-white border border-stone-200 px-2 py-1 rounded-md text-xs shadow-2xs"
                                  >
                                    <input
                                      type="text"
                                      value={opt.name}
                                      onChange={e => {
                                        const updated = [...items];
                                        updated[itemIdx].optionGroups[grpIdx].options[optIdx].name = e.target.value;
                                        setItems(updated);
                                      }}
                                      className="w-20 font-medium text-stone-700 bg-transparent focus:outline-none"
                                    />
                                    <span className="text-stone-300">|</span>
                                    <span className="text-stone-400">+$</span>
                                    <input
                                      type="number"
                                      value={opt.priceDelta}
                                      onChange={e => {
                                        const updated = [...items];
                                        updated[itemIdx].optionGroups[grpIdx].options[optIdx].priceDelta =
                                          parseInt(e.target.value || '0', 10);
                                        setItems(updated);
                                      }}
                                      className="w-10 text-stone-800 bg-transparent focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...items];
                                        updated[itemIdx].optionGroups[grpIdx].options.splice(optIdx, 1);
                                        setItems(updated);
                                      }}
                                      className="text-stone-400 hover:text-red-500 ml-1"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => handleAddOptionItem(itemIdx, grpIdx)}
                                  className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-100/60 rounded-md border border-dashed border-amber-300"
                                >
                                  + 加選項
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirmation & Publish Button */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900"
            >
              ← 返回上一步
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmAndPublish}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              <span>確認無誤，立即發布專屬點餐網址</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PUBLISHED & SHAREABLE LINK */}
      {step === 3 && publishedRoom && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-stone-900">團購已成功發布！🎉</h2>
          <p className="text-stone-600 text-sm mt-1 max-w-md mx-auto">
            專屬點餐連結已建立完成，複製下方連結或邀請訊息分享給朋友或同事群組即可開始點餐！
          </p>

          {/* Share Link Box */}
          <div className="mt-8 max-w-lg mx-auto bg-stone-50 border border-stone-200 rounded-xl p-4 text-left">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              專屬點餐連結 (Shareable URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={roomShareUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg text-stone-800"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(roomShareUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLink ? '已複製!' : '複製'}
              </button>
            </div>
          </div>

          {/* LINE / Slack Message Invitation */}
          <div className="mt-4 max-w-lg mx-auto bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-900">LINE / Slack 點餐邀請訊息</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(invitationMessage);
                  setCopiedInvitation(true);
                  setTimeout(() => setCopiedInvitation(false), 2000);
                }}
                className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedInvitation ? '已複製訊息!' : '一鍵複製邀請範本'}
              </button>
            </div>
            <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-amber-100">
              {invitationMessage}
            </pre>
          </div>

          {/* Next Steps Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateToRoom(publishedRoom.id, 'order')}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Coffee className="w-4 h-4" />
              前往點餐頁面 (自己也點一杯)
            </button>

            <button
              type="button"
              onClick={() => onNavigateToRoom(publishedRoom.id, 'host')}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              進入主揪即時戰情室 (查看統計/缺貨替換)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
