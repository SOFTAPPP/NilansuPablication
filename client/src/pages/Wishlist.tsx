import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { HeartOff } from 'lucide-react';
import BookCard from '../components/BookCard';

export default function Wishlist() {
  const { state: { items }, dispatch: wishlistDispatch } = useWishlist();
  const { dispatch: cartDispatch } = useCart();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-primary/5 p-6 rounded-full mb-6 text-primary/50">
          <HeartOff size={48} />
        </div>
        <h2 className="text-2xl font-bold text-textPrimary mb-2">Your wishlist is empty</h2>
        <p className="text-textSecondary mb-8 max-w-md">Save books you'd like to read later by clicking the heart icon on any book.</p>
        <Link to="/" className="btn-primary">Browse Books</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary mb-2">My Wishlist</h1>
          <p className="text-textSecondary">{items.length} items saved</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map(item => (
          <BookCard key={item.id} book={item} />
        ))}
      </div>
    </div>
  );
}
