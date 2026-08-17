import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartItem = {
  id: string
  wishlistGiftId: string
  giftName: string
  giftImageUrl: string | null
  amount: string
  isGroupGift: boolean
}

type CartState = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateItemAmount: (id: string, amount: string) => void
  clear: () => void
}

type CartStore = ReturnType<typeof createCartStore>

// A guest could have multiple couples' sites open in the same browser, so
// the store — and its localStorage key — must be scoped per event, not
// global like `use-sidebar.ts`. One store instance is created per eventId
// and cached for the lifetime of the tab.
const storesByEventId = new Map<string, CartStore>()

function createCartStore(eventId: string) {
  return create<CartState>()(
    persist(
      set => ({
        items: [],
        addItem: item =>
          set(state => ({
            items: [...state.items, { ...item, id: crypto.randomUUID() }],
          })),
        removeItem: id =>
          set(state => ({
            items: state.items.filter(item => item.id !== id),
          })),
        updateItemAmount: (id, amount) =>
          set(state => ({
            items: state.items.map(item =>
              item.id === id ? { ...item, amount } : item
            ),
          })),
        clear: () => set({ items: [] }),
      }),
      {
        name: `wedin-cart-${eventId}`,
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
}

export function useCartStore(eventId: string): CartStore {
  let store = storesByEventId.get(eventId)
  if (!store) {
    store = createCartStore(eventId)
    storesByEventId.set(eventId, store)
  }
  return store
}
