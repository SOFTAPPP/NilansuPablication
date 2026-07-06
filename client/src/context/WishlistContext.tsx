import React, { createContext, useReducer, useEffect, useContext, useCallback, useMemo } from 'react';

interface WishlistBook {
  id: string;
  title: string;
  author?: string;
  coverImage?: string;
  price: number;
  slug?: string;
}

interface WishlistState {
  items: WishlistBook[];
}

type WishlistAction =
  | { type: 'TOGGLE_WISHLIST'; payload: WishlistBook }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: { id: string } };

interface WishlistContextType {
  state: WishlistState;
  dispatch: React.Dispatch<WishlistAction>;
  isInWishlist: (bookId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function safelyLoadWishlistItems(): WishlistBook[] {
  try {
    const raw = localStorage.getItem('wishlistItems');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    localStorage.removeItem('wishlistItems');
    return [];
  }
}

const initialState: WishlistState = {
  items: safelyLoadWishlistItems(),
};

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'TOGGLE_WISHLIST': {
      const exists = state.items.find(item => item.id === action.payload.id);
      if (exists) {
        return { items: state.items.filter(item => item.id !== action.payload.id) };
      }
      return { items: [...state.items, action.payload] };
    }
    case 'REMOVE_FROM_WISHLIST':
      return { items: state.items.filter(item => item.id !== action.payload.id) };
    default:
      return state;
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  useEffect(() => {
    try {
      localStorage.setItem('wishlistItems', JSON.stringify(state.items));
    } catch {
      // Storage quota exceeded or private browsing
    }
  }, [state.items]);

  const isInWishlist = useCallback(
    (bookId: string) => state.items.some(item => item.id === bookId),
    [state.items]
  );

  const value = useMemo(
    () => ({ state, dispatch, isInWishlist }),
    [state, dispatch, isInWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
