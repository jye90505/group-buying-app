import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemTotal,
  resolveEffectiveChoice,
  aggregateOrderStats,
  generateLineSummary,
} from './orderCalculations.ts';
import { GroupOrderRoom, MenuItem, ParticipantOrder } from '../types.ts';

const mockDrinkItem: MenuItem = {
  id: 'item-1',
  name: '波霸奶茶',
  defaultPrice: 50,
  isAvailable: true,
  optionGroups: [
    {
      id: 'size',
      name: '尺寸',
      required: true,
      multiple: false,
      options: [
        { id: 'm', name: '中杯 (M)', priceDelta: 0 },
        { id: 'l', name: '大杯 (L)', priceDelta: 10 },
      ],
    },
    {
      id: 'topping',
      name: '加料',
      required: false,
      multiple: true,
      options: [
        { id: 'pudding', name: '布丁', priceDelta: 15 },
        { id: 'jelly', name: '椰果', priceDelta: 10 },
      ],
    },
  ],
};

const mockTeaItem: MenuItem = {
  id: 'item-2',
  name: '四季春茶',
  defaultPrice: 35,
  isAvailable: true,
  optionGroups: [],
};

test('calculateItemTotal computes base price plus selected options delta', () => {
  const selectedOptions = {
    size: ['大杯 (L)'], // +10
    topping: ['布丁', '椰果'], // +15 +10
  };
  const price = calculateItemTotal(mockDrinkItem, selectedOptions);
  assert.equal(price, 50 + 10 + 15 + 10); // 85
});

test('resolveEffectiveChoice returns primary when primary is in stock', () => {
  const order: ParticipantOrder = {
    id: 'ord-1',
    participantName: 'Alice',
    paid: false,
    createdAt: Date.now(),
    primaryChoice: {
      itemId: 'item-1',
      itemName: '波霸奶茶',
      unitPrice: 60,
      selectedOptions: {},
      totalPrice: 60,
    },
    backupChoice: {
      itemId: 'item-2',
      itemName: '四季春茶',
      unitPrice: 35,
      selectedOptions: {},
      totalPrice: 35,
    },
    backupStrategy: 'substitute',
  };

  const res = resolveEffectiveChoice(order, new Set());
  assert.equal(res.isUsingBackup, false);
  assert.equal(res.isCancelled, false);
  assert.equal(res.effectiveChoice?.itemId, 'item-1');
});

test('resolveEffectiveChoice seamlessly switches to backupChoice when primary is out of stock', () => {
  const order: ParticipantOrder = {
    id: 'ord-1',
    participantName: 'Alice',
    paid: false,
    createdAt: Date.now(),
    primaryChoice: {
      itemId: 'item-1',
      itemName: '波霸奶茶',
      unitPrice: 60,
      selectedOptions: {},
      totalPrice: 60,
    },
    backupChoice: {
      itemId: 'item-2',
      itemName: '四季春茶',
      unitPrice: 35,
      selectedOptions: {},
      totalPrice: 35,
    },
    backupStrategy: 'substitute',
  };

  const unavailable = new Set(['item-1']); // primary item out of stock
  const res = resolveEffectiveChoice(order, unavailable);
  assert.equal(res.isUsingBackup, true);
  assert.equal(res.isCancelled, false);
  assert.equal(res.statusLabel, 'substituted');
  assert.equal(res.effectiveChoice?.itemId, 'item-2');
  assert.equal(res.effectiveChoice?.totalPrice, 35);
});

test('resolveEffectiveChoice handles cancel_if_out_of_stock strategy', () => {
  const order: ParticipantOrder = {
    id: 'ord-2',
    participantName: 'Bob',
    paid: false,
    createdAt: Date.now(),
    primaryChoice: {
      itemId: 'item-1',
      itemName: '波霸奶茶',
      unitPrice: 60,
      selectedOptions: {},
      totalPrice: 60,
    },
    backupChoice: null,
    backupStrategy: 'cancel_if_out_of_stock',
  };

  const unavailable = new Set(['item-1']);
  const res = resolveEffectiveChoice(order, unavailable);
  assert.equal(res.isCancelled, true);
  assert.equal(res.effectiveChoice, null);
  assert.equal(res.statusLabel, 'cancelled');
});

test('aggregateOrderStats computes items, totals, and backup substitutions', () => {
  const room: GroupOrderRoom = {
    id: 'room-1',
    title: '下午茶團購',
    storeName: '50嵐 台北復興店',
    category: 'drink',
    organizerName: '團長小明',
    paymentInfo: { allowCash: true, linePayId: 'ming123' },
    status: 'open',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    items: [
      { ...mockDrinkItem, isAvailable: false }, // out of stock!
      { ...mockTeaItem, isAvailable: true },
    ],
    orders: [
      {
        id: 'ord-1',
        participantName: '小華',
        paid: true,
        createdAt: Date.now(),
        primaryChoice: {
          itemId: 'item-1',
          itemName: '波霸奶茶',
          unitPrice: 60,
          selectedOptions: { size: ['大杯 (L)'] },
          totalPrice: 60,
        },
        backupChoice: {
          itemId: 'item-2',
          itemName: '四季春茶',
          unitPrice: 35,
          selectedOptions: {},
          totalPrice: 35,
        },
        backupStrategy: 'substitute',
      },
      {
        id: 'ord-2',
        participantName: '小強',
        paid: false,
        createdAt: Date.now(),
        primaryChoice: {
          itemId: 'item-2',
          itemName: '四季春茶',
          unitPrice: 35,
          selectedOptions: {},
          totalPrice: 35,
        },
        backupStrategy: 'cancel_if_out_of_stock',
      },
    ],
  };

  const stats = aggregateOrderStats(room);
  assert.equal(stats.totalParticipants, 2);
  // 小華 replaced by item-2 ($35, paid), 小強 ordered item-2 ($35, unpaid)
  assert.equal(stats.totalItems, 2);
  assert.equal(stats.totalAmount, 70);
  assert.equal(stats.paidAmount, 35);
  assert.equal(stats.unpaidAmount, 35);
  assert.equal(stats.backupAlerts.length, 1);
  assert.equal(stats.backupAlerts[0].participantName, '小華');
  assert.equal(stats.backupAlerts[0].statusLabel, 'substituted');

  const lineSummary = generateLineSummary(room);
  assert.ok(lineSummary.includes('四季春茶'));
  assert.ok(lineSummary.includes('【⚠️ 缺貨與備選方案執行紀錄】'));
  assert.ok(lineSummary.includes('LINE Pay ID: ming123'));
});
