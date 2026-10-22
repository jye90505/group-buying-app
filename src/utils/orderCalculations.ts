import { GroupOrderRoom, MenuItem, ParticipantOrder, SelectedItemChoice } from '../types.ts';

/**
 * Calculate the total price of an item given its base price and selected options.
 */
export function calculateItemTotal(
  item: MenuItem,
  selectedOptions: Record<string, string[]>
): number {
  let total = item.defaultPrice;

  for (const group of item.optionGroups) {
    const selectedNames = selectedOptions[group.id] || [];
    for (const opt of group.options) {
      if (selectedNames.includes(opt.name)) {
        total += opt.priceDelta;
      }
    }
  }

  return Math.max(0, total);
}

/**
 * Formats options into a friendly string representation, e.g. "微糖 / 微冰 / 加波霸(+10)"
 */
export function formatSelectedOptions(
  item: MenuItem | undefined,
  selectedOptions: Record<string, string[]>
): string {
  if (!item) {
    return Object.values(selectedOptions).flat().join(', ');
  }

  const parts: string[] = [];
  for (const group of item.optionGroups) {
    const selectedNames = selectedOptions[group.id];
    if (selectedNames && selectedNames.length > 0) {
      const optionDetails = selectedNames.map(name => {
        const found = group.options.find(o => o.name === name);
        if (found && found.priceDelta > 0) {
          return `${name}(+$${found.priceDelta})`;
        }
        return name;
      });
      parts.push(optionDetails.join('+'));
    }
  }

  return parts.length > 0 ? parts.join(' / ') : '標準規格';
}

export interface EffectiveOrderResult {
  effectiveChoice: SelectedItemChoice | null;
  isUsingBackup: boolean;
  isCancelled: boolean;
  statusLabel: 'normal' | 'substituted' | 'cancelled' | 'needs_contact';
  reason?: string;
}

/**
 * Determine which item choice is actually active for a participant order,
 * considering whether items are currently in stock or marked unavailable.
 */
export function resolveEffectiveChoice(
  order: ParticipantOrder,
  unavailableItemIds: Set<string>
): EffectiveOrderResult {
  const primaryId = order.primaryChoice.itemId;

  // If primary item is available, use primary
  if (!unavailableItemIds.has(primaryId)) {
    return {
      effectiveChoice: order.primaryChoice,
      isUsingBackup: false,
      isCancelled: false,
      statusLabel: 'normal',
    };
  }

  // Primary item is out of stock!
  if (order.backupStrategy === 'cancel_if_out_of_stock' || !order.backupChoice) {
    return {
      effectiveChoice: null,
      isUsingBackup: false,
      isCancelled: true,
      statusLabel: 'cancelled',
      reason: `原點購【${order.primaryChoice.itemName}】缺貨，選擇直接取消`,
    };
  }

  // Check if backup choice is available
  const backupId = order.backupChoice.itemId;
  if (unavailableItemIds.has(backupId)) {
    return {
      effectiveChoice: null,
      isUsingBackup: false,
      isCancelled: true,
      statusLabel: 'cancelled',
      reason: `原品項【${order.primaryChoice.itemName}】與備選【${order.backupChoice.itemName}】皆已售完`,
    };
  }

  // Backup choice is available!
  return {
    effectiveChoice: order.backupChoice,
    isUsingBackup: true,
    isCancelled: false,
    statusLabel: 'substituted',
    reason: `原點購【${order.primaryChoice.itemName}】缺貨，已自動替換為備選【${order.backupChoice.itemName}】`,
  };
}

export interface AggregatedVariant {
  optionsKey: string;
  optionsDescription: string;
  unitPrice: number;
  count: number;
  subtotal: number;
  participants: Array<{ name: string; isBackup: boolean; note?: string }>;
}

export interface AggregatedItemSummary {
  itemId: string;
  itemName: string;
  totalCount: number;
  totalAmount: number;
  variants: AggregatedVariant[];
}

export interface BackupAlert {
  orderId: string;
  participantName: string;
  primaryItemName: string;
  backupItemName?: string;
  strategy: string;
  statusLabel: 'substituted' | 'cancelled' | 'needs_contact';
  priceDifference: number; // backupPrice - primaryPrice
  resolvedDescription: string;
}

export interface OrderStats {
  totalItems: number;
  totalAmount: number;
  totalParticipants: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  itemSummaries: AggregatedItemSummary[];
  backupAlerts: BackupAlert[];
  outOfStockItemIds: string[];
}

/**
 * Aggregates all orders for a room with detailed statistics, variants, and backup alerts.
 */
export function aggregateOrderStats(room: GroupOrderRoom): OrderStats {
  const unavailableItemIds = new Set(
    room.items.filter(item => !item.isAvailable).map(item => item.id)
  );

  const itemMap = new Map<string, MenuItem>();
  for (const item of room.items) {
    itemMap.set(item.id, item);
  }

  let totalItems = 0;
  let totalAmount = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  const itemSummaryMap = new Map<string, AggregatedItemSummary>();
  const backupAlerts: BackupAlert[] = [];

  for (const order of room.orders) {
    const resolution = resolveEffectiveChoice(order, unavailableItemIds);

    // Track backup alerts if primary was affected
    if (unavailableItemIds.has(order.primaryChoice.itemId)) {
      const primaryPrice = order.primaryChoice.totalPrice;
      const backupPrice = resolution.effectiveChoice?.totalPrice ?? 0;
      backupAlerts.push({
        orderId: order.id,
        participantName: order.participantName,
        primaryItemName: order.primaryChoice.itemName,
        backupItemName: order.backupChoice?.itemName,
        strategy: order.backupStrategy,
        statusLabel: resolution.statusLabel,
        priceDifference: backupPrice - primaryPrice,
        resolvedDescription: resolution.reason || '',
      });
    }

    if (resolution.isCancelled || !resolution.effectiveChoice) {
      // Cancelled orders don't contribute to total items or price
      continue;
    }

    const choice = resolution.effectiveChoice;
    totalItems += 1;
    totalAmount += choice.totalPrice;

    if (order.paid) {
      paidAmount += choice.totalPrice;
      paidCount += 1;
    } else {
      unpaidAmount += choice.totalPrice;
      unpaidCount += 1;
    }

    // Aggregate into item summary
    let summary = itemSummaryMap.get(choice.itemId);
    if (!summary) {
      summary = {
        itemId: choice.itemId,
        itemName: choice.itemName,
        totalCount: 0,
        totalAmount: 0,
        variants: [],
      };
      itemSummaryMap.set(choice.itemId, summary);
    }

    summary.totalCount += 1;
    summary.totalAmount += choice.totalPrice;

    const menuItem = itemMap.get(choice.itemId);
    const optionsDesc = formatSelectedOptions(menuItem, choice.selectedOptions);
    const optionsKey = `${choice.totalPrice}|${optionsDesc}`;

    let variant = summary.variants.find(v => v.optionsKey === optionsKey);
    if (!variant) {
      variant = {
        optionsKey,
        optionsDescription: optionsDesc,
        unitPrice: choice.totalPrice,
        count: 0,
        subtotal: 0,
        participants: [],
      };
      summary.variants.push(variant);
    }

    variant.count += 1;
    variant.subtotal += choice.totalPrice;
    variant.participants.push({
      name: order.participantName,
      isBackup: resolution.isUsingBackup,
      note: order.note,
    });
  }

  return {
    totalItems,
    totalAmount,
    totalParticipants: room.orders.length,
    paidAmount,
    unpaidAmount,
    paidCount,
    unpaidCount,
    itemSummaries: Array.from(itemSummaryMap.values()),
    backupAlerts,
    outOfStockItemIds: Array.from(unavailableItemIds),
  };
}

/**
 * Generate formatted text for LINE / Slack / Telegram group chats and store call orders.
 */
export function generateLineSummary(room: GroupOrderRoom): string {
  const stats = aggregateOrderStats(room);
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;

  const lines: string[] = [];
  lines.push(`【團購訂單：${room.title || room.storeName}】(${dateStr})`);
  lines.push(`主揪：${room.organizerName || '團長'}`);
  if (room.storePhone) lines.push(`店家電話：${room.storePhone}`);
  lines.push(`總數量：${stats.totalItems} 份 ｜ 總金額：$${stats.totalAmount} 元`);
  lines.push('─────────────────────');

  if (stats.itemSummaries.length === 0) {
    lines.push('（目前尚未有已成立訂單）');
  } else {
    stats.itemSummaries.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.itemName} x ${item.totalCount} (共 $${item.totalAmount})`);
      for (const variant of item.variants) {
        const names = variant.participants
          .map(p => (p.isBackup ? `${p.name}(備選替換)` : p.name))
          .join(', ');
        lines.push(`   ▸ ${variant.optionsDescription} [$${variant.unitPrice}] x ${variant.count}`);
        lines.push(`     訂購人: ${names}`);
      }
    });
  }

  // Backup and out of stock notes
  if (stats.backupAlerts.length > 0) {
    lines.push('─────────────────────');
    lines.push('【⚠️ 缺貨與備選方案執行紀錄】');
    for (const alert of stats.backupAlerts) {
      if (alert.statusLabel === 'substituted') {
        lines.push(`• ${alert.participantName}：${alert.primaryItemName} 缺貨 ➔ 改備選【${alert.backupItemName}】(差額 $${alert.priceDifference})`);
      } else if (alert.statusLabel === 'cancelled') {
        lines.push(`• ${alert.participantName}：${alert.primaryItemName} 缺貨 ➔ 依備選意願直接取消`);
      }
    }
  }

  // Payment note
  lines.push('─────────────────────');
  lines.push(`【收款狀況】已收: $${stats.paidAmount} (${stats.paidCount}人) ｜ 未收: $${stats.unpaidAmount} (${stats.unpaidCount}人)`);
  if (room.paymentInfo.linePayId) {
    lines.push(`LINE Pay ID: ${room.paymentInfo.linePayId}`);
  }
  if (room.paymentInfo.bankAccount) {
    lines.push(`轉帳帳號: ${room.paymentInfo.bankAccount}`);
  }

  return lines.join('\n');
}

/**
 * Generate CSV export content for Excel / Google Sheets
 */
export function exportToCsv(room: GroupOrderRoom): string {
  const unavailableItemIds = new Set(
    room.items.filter(item => !item.isAvailable).map(item => item.id)
  );

  const headers = [
    '訂購人',
    '狀態',
    '品項名稱',
    '客製選項',
    '單價',
    '原點品項',
    '備選品項',
    '備選客製',
    '付款狀態',
    '備註',
  ];

  const rows = room.orders.map(order => {
    const res = resolveEffectiveChoice(order, unavailableItemIds);
    const activeItem = res.effectiveChoice;
    const isSub = res.isUsingBackup ? '已套用備選' : res.isCancelled ? '缺貨取消' : '正常';
    const activeName = activeItem?.itemName || '(無)';
    const activeOptions = activeItem
      ? Object.values(activeItem.selectedOptions).flat().join('/')
      : '';
    const activePrice = activeItem?.totalPrice ?? 0;
    const backupName = order.backupChoice?.itemName || '無備選';
    const backupOptions = order.backupChoice
      ? Object.values(order.backupChoice.selectedOptions).flat().join('/')
      : '';
    const paidStatus = order.paid ? '已付款' : '未付款';
    const note = order.note || '';

    return [
      `"${order.participantName}"`,
      `"${isSub}"`,
      `"${activeName}"`,
      `"${activeOptions}"`,
      activePrice,
      `"${order.primaryChoice.itemName}"`,
      `"${backupName}"`,
      `"${backupOptions}"`,
      `"${paidStatus}"`,
      `"${note}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
