import React, { createContext, useReducer, useEffect, useContext, useMemo } from 'react';

interface CartItem {
  bookId: string;
  title: string;
  author?: string;
  unitPrice: number;
  coverImage?: string;
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: { bookId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { bookId: string; quantity: number } }
  | { type: 'CLEAR_CART' };

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function safelyLoadCartItems(): CartItem[] {
  try {
    const raw = localStorage.getItem('cartItems');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    localStorage.removeItem('cartItems');
    return [];
  }
}

const initialState: CartState = {
  items: safelyLoadCartItems(),
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.items.find(item => item.bookId === action.payload.bookId);
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.bookId === action.payload.bookId
              ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, action.payload.maxStock) }
              : item
          )
        };
      }
      return { items: [...state.items, action.payload] };
    }
    case 'REMOVE_FROM_CART':
      return { items: state.items.filter(item => item.bookId !== action.payload.bookId) };
    case 'UPDATE_QUANTITY':
      return {
        items: state.items.map(item =>
          item.bookId === action.payload.bookId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(state.items));
    } catch {
      // Storage quota exceeded or private browsing
    }
  }, [state.items]);

  const cartTotal = useMemo(
    () => state.items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0),
    [state.items]
  );
  const cartCount = useMemo(
    () => state.items.reduce((count, item) => count + item.quantity, 0),
    [state.items]
  );

  const value = useMemo(
    () => ({ state, dispatch, cartTotal, cartCount }),
    [state, cartTotal, cartCount]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
