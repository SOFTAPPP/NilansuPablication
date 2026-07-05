import React, { createContext, useReducer, useEffect, useContext } from 'react';

const WishlistContext = createContext<any>(undefined);

const initialState = {
  items: JSON.parse(localStorage.getItem('wishlistItems')) || [],
};

function wishlistReducer(state, action) {
  let newItems;
  switch (action.type) {
    case 'TOGGLE_WISHLIST':
      const exists = state.items.find(item => item.id === action.payload.id);
      if (exists) {
        newItems = state.items.filter(item => item.id !== action.payload.id);
      } else {
        newItems = [...state.items, action.payload];
      }
      break;
    case 'REMOVE_FROM_WISHLIST':
      newItems = state.items.filter(item => item.id !== action.payload.id);
      break;
    default:
      return state;
  }
  
  localStorage.setItem('wishlistItems', JSON.stringify(newItems));
  return { items: newItems };
}

export function WishlistProvider({ children }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  const isInWishlist = (bookId) => {
    return state.items.some(item => item.id === bookId);
  };

  return (
    <WishlistContext.Provider value={{ state, dispatch, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
