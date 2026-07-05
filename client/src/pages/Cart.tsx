import React from 'react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Trash2, Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Cart() {
  const { state: { items }, dispatch: cartDispatch, cartTotal } = useCart();
  const { dispatch: wishlistDispatch } = useWishlist();
  const navigate = useNavigate();

  const deliveryFee = items.length > 0 ? (cartTotal > 999 ? 0 : 50) : 0;
  const grandTotal = cartTotal + deliveryFee;

  const updateQuantity = (bookId, currentQty, change, maxStock) => {
    const newQty = currentQty + change;
    if (newQty >= 1 && newQty <= maxStock) {
      cartDispatch({ type: 'UPDATE_QUANTITY', payload: { bookId, quantity: newQty } });
    }
  };

  const removeItem = (bookId) => {
    cartDispatch({ type: 'REMOVE_FROM_CART', payload: { bookId } });
  };

  const moveToWishlist = (item) => {
    wishlistDispatch({ 
      type: 'TOGGLE_WISHLIST', 
      payload: { id: item.bookId, title: item.title, author: item.author, coverImage: item.coverImage, price: item.unitPrice } 
    });
    removeItem(item.bookId);
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-primary/5 p-6 rounded-full mb-6">
          <ShoppingBag size={48} className="text-primary/50" />
        </div>
        <h2 className="text-2xl font-bold text-textPrimary mb-2">Your cart is empty</h2>
        <p className="text-textSecondary mb-8 max-w-md">Looks like you haven't added any books to your cart yet. Discover your next favorite read in our collection.</p>
        <Link to="/" className="btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-textPrimary mb-8">Shopping Cart</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Cart Items List */}
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <div key={item.bookId} className="bg-surface border border-divider rounded-2xl p-4 flex gap-4 shadow-sm relative">
              <Link to={`/book/${item.bookId}`} className="w-24 shrink-0 aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                <img src={item.coverImage?.includes('uploaded_books') ? `${item.coverImage}?w=200` : item.coverImage} alt={item.title} className="w-full h-full object-cover" />
              </Link>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <Link to={`/book/${item.bookId}`} className="font-semibold text-textPrimary hover:text-primary transition-colors text-lg line-clamp-1">
                    {item.title}
                  </Link>
                  <p className="text-sm text-textSecondary">{item.author}</p>
                </div>
                
                <div className="flex items-end justify-between mt-4">
                  <div className="flex items-center gap-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center bg-muted rounded-lg border border-divider p-1">
                      <button 
                        onClick={() => updateQuantity(item.bookId, item.quantity, -1, item.maxStock)}
                        className="w-8 h-8 flex items-center justify-center text-textSecondary hover:bg-surface rounded shadow-sm transition-all"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.bookId, item.quantity, 1, item.maxStock)}
                        className="w-8 h-8 flex items-center justify-center text-textSecondary hover:bg-surface rounded shadow-sm transition-all disabled:opacity-50"
                        disabled={item.quantity >= item.maxStock}
                      >
                        +
                      </button>
                    </div>
                    
                    <button onClick={() => removeItem(item.bookId)} className="text-textSecondary hover:text-danger p-2 transition-colors">
                      <Trash2 size={18} />
                    </button>
                    <button onClick={() => moveToWishlist(item)} className="text-textSecondary hover:text-primary p-2 transition-colors hidden sm:block">
                      <Heart size={18} />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg">₹{item.unitPrice * item.quantity}</div>
                    {item.quantity > 1 && <div className="text-xs text-textSecondary">₹{item.unitPrice} each</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-surface rounded-2xl border border-divider p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-textPrimary mb-6">Order Summary</h2>
            
            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between text-textSecondary">
                <span>Subtotal ({items.reduce((a,b)=>a+b.quantity, 0)} items)</span>
                <span className="font-medium text-textPrimary">₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-textSecondary">
                <span>Delivery Fee</span>
                <span className="font-medium text-textPrimary">{deliveryFee === 0 ? <span className="text-success">Free</span> : `₹${deliveryFee}`}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="text-xs text-primary bg-primary/5 p-2 rounded-lg">
                  Add ₹{1000 - cartTotal} more for free delivery!
                </div>
              )}
            </div>
            
            <div className="border-t border-divider pt-4 mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-textPrimary">Grand Total</span>
                <span className="font-bold text-xl text-primary">₹{grandTotal}</span>
              </div>
              <p className="text-xs text-textSecondary text-right">Inclusive of all taxes</p>
            </div>
            
            <button 
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full py-3 flex justify-center items-center gap-2"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
