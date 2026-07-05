import React, { memo } from 'react';
import { Heart, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';

const BookCard = memo(function BookCard({ book, variant = 'normal', isPriority = false }: any) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { dispatch: cartDispatch } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const isOutOfStock = book.stock === 0;
  const inWishlist = isInWishlist(book.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) return;
    cartDispatch({
      type: 'ADD_TO_CART',
      payload: {
        bookId: book.id,
        title: book.title,
        author: book.author,
        unitPrice: book.price,
        coverImage: book.coverImage,
        quantity: 1,
        maxStock: book.stock
      }
    });
    showToast(`Added "${book.title}" to your cart!`, 'success');
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    wishlistDispatch({
      type: 'TOGGLE_WISHLIST',
      payload: book
    });
  };

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['book', book.slug],
      queryFn: () => api.getBookBySlug(book.slug)
    });
  };

  return (
    <div className={`card overflow-hidden flex flex-col group ${isOutOfStock ? 'opacity-70 grayscale' : ''}`}>
      <Link 
        to={`/book/${book.slug}`} 
        className={`relative block ${variant === 'trending' ? 'aspect-[4/3]' : 'aspect-[3/4]'} overflow-hidden bg-muted`}
        onMouseEnter={handlePrefetch}
      >
        {/* Image Skeleton */}
        <img 
          src={book.coverImage} 
          alt={book.title}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          loading={isPriority ? undefined : "lazy"}
          {...(isPriority ? { fetchPriority: "high" } as any : {})}
        />
        
        {/* Wishlist Toggle */}
        <button 
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
        >
          <Heart size={18} className={inWishlist ? "fill-primary text-primary" : "text-textSecondary/70"} />
        </button>

        {/* Badges Container */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Discount Badge */}
          {book.isOnSale && !isOutOfStock && (
            <div className="bg-danger text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm w-max">
              Sale
            </div>
          )}

          {/* Low Stock Badge */}
          {!isOutOfStock && book.stock <= 5 && (
            <div className="bg-warning text-black text-xs font-bold px-2 py-1 rounded-md shadow-sm w-max">
              Low Stock
            </div>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-danger font-semibold px-4 py-2 rounded-lg shadow-lg">Out of Stock</span>
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-2">
          <Star size={14} className="fill-warning text-warning" />
          <span className="text-xs font-medium">{book.rating}</span>
          <span className="text-xs text-textSecondary/70">({book.reviewCount})</span>
        </div>

        <Link to={`/book/${book.slug}`}>
          <h3 className="font-semibold text-textPrimary leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-textSecondary mb-4 line-clamp-1 flex-1">{book.author}</p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {book.isOnSale ? (
              <>
                <span className="text-xs text-textSecondary/70 line-through">₹{book.oldPrice}</span>
                <span className="font-bold text-primary dark:text-[#A3E635] text-lg">₹{book.price}</span>
              </>
            ) : (
              <span className="font-bold text-primary dark:text-[#A3E635] mt-4 text-lg">₹{book.price}</span>
            )}
          </div>
          
          <button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="btn-primary py-1.5 px-4 text-sm"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
});

export default BookCard;
