export type OrderStatus =
  | 'proposed'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'payment_pending'
  | 'payment_held'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'resolved_buyer'
  | 'resolved_seller';

export type EscrowStatus = 'none' | 'held' | 'released' | 'refunded';

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  currency: string;
  deliveryTerms?: string;
  status: OrderStatus;
  escrowStatus: EscrowStatus;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  listing?: { title: string; productCategory: string };
  buyer?: { id: string; name: string; phone: string };
  seller?: { id: string; name: string; phone: string };
}

export interface CreateOrderInput {
  listingId: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency?: string;
  deliveryTerms?: string;
}

export interface CounterOrderInput {
  quantity?: number;
  pricePerUnit?: number;
  deliveryTerms?: string;
}
