import { MenuItem } from '../types.ts';

export interface PresetSample {
  id: string;
  name: string;
  category: 'drink' | 'bento' | 'clothing' | 'other';
  icon: string;
  storeName: string;
  description: string;
  sampleText: string;
  items: MenuItem[];
}

export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 'sample-50lan',
    name: '50嵐 經典手搖飲',
    category: 'drink',
    icon: '🥤',
    storeName: '50嵐 (大安旗艦店)',
    description: '經典波霸奶茶、四季春、紅茶拿鐵、翡翠檸檬',
    sampleText: `50嵐 最新菜單
【找好茶】
四季春茶 $35 (M $30)
茉莉綠茶 $35 (M $30)
阿薩姆紅茶 $35 (M $30)
【找奶茶】
波霸奶茶 $55 (M $45)
珍波椰奶茶 $60 (M $50)
椰果奶茶 $50 (M $40)
【找新鮮】
翡翠檸檬 $55
冰淇淋紅茶 $50
【紅茶拿鐵】
紅茶拿鐵 $65 (M $50)
可調冰塊：正常冰、少冰、微冰、去冰、溫、熱
可調甜度：正常糖、少糖(7分)、半糖(5分)、微糖(3分)、二分糖(2分)、無糖
加料：波霸+10、椰果+10、仙草凍+10、布丁+15`,
    items: [
      {
        id: 'p1',
        name: '波霸奶茶',
        category: '找奶茶',
        defaultPrice: 55,
        description: '招牌Q彈黑糖大波霸搭配香醇錫蘭奶茶',
        isAvailable: true,
        optionGroups: [
          {
            id: 'p1-size',
            name: '容量尺寸',
            required: true,
            multiple: false,
            options: [
              { id: 'm', name: '中杯 (M)', priceDelta: 0 },
              { id: 'l', name: '大杯 (L)', priceDelta: 10 },
            ],
          },
          {
            id: 'p1-sweet',
            name: '甜度',
            required: true,
            multiple: false,
            options: [
              { id: 's1', name: '正常糖 (100%)', priceDelta: 0 },
              { id: 's2', name: '半糖 (50%)', priceDelta: 0 },
              { id: 's3', name: '微糖 (30%)', priceDelta: 0 },
              { id: 's4', name: '無糖 (0%)', priceDelta: 0 },
            ],
          },
          {
            id: 'p1-ice',
            name: '冰塊',
            required: true,
            multiple: false,
            options: [
              { id: 'i1', name: '少冰', priceDelta: 0 },
              { id: 'i2', name: '微冰', priceDelta: 0 },
              { id: 'i3', name: '去冰', priceDelta: 0 },
              { id: 'i4', name: '溫熱', priceDelta: 0 },
            ],
          },
          {
            id: 'p1-add',
            name: '加料專區',
            required: false,
            multiple: true,
            options: [
              { id: 'a1', name: '多一份波霸', priceDelta: 10 },
              { id: 'a2', name: '加椰果', priceDelta: 10 },
              { id: 'a3', name: '加布丁', priceDelta: 15 },
            ],
          },
        ],
      },
      {
        id: 'p2',
        name: '四季春茶',
        category: '找好茶',
        defaultPrice: 35,
        description: '南投高山原葉萃取，甘甜回味不苦澀',
        isAvailable: true,
        optionGroups: [
          {
            id: 'p2-size',
            name: '容量尺寸',
            required: true,
            multiple: false,
            options: [
              { id: 'm', name: '中杯 (M)', priceDelta: 0 },
              { id: 'l', name: '大杯 (L)', priceDelta: 5 },
            ],
          },
          {
            id: 'p2-sweet',
            name: '甜度',
            required: true,
            multiple: false,
            options: [
              { id: 's3', name: '微糖 (30%)', priceDelta: 0 },
              { id: 's4', name: '無糖 (0%)', priceDelta: 0 },
            ],
          },
          {
            id: 'p2-ice',
            name: '冰塊',
            required: true,
            multiple: false,
            options: [
              { id: 'i1', name: '少冰', priceDelta: 0 },
              { id: 'i2', name: '微冰', priceDelta: 0 },
              { id: 'i3', name: '去冰', priceDelta: 0 },
            ],
          },
          {
            id: 'p2-add',
            name: '加料專區',
            required: false,
            multiple: true,
            options: [
              { id: 'a1', name: '加茶凍', priceDelta: 10 },
              { id: 'a2', name: '加波霸', priceDelta: 10 },
            ],
          },
        ],
      },
      {
        id: 'p3',
        name: '紅茶拿鐵 (鮮奶)',
        category: '鮮奶茶',
        defaultPrice: 65,
        description: '優質鮮奶搭配阿薩姆紅茶',
        isAvailable: true,
        optionGroups: [
          {
            id: 'p3-size',
            name: '容量尺寸',
            required: true,
            multiple: false,
            options: [
              { id: 'm', name: '中杯 (M)', priceDelta: 0 },
              { id: 'l', name: '大杯 (L)', priceDelta: 15 },
            ],
          },
          {
            id: 'p3-sweet',
            name: '甜度',
            required: true,
            multiple: false,
            options: [
              { id: 's2', name: '半糖 (50%)', priceDelta: 0 },
              { id: 's3', name: '微糖 (30%)', priceDelta: 0 },
              { id: 's4', name: '無糖 (0%)', priceDelta: 0 },
            ],
          },
          {
            id: 'p3-ice',
            name: '冰塊',
            required: true,
            multiple: false,
            options: [
              { id: 'i2', name: '微冰', priceDelta: 0 },
              { id: 'i3', name: '去冰', priceDelta: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sample-bento',
    name: '五星排骨 經典便當專賣',
    category: 'bento',
    icon: '🍱',
    storeName: '極品厚切排骨便當',
    description: '炸排骨、香酥大雞腿、控肉飯、可調整飯量與辣度配菜',
    sampleText: `便當菜單：
1. 招牌黃金炸排骨便當 $115 (厚切多汁帶骨里肌)
2. 脆皮大雞腿便當 $125 (整隻去骨大雞腿)
3. 秘製古早味控肉便當 $110 (肥瘦相間入口即化)
可選白飯：標準白飯、半飯、換雙倍青菜(+15)
辣度：不辣、微辣辣蘿蔔、大辣
加購：古早味滷蛋+15、油豆腐+15、每日例湯+25`,
    items: [
      {
        id: 'b1',
        name: '招牌黃金炸排骨便當',
        category: '主廚招牌',
        defaultPrice: 115,
        description: '厚切多汁帶骨里肌豬排，現點現炸',
        isAvailable: true,
        optionGroups: [
          {
            id: 'b1-rice',
            name: '白飯份量',
            required: true,
            multiple: false,
            options: [
              { id: 'r1', name: '標準白飯', priceDelta: 0 },
              { id: 'r2', name: '半飯', priceDelta: 0 },
              { id: 'r3', name: '不吃白飯 (換雙倍時蔬)', priceDelta: 15 },
            ],
          },
          {
            id: 'b1-spice',
            name: '辣度風味',
            required: true,
            multiple: false,
            options: [
              { id: 'sp1', name: '不辣', priceDelta: 0 },
              { id: 'sp2', name: '加微辣辣蘿蔔乾', priceDelta: 0 },
              { id: 'sp3', name: '特製魔鬼辣椒', priceDelta: 0 },
            ],
          },
          {
            id: 'b1-side',
            name: '加購配料',
            required: false,
            multiple: true,
            options: [
              { id: 'sd1', name: '古早味滷蛋', priceDelta: 15 },
              { id: 'sd2', name: '入味油豆腐 (2塊)', priceDelta: 15 },
              { id: 'sd3', name: '主廚貢丸蘿蔔湯', priceDelta: 25 },
            ],
          },
        ],
      },
      {
        id: 'b2',
        name: '脆皮大雞腿便當',
        category: '主廚招牌',
        defaultPrice: 125,
        description: '超大整隻生炸雞腿，金黃酥脆',
        isAvailable: true,
        optionGroups: [
          {
            id: 'b2-rice',
            name: '白飯份量',
            required: true,
            multiple: false,
            options: [
              { id: 'r1', name: '標準白飯', priceDelta: 0 },
              { id: 'r2', name: '半飯', priceDelta: 0 },
              { id: 'r3', name: '換雙倍時蔬', priceDelta: 15 },
            ],
          },
          {
            id: 'b2-side',
            name: '加購配料',
            required: false,
            multiple: true,
            options: [
              { id: 'sd1', name: '古早味滷蛋', priceDelta: 15 },
              { id: 'sd2', name: '入味油豆腐', priceDelta: 15 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sample-apparel',
    name: '公司/社團 紀念連帽T團購',
    category: 'clothing',
    icon: '👕',
    storeName: 'TopStyle 客製團服',
    description: '380g 重磅純棉厚磅帽T，多種尺寸與顏色供選擇',
    sampleText: `2026年限定連帽T恤團購：
單價：$690 (2XL需另加收$40面料費)
尺寸：XS、S、M、L、XL、2XL
顏色：曜石黑、海軍藍、麻花灰、鼠尾草綠(+30)
加值：客製個人英文名字刺繡(+80)`,
    items: [
      {
        id: 'c1',
        name: '2026 年度紀念重磅連帽T',
        category: '連帽衛衣',
        defaultPrice: 690,
        description: '380g 高克重純棉內刷毛，抗起毛球',
        isAvailable: true,
        optionGroups: [
          {
            id: 'c1-size',
            name: '尺碼 (Size)',
            required: true,
            multiple: false,
            options: [
              { id: 'sz-s', name: 'S (女款/修身)', priceDelta: 0 },
              { id: 'sz-m', name: 'M (中性標準)', priceDelta: 0 },
              { id: 'sz-l', name: 'L (寬鬆舒適)', priceDelta: 0 },
              { id: 'sz-xl', name: 'XL (美式Oversize)', priceDelta: 0 },
              { id: 'sz-2xl', name: '2XL (特大尺碼)', priceDelta: 40 },
            ],
          },
          {
            id: 'c1-color',
            name: '顏色選擇 (Color)',
            required: true,
            multiple: false,
            options: [
              { id: 'cl-black', name: '曜石黑 (經典)', priceDelta: 0 },
              { id: 'cl-navy', name: '海軍深藍', priceDelta: 0 },
              { id: 'cl-gray', name: '麻花灰', priceDelta: 0 },
              { id: 'cl-sage', name: '鼠尾草綠 (限量款)', priceDelta: 30 },
            ],
          },
          {
            id: 'c1-custom',
            name: '袖口專屬刺繡',
            required: false,
            multiple: false,
            options: [
              { id: 'emb-none', name: '不加刺繡', priceDelta: 0 },
              { id: 'emb-name', name: '加繡個人英文名 (6字內)', priceDelta: 80 },
            ],
          },
        ],
      },
    ],
  },
];
