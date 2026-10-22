import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  DollarSign,
  Users,
  Check,
  RefreshCw,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { GroupOrderRoom } from '../types.ts';
import {
  aggregateOrderStats,
  generateLineSummary,
  exportToCsv,
} from '../utils/orderCalculations.ts';

interface HostDashboardProps {
  room: GroupOrderRoom;
  onToggleStock: (itemId: string, isAvailable: boolean) => void;
  onTogglePaid: (orderId: string) => void;
  onRefreshRoom: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  room,
  onToggleStock,
  onTogglePaid,
  onRefreshRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'people' | 'stock'>('items');
  const [copiedLine, setCopiedLine] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stats = aggregateOrderStats(room);

  // Play TTS voice briefing using Gemini 3.8 Flash TTS
  const handlePlayVoiceBriefing = async () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    setTtsLoading(true);
    try {
      const topItemsText = stats.itemSummaries
        .slice(0, 3)
        .map(i => `${i.itemName} ${i.totalCount} 份`)
        .join('、');

      const text = `團長廣播時間！本次 ${room.title || room.storeName} 團購目前共有 ${stats.totalParticipants} 人登記，累積 ${stats.totalItems} 份餐點，總金額 ${stats.totalAmount} 元。其中已收到 ${stats.paidCount} 人的款項，還有 ${stats.unpaidCount} 人未付款。熱門品項包括 ${topItemsText || '各項精選餐點'}。${stats.backupAlerts.length > 0 ? `提醒您，目前有 ${stats.backupAlerts.length} 筆訂單因品項售完已自動切換至備選方案。` : ''} 謝謝大家！`;

      const res = await fetch('/api/tts/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: 'Kore',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '語音播報生成失敗');
      }

      const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
      if (audioRef.current) {
        audioRef.current.src = audioSrc;
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    } catch (err: any) {
      console.error('TTS error:', err);
      alert('語音播報生成失敗：' + err.message);
    } finally {
      setTtsLoading(false);
    }
  };

  // Copy LINE / Slack formatted order text
  const handleCopyLineSummary = () => {
    const text = generateLineSummary(room);
    navigator.clipboard.writeText(text);
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2500);
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const csvContent = exportToCsv(room);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${room.title || room.storeName}_團購訂單_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hidden audio element for TTS */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlayingAudio(false)}
        onError={() => setIsPlayingAudio(false)}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md text-xs font-bold">
                主揪專用戰情室
              </span>
              <span className="text-stone-400 text-xs">即時統計與缺貨自動替換</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{room.title}</h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
              店家：{room.storeName} {room.storePhone && `• 電話：${room.storePhone}`}
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshRoom}
              className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors"
              title="重新整理訂單資料"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* TTS Broadcast Button (Gemini 3.8 Flash TTS) */}
            <button
              type="button"
              disabled={ttsLoading}
              onClick={handlePlayVoiceBriefing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                isPlayingAudio
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }`}
            >
              {ttsLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>生成廣播中...</span>
                </>
              ) : isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>停止廣播</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>🔊 AI 語音播報現況</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-800">
          <div className="bg-stone-800/80 p-3.5 rounded-xl">
            <span className="text-stone-400 text-xs font-semibold">總份數 / 杯數</span>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalItems} <span className="text-xs font-normal text-stone-400">份</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              共 {stats.totalParticipants} 人填單
            </div>
          </div>

          <div className="bg-stone-800/80 p-3.5 rounded-xl">
            <span className="text-stone-400 text-xs font-semibold">應收總金額</span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              ${stats.totalAmount}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              平均約 ${stats.totalParticipants > 0 ? Math.round(stats.totalAmount / stats.totalParticipants) : 0}/人
            </div>
          </div>

          <div className="bg-stone-800/80 p-3.5 rounded-xl">
            <span className="text-stone-400 text-xs font-semibold">已收款進度</span>
            <div className="text-2xl font-black text-green-400 mt-1">
              ${stats.paidAmount}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {stats.paidCount} / {stats.totalParticipants} 人已付清
            </div>
          </div>

          <div className="bg-stone-800/80 p-3.5 rounded-xl">
            <span className="text-stone-400 text-xs font-semibold">未收差額</span>
            <div className="text-2xl font-black text-orange-400 mt-1">
              ${stats.unpaidAmount}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              尚有 {stats.unpaidCount} 人待收取
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ BACKUP & OUT-OF-STOCK ALERT BANNER (CRITICAL USER REQUIREMENT) */}
      {stats.backupAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900 text-sm">
              缺貨與備選方案執行紀錄 ({stats.backupAlerts.length} 筆已自動轉換)
            </h3>
          </div>
          <div className="space-y-2">
            {stats.backupAlerts.map(alert => (
              <div
                key={alert.orderId}
                className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <strong className="text-stone-900 text-sm">{alert.participantName}</strong>
                  <span className="text-stone-500 ml-2">
                    原點購【{alert.primaryItemName}】缺貨
                  </span>
                  {alert.statusLabel === 'substituted' && (
                    <span className="text-green-700 font-semibold ml-2">
                      ➔ 自動替換備選【{alert.backupItemName}】
                      {alert.priceDifference !== 0 && ` (差額 ${alert.priceDifference > 0 ? '+' : ''}$${alert.priceDifference})`}
                    </span>
                  )}
                  {alert.statusLabel === 'cancelled' && (
                    <span className="text-stone-500 italic ml-2">
                      ➔ 依團友備選設定【直接取消】
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                  {alert.statusLabel === 'substituted' ? '已套用備選方案' : '已取消份數'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar (Export LINE / CSV) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'items'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            依品項規格統整 (點餐用)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'people'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            依訂購人名單 (收錢用)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stock'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            ⚠️ 品項缺貨開關 ({stats.outOfStockItemIds.length} 項缺貨)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLineSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLine ? '已複製格式!' : '複製 LINE / Slack 點餐格式'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors border border-stone-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出 Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GROUPED BY ITEMS (CALL THE STORE) */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                店家電話點餐清單 ({stats.itemSummaries.length} 個品項)
              </h3>
              <p className="text-xs text-stone-500">
                已自動將相同品項與相同客製規格彙整，直接報給店家最省時！
              </p>
            </div>
            {room.storePhone && (
              <a
                href={`tel:${room.storePhone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200"
              >
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                撥打店家電話：{room.storePhone}
              </a>
            )}
          </div>

          {stats.itemSummaries.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-sm">
              目前尚未有成立的訂單
            </div>
          ) : (
            <div className="space-y-4">
              {stats.itemSummaries.map((item, idx) => (
                <div key={item.itemId} className="border border-stone-200 rounded-xl p-4 bg-stone-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-stone-900 text-base">{item.itemName}</h4>
                      <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                        共 {item.totalCount} 份
                      </span>
                    </div>
                    <span className="font-extrabold text-stone-800 text-sm">
                      小計 ${item.totalAmount}
                    </span>
                  </div>

                  <div className="divide-y divide-stone-100 bg-white rounded-lg border border-stone-200/60 overflow-hidden">
                    {item.variants.map((v, vIdx) => (
                      <div key={v.optionsKey} className="p-3 text-xs flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-stone-800 flex items-center gap-2">
                            <span>▸ {v.optionsDescription}</span>
                            <span className="text-amber-600 font-extrabold">x {v.count} 份</span>
                            <span className="text-stone-400">(${v.unitPrice}/份)</span>
                          </div>
                          <div className="text-stone-500 mt-1">
                            訂購人：
                            {v.participants.map(p => (
                              <span
                                key={p.name}
                                className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[11px] ${
                                  p.isBackup
                                    ? 'bg-amber-100 text-amber-900 font-semibold'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {p.name}
                                {p.isBackup && ' (備選替換)'}
                                {p.note && ` (${p.note})`}
                              </span>
                            ))}
                          </div>
                        </div>

                        <span className="font-bold text-stone-700">${v.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUPED BY PARTICIPANTS (COLLECT MONEY) */}
      {activeTab === 'people' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">
                團友訂單與收款清單 ({room.orders.length} 人)
              </h3>
              <p className="text-xs text-stone-500">
                點擊付款狀態標籤可直接切換「已付款 / 未付款」，即時統計收款進度
              </p>
            </div>
            {room.paymentInfo.linePayId && (
              <span className="text-xs bg-green-50 text-green-800 font-semibold px-2.5 py-1 rounded-md border border-green-200">
                LINE Pay: {room.paymentInfo.linePayId}
              </span>
            )}
          </div>

          {room.orders.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-sm">尚未有人填單</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="py-2.5 px-3">訂購人</th>
                    <th className="py-2.5 px-3">點購品項與客製規格</th>
                    <th className="py-2.5 px-3">備選方案狀態</th>
                    <th className="py-2.5 px-3 text-right">金額</th>
                    <th className="py-2.5 px-3 text-center">收款狀態 (點擊切換)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {room.orders.map(order => {
                    const unavailable = new Set(stats.outOfStockItemIds);
                    const isPrimaryUnavailable = unavailable.has(order.primaryChoice.itemId);
                    const isUsingBackup =
                      isPrimaryUnavailable &&
                      order.backupStrategy === 'substitute' &&
                      order.backupChoice;
                    const isCancelled =
                      isPrimaryUnavailable &&
                      (order.backupStrategy === 'cancel_if_out_of_stock' || !order.backupChoice);

                    const activePrice = isCancelled
                      ? 0
                      : isUsingBackup
                      ? order.backupChoice!.totalPrice
                      : order.primaryChoice.totalPrice;

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-stone-900">
                          {order.participantName}
                          {order.note && (
                            <div className="text-[10px] text-stone-400 font-normal">
                              備註: {order.note}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className={isCancelled ? 'line-through text-stone-400' : 'font-semibold text-stone-800'}>
                            {order.primaryChoice.itemName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {formatSelectedOptions(undefined, order.primaryChoice.selectedOptions)}
                          </div>
                          {isUsingBackup && (
                            <div className="text-[11px] text-amber-700 font-semibold mt-1">
                              ➔ 已改為備選：{order.backupChoice!.itemName} (
                              {formatSelectedOptions(undefined, order.backupChoice!.selectedOptions)})
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {isUsingBackup ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                              已自動套用備選
                            </span>
                          ) : isCancelled ? (
                            <span className="px-2 py-0.5 bg-stone-200 text-stone-600 rounded font-bold text-[10px]">
                              缺貨已取消
                            </span>
                          ) : order.backupChoice ? (
                            <span className="text-[10px] text-stone-500">
                              備選：{order.backupChoice.itemName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400">無備選 (直接取消)</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-black text-sm text-stone-900">
                          ${activePrice}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onTogglePaid(order.id)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs ${
                              order.paid
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                            }`}
                          >
                            {order.paid ? '✓ 已付款' : '未付款'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OUT-OF-STOCK & BACKUP SWITCHER */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-8">
          <div className="pb-4 border-b border-stone-100 mb-4">
            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              店家品項缺貨開關 (即時連動備選方案)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              打電話給店家時，若店家告知「波霸沒有了」或「排骨賣完了」，請直接將該品項切換為「⚠️ 標記缺貨」，系統會立即自動把所有選了該品項的人轉換成他們的備選方案，並自動重新計算總杯數與金額！
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.items.map(item => {
              const isAvailable = item.isAvailable;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isAvailable
                      ? 'border-stone-200 bg-white'
                      : 'border-red-200 bg-red-50/60'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{item.name}</h4>
                    <span className="text-xs text-stone-500">${item.defaultPrice}</span>
                    <span className="text-stone-300 mx-1">•</span>
                    <span className="text-[11px] text-stone-400">{item.category || '精選'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStock(item.id, !isAvailable)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                      isAvailable
                        ? 'bg-stone-100 hover:bg-red-100 text-stone-700 hover:text-red-700 border border-stone-200'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span>供貨正常 (點擊標記缺貨)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                        <span>已標記缺貨 (點擊恢復)</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
