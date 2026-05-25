import { create } from 'zustand';
import { Currency, PaymentMethod } from '../shared/types';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  maxQuantity: number; // stock limit
  image?: string;
}

interface CartState {
  items: CartItem[];
  discount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  customerId?: string;
  notes: string;

  addItem: (item: Omit<CartItem, 'total'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setCurrency: (currency: Currency) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomer: (customerId: string | undefined) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Computed
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  discount: 0,
  currency: Currency.USD,
  paymentMethod: PaymentMethod.CASH,
  customerId: undefined,
  notes: '',

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + item.quantity, item.maxQuantity),
                  total: Math.min(i.quantity + item.quantity, item.maxQuantity) * i.unitPrice,
                }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { ...item, total: item.quantity * item.unitPrice }],
      };
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)), total: Math.max(1, Math.min(quantity, i.maxQuantity)) * i.unitPrice }
          : i
      ),
    })),

  setDiscount: (discount) => set({ discount }),
  setCurrency: (currency) => set({ currency }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCustomer: (customerId) => set({ customerId }),
  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      discount: 0,
      customerId: undefined,
      notes: '',
      paymentMethod: PaymentMethod.CASH,
    }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.total, 0),
  total: () => Math.max(0, get().subtotal() - get().discount),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
