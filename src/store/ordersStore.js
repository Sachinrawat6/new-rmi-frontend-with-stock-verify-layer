import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DATA = (set) => ({
  orders: [],
  setData: (payload) => set((state) => ({ orders: [payload, ...state.orders] })),
  deleteAll: () => set((state) => ({ ...state, orders: [] })),
});

export const useOrderStore = create(persist(DATA, { name: 'nocodb-orders' }));
