import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sparkles,
  ShoppingBag,
  Mic,
  MicOff,
  Check,
  AlertTriangle,
  User,
  Plus,
  HelpCircle,
  Share2,
  Copy,
  DollarSign,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  GroupOrderRoom,
  MenuItem,
  ParticipantOrder,
  SelectedItemChoice,
  BackupStrategy,
} from '../types.ts';
import { calculateItemTotal, formatSelectedOptions } from '../utils/orderCalculations.ts';

interface OrderRoomViewProps {
  room: GroupOrderRoom;
  onOrderSubmitted: (order: ParticipantOrder) => void;
  onOrderDeleted: (orderId: string) => void;
  onOpenHostView: () => void;
}

export const OrderRoomView: React.FC<OrderRoomViewProps> = ({
  room,
  onOrderSubmitted,
  onOrderDeleted,
  onOpenHostView,
}) => {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Primary selection state
  const [primaryOptions, setPrimaryOptions] = useState<Record<string, string[]>>({});
  const [participantName, setParticipantName] = useState(() => {
    return localStorage.getItem('tuango_user_name') || '';
  });
  const [contact, setContact] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Backup selection state (THE USER'S CORE REQUEST)
  const [enableBackup, setEnableBackup] = useState(true);
  const [backupStrategy, setBackupStrategy] = useState<BackupStrategy>('substitute');
  const [backupItemId, setBackupItemId] = useState<string>('');
  const [backupOptions, setBackupOptions] = useState<Record<string, string[]>>({});
  const [backupNote, setBackupNote] = useState('');

  // Voice ordering state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-init primary options when selecting an item
  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    const initialOpts: Record<string, string[]> = {};
    for (const grp of item.optionGroups) {
      if (grp.required && grp.options.length > 0) {
        // default pick the first required option
        initialOpts[grp.id] = [grp.options[0].name];
      } else {
        initialOpts[grp.id] = [];
      }
    }
    setPrimaryOptions(initialOpts);

    // Auto suggest default backup item (different from primary)
    const otherItems = room.items.filter(i => i.id !== item.id && i.isAvailable);
    if (otherItems.length > 0) {
      const defaultBackup = otherItems[0];
      setBackupItemId(defaultBackup.id);
      const bOpts: Record<string, string[]> = {};
      for (const grp of defaultBackup.optionGroups) {
        if (grp.required && grp.options.length > 0) {
          bOpts[grp.id] = [grp.options[0].name];
        } else {
          bOpts[grp.id] = [];
        }
      }
      setBackupOptions(bOpts);
    } else {
      setBackupItemId('');
      setBackupOptions({});
    }
  };

  // Change backup item dropdown
  const handleBackupItemChange = (newItemId: string) => {
    setBackupItemId(newItemId);
    const item = room.items.find(i => i.id === newItemId);
    if (!item) return;

    const bOpts: Record<string, string[]> = {};
    for (const grp of item.optionGroups) {
      if (grp.required && grp.options.length > 0) {
        bOpts[grp.id] = [grp.options[0].name];
      } else {
        bOpts[grp.id] = [];
      }
    }
    setBackupOptions(bOpts);
  };

  // Option selection helpers
  const handleToggleOption = (
    grpId: string,
    optName: string,
    isMultiple: boolean,
    isBackup: boolean = false
  ) => {
    const currentMap = isBackup ? backupOptions : primaryOptions;
    const currentList = currentMap[grpId] || [];

    let updatedList: string[];
    if (isMultiple) {
      if (currentList.includes(optName)) {
        updatedList = currentList.filter(n => n !== optName);
      } else {
        updatedList = [...currentList, optName];
      }
    } else {
      updatedList = [optName];
    }

    if (isBackup) {
      setBackupOptions({ ...backupOptions, [grpId]: updatedList });
    } else {
      setPrimaryOptions({ ...primaryOptions, [grpId]: updatedList });
    }
  };

  // Compute live subtotal
  const primaryItemTotal = selectedItem
    ? calculateItemTotal(selectedItem, primaryOptions)
    : 0;

  const backupItem = room.items.find(i => i.id === backupItemId);
  const backupItemTotal = backupItem
    ? calculateItemTotal(backupItem, backupOptions)
    : 0;

  // Submit order
  const handleSubmitOrder = () => {
    if (!selectedItem) return;
    if (!participantName.trim()) {
      alert('請輸入您的姓名或暱稱，方便主揪核對訂單與分發！');
      return;
    }

    // Save name to localStorage for next time
    localStorage.setItem('tuango_user_name', participantName.trim());

    // Build primary choice
    const primaryChoice: SelectedItemChoice = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      unitPrice: selectedItem.defaultPrice,
      selectedOptions: primaryOptions,
      totalPrice: primaryItemTotal,
      itemNote: orderNote.trim() || undefined,
    };

    // Build backup choice
    let backupChoice: SelectedItemChoice | null = null;
    if (enableBackup && backupStrategy === 'substitute' && backupItem) {
      backupChoice = {
        itemId: backupItem.id,
        itemName: backupItem.name,
        unitPrice: backupItem.defaultPrice,
        selectedOptions: backupOptions,
        totalPrice: backupItemTotal,
        itemNote: backupNote.trim() || undefined,
      };
    }

    const newOrder: ParticipantOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      participantName: participantName.trim(),
      contact: contact.trim() || undefined,
      paid: false,
      createdAt: Date.now(),
      note: orderNote.trim() || undefined,
      primaryChoice,
      backupChoice,
      backupStrategy: enableBackup ? backupStrategy : 'cancel_if_out_of_stock',
    };

    onOrderSubmitted(newOrder);
    setSelectedItem(null);
    setOrderNote('');
    setBackupNote('');

    setToastMessage(`🎉 成功送出訂單！您點的是【${primaryChoice.itemName}】$${primaryChoice.totalPrice}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Voice ordering assistant using browser SpeechRecognition + Gemini voice parse
  const handleStartVoice = () => {
    setVoiceError(null);
    setVoiceTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('此瀏覽器未原生支援語音辨識，請使用手動輸入語音逐字稿');
      setIsVoiceModalOpen(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setIsVoiceModalOpen(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        handleParseVoice(text);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setVoiceError(e.message);
      setIsVoiceModalOpen(true);
    }
  };

  const handleParseVoice = async (transcript: string) => {
    if (!transcript.trim()) return;
    setVoiceLoading(true);
    setVoiceError(null);

    try {
      const res = await fetch('/api/voice/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          items: room.items,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '語音解析失敗');
      }

      const parsed = data.result;

      if (parsed.participantName && !participantName) {
        setParticipantName(parsed.participantName);
      }

      // Find matching item
      const matchedItem =
        room.items.find(i => i.name.includes(parsed.primaryItemName) || parsed.primaryItemName.includes(i.name)) ||
        room.items[0];

      if (matchedItem) {
        handleSelectItem(matchedItem);

        // Map parsed options
        if (parsed.primaryOptions) {
          const opts: Record<string, string[]> = {};
          for (const grp of matchedItem.optionGroups) {
            const foundVal = parsed.primaryOptions[grp.name];
            if (foundVal) {
              opts[grp.id] = Array.isArray(foundVal) ? foundVal : [foundVal];
            } else if (grp.required && grp.options.length > 0) {
              opts[grp.id] = [grp.options[0].name];
            }
          }
          setPrimaryOptions(opts);
        }

        // Map backup item if parsed
        if (parsed.hasBackup && parsed.backupItemName) {
          const matchedBackup = room.items.find(
            i => i.name.includes(parsed.backupItemName) || parsed.backupItemName.includes(i.name)
          );
          if (matchedBackup) {
            setEnableBackup(true);
            setBackupStrategy('substitute');
            handleBackupItemChange(matchedBackup.id);
          }
        }

        if (parsed.note) {
          setOrderNote(parsed.note);
        }
      }

      setIsVoiceModalOpen(false);
    } catch (err: any) {
      setVoiceError(err.message);
    } finally {
      setVoiceLoading(false);
    }
  };

  // Categories list
  const categories = Array.from(
    new Set(room.items.map(i => i.category || '精選推薦'))
  );

  const filteredItems = room.items.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch =
      !searchFilter ||
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchCat && matchSearch;
  });

  const totalOrderedCount = room.orders.length;
  const targetGoal = room.targetCount || 10;
  const progressPercent = Math.min(100, Math.round((totalOrderedCount / targetGoal) * 100));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 bg-stone-900 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Check className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Room Hero Banner */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/10 mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide">
              {room.category === 'drink'
                ? '🥤 手搖飲料團購'
                : room.category === 'bento'
                ? '🍱 便當團購'
                : room.category === 'clothing'
                ? '👕 團服預購'
                : '🛒 團購調查'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? '已複製連結!' : '分享此團'}
              </button>

              <button
                type="button"
                onClick={onOpenHostView}
                className="px-3 py-1.5 bg-stone-900/40 hover:bg-stone-900/60 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>進入主揪戰情室</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{room.title}</h1>
          <p className="text-amber-100 text-sm mt-1 flex items-center gap-2">
            <span>店家：{room.storeName}</span>
            {room.storePhone && <span>• ☎️ {room.storePhone}</span>}
            <span>• 主揪：{room.organizerName}</span>
          </p>

          {room.description && (
            <p className="text-amber-50 text-xs sm:text-sm mt-3 bg-black/15 p-3 rounded-xl max-w-2xl">
              📢 {room.description}
            </p>
          )}

          {/* Target Progress Bar */}
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <div className="flex justify-between text-xs text-amber-100 font-semibold mb-1.5">
                <span>
                  目前累積：<strong className="text-white text-sm">{totalOrderedCount}</strong> 份
                </span>
                <span>
                  目標門檻：{targetGoal} 份 ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {room.cutoffTime && (
              <div className="flex items-center gap-2 text-xs text-amber-100 bg-white/10 p-2.5 rounded-xl">
                <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  預計截止時間：
                  <strong className="text-white font-bold ml-1">
                    {new Date(room.cutoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Order & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            全部品項 ({room.items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="搜尋餐點/飲品..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 sm:w-44"
          />

          <button
            type="button"
            onClick={handleStartVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>語音快速點餐</span>
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {filteredItems.map(item => {
          const isOutOfStock = !item.isAvailable;
          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                isOutOfStock
                  ? 'border-stone-200 bg-stone-50/80 opacity-60'
                  : 'border-stone-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
              }`}
              onClick={() => {
                if (!isOutOfStock) handleSelectItem(item);
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-stone-900 text-base leading-snug">{item.name}</h3>
                  <span className="font-extrabold text-amber-600 text-base whitespace-nowrap">
                    ${item.defaultPrice}
                  </span>
                </div>

                {item.description && (
                  <p className="text-xs text-stone-500 line-clamp-2 mb-3">{item.description}</p>
                )}

                {/* Option Groups Badges */}
                {item.optionGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.optionGroups.map(grp => (
                      <span
                        key={grp.id}
                        className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[10px] font-medium"
                      >
                        {grp.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                {isOutOfStock ? (
                  <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    已售完 / 缺貨中
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">點擊客製化選項與備選</span>
                )}

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={e => {
                    e.stopPropagation();
                    if (!isOutOfStock) handleSelectItem(item);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    isOutOfStock
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>點選</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders In This Room Section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-12">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-lg">
              已點餐名單 ({room.orders.length} 人)
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {room.orders.length === 0 ? '目前還沒有人點餐，搶頭香吧！' : '大家點的清單'}
          </span>
        </div>

        {room.orders.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-sm">
            點擊上方任一餐點卡片，立即客製並加入團購清單！
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {room.orders.map(ord => {
              const isMine = ord.participantName === participantName;
              return (
                <div key={ord.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-stone-900 text-sm">{ord.participantName}</span>
                      {isMine && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                          我的訂單
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-md ${
                          ord.paid ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {ord.paid ? '已付款' : '未付款'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                      <span>{ord.primaryChoice.itemName}</span>
                      <span className="text-amber-600">${ord.primaryChoice.totalPrice}</span>
                    </div>

                    <div className="text-xs text-stone-500 mt-0.5">
                      {formatSelectedOptions(undefined, ord.primaryChoice.selectedOptions)}
                      {ord.note && <span className="ml-2 text-stone-400">({ord.note})</span>}
                    </div>

                    {/* Backup Choice Info Display */}
                    {ord.backupChoice ? (
                      <div className="text-[11px] text-amber-700 bg-amber-50/80 px-2 py-1 rounded-md mt-1.5 inline-flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>
                          <strong>備選：</strong>
                          {ord.backupChoice.itemName} (
                          {formatSelectedOptions(undefined, ord.backupChoice.selectedOptions)})
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-stone-400 mt-1">若缺貨意向：直接取消</div>
                    )}
                  </div>

                  {isMine && (
                    <button
                      type="button"
                      onClick={() => onOrderDeleted(ord.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      刪除
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ITEM CUSTOMIZATION MODAL (INCLUDING USER'S CORE BACKUP SELECTION FEATURE) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-100 mb-5">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  {selectedItem.category || '商品選項'}
                </span>
                <h2 className="text-xl font-bold text-stone-900">{selectedItem.name}</h2>
                <p className="text-sm font-semibold text-stone-500 mt-0.5">
                  基礎價格：${selectedItem.defaultPrice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step A: Primary Option Groups */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
                客製化第一志願規格
              </h4>

              {selectedItem.optionGroups.map(grp => (
                <div key={grp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-800">
                      {grp.name} {grp.required && <span className="text-red-500">*</span>}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {grp.multiple ? '(可複選)' : '(單選)'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {grp.options.map(opt => {
                      const isSelected = (primaryOptions[grp.id] || []).includes(opt.name);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleOption(grp.id, opt.name, grp.multiple, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-300'
                          }`}
                        >
                          <span>{opt.name}</span>
                          {opt.priceDelta > 0 && (
                            <span className={isSelected ? 'text-amber-100 text-[11px]' : 'text-amber-600 text-[11px]'}>
                              (+${opt.priceDelta})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Step B: 🌟 萬一缺貨時的備選方案 (THE USER'S REQUESTED CORE FEATURE) */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/70 rounded-2xl border border-amber-200 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  <span className="font-bold text-stone-900 text-sm">
                    萬一賣完 / 缺貨時的備選方案
                  </span>
                </div>
                <label className="text-xs text-amber-900 font-medium flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBackup}
                    onChange={e => setEnableBackup(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  啟用備選
                </label>
              </div>

              <p className="text-xs text-stone-600 mb-3">
                揪團最怕愛喝的品項賣完！設定好備選品項，若店家現場售完，主揪可一鍵幫您無縫改點第二志願！
              </p>

              {enableBackup && (
                <div className="space-y-3 pt-2 border-t border-amber-200/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBackupStrategy('substitute')}
                      className={`p-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        backupStrategy === 'substitute'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      替換為第 2 備選品項
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackupStrategy('cancel_if_out_of_stock')}
                      className={`p-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                        backupStrategy === 'cancel_if_out_of_stock'
                          ? 'bg-stone-800 text-white border-stone-800 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      缺貨就直接取消
                    </button>
                  </div>

                  {backupStrategy === 'substitute' && (
                    <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1">
                          選擇備選品項
                        </label>
                        <select
                          value={backupItemId}
                          onChange={e => handleBackupItemChange(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                        >
                          <option value="">-- 請選擇備選商品 --</option>
                          {room.items
                            .filter(i => i.id !== selectedItem.id && i.isAvailable)
                            .map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} (${i.defaultPrice})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Backup item's option groups */}
                      {backupItem && backupItem.optionGroups.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-stone-100">
                          <span className="text-[11px] font-semibold text-stone-500">
                            【{backupItem.name}】的客製選項：
                          </span>
                          {backupItem.optionGroups.map(grp => (
                            <div key={grp.id} className="text-xs">
                              <span className="font-medium text-stone-700 mr-2">{grp.name}:</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {grp.options.map(opt => {
                                  const isSelected = (backupOptions[grp.id] || []).includes(opt.name);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleToggleOption(grp.id, opt.name, grp.multiple, true)}
                                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                      }`}
                                    >
                                      {opt.name}
                                      {opt.priceDelta > 0 && `(+$${opt.priceDelta})`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step C: Participant Name & Note */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  您的姓名 / 暱稱 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={participantName}
                    onChange={e => setParticipantName(e.target.value)}
                    placeholder="例如：小安 (5樓研發)"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  特殊備註 (選填)
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  placeholder="例如：放冰箱 / 不要香菜 / 錢放桌上"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Modal Footer / Price & Submit */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500">本份金額合計</span>
                <div className="text-2xl font-black text-amber-600">${primaryItemTotal}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 text-xs text-stone-600 hover:text-stone-900"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-md transition-all"
                >
                  確認送出點餐
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOICE ORDER MODAL */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(false)}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 text-lg"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Mic className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-stone-900 mb-1">
              {isListening ? '請說出您的點餐內容...' : '語音點餐辨識'}
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
              例如：「我是小明，我要一杯大杯波霸奶茶微糖去冰，如果賣完了就改四季春無糖」
            </p>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left min-h-20 mb-4">
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                辨識結果 / 或直接輸入文字
              </label>
              <textarea
                rows={3}
                value={voiceTranscript}
                onChange={e => setVoiceTranscript(e.target.value)}
                placeholder="正在聆聽中..."
                className="w-full bg-transparent text-sm text-stone-800 focus:outline-none"
              />
            </div>

            {voiceError && <p className="text-xs text-red-500 mb-3">{voiceError}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(false)}
                className="px-4 py-2 text-xs text-stone-500"
              >
                關閉
              </button>

              <button
                type="button"
                disabled={voiceLoading || !voiceTranscript.trim()}
                onClick={() => handleParseVoice(voiceTranscript)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {voiceLoading ? 'AI 解析中...' : '送出 AI 解析'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
