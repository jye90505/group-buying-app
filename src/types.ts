export type GroupCategory = 'drink' | 'bento' | 'clothing' | 'other';

export interface OptionItem {
  id: string;
  name: string;
  priceDelta: number; // e.g., 0, 10, 15
}

export interface OptionGroup {
  id: string;
  name: string; // e.g. "甜度", "冰塊", "尺寸", "加料", "口味", "尺碼", "顏色"
  required: boolean;
  multiple: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: OptionItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  category?: string; // e.g. "純茶系列", "拿鐵系列", "經典便當", "短袖T-shirt"
  defaultPrice: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean; // can be marked out of stock by host
  optionGroups: OptionGroup[];
}

export interface SelectedItemChoice {
  itemId: string;
  itemName: string;
  unitPrice: number;
  // groupId -> array of option names
  selectedOptions: Record<string, string[]>;
  totalPrice: number;
  itemNote?: string;
}

export type BackupStrategy = 'substitute' | 'cancel_if_out_of_stock' | 'contact_me';

export interface ParticipantOrder {
  id: string;
  participantName: string;
  contact?: string;
  paid: boolean;
  createdAt: number;
  note?: string;
  primaryChoice: SelectedItemChoice;
  backupChoice?: SelectedItemChoice | null;
  backupStrategy: BackupStrategy;
  isBackupActive?: boolean; // Set to true if primary is unavailable and backup is used
}

export interface RoomPaymentInfo {
  linePayId?: string;
  bankAccount?: string;
  allowCash: boolean;
  paymentNote?: string;
}

export interface GroupOrderRoom {
  id: string;
  title: string;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  category: GroupCategory;
  description?: string;
  organizerName: string;
  cutoffTime?: string; // ISO string
  targetAmount?: number;
  targetCount?: number;
  paymentInfo: RoomPaymentInfo;
  items: MenuItem[];
  orders: ParticipantOrder[];
  status: 'open' | 'closed' | 'ordered';
  createdAt: number;
  updatedAt: number;
}
