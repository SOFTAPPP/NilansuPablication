import React, { createContext, useReducer, useEffect, useContext } from 'react';

const CartContext = createContext<any>(undefined);

const initialState = {
  items: JSON.parse(localStorage.getItem('cartItems')) || [],
};

function cartReducer(state, action) {
  let newItems;
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.items.find(item => item.bookId === action.payload.bookId);
      if (existingItem) {
        newItems = state.items.map(item =>
          item.bookId === action.payload.bookId
            ? { ...item, quantity: Math.min(item.quantity + action.payload.quantity, action.payload.maxStock) }
            : item
        );
      } else {
        newItems = [...state.items, action.payload];
      }
      break;
    case 'REMOVE_FROM_CART':
      newItems = state.items.filter(item => item.bookId !== action.payload.bookId);
      break;
    case 'UPDATE_QUANTITY':
      newItems = state.items.map(item =>
        item.bookId === action.payload.bookId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      break;
    case 'CLEAR_CART':
      newItems = [];
      break;
    default:
      return state;
  }
  
  localStorage.setItem('cartItems', JSON.stringify(newItems));
  return { items: newItems };
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const cartTotal = state.items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  const cartCount = state.items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ state, dispatch, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
