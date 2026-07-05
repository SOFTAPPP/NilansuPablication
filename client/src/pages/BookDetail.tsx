import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { Heart, Star, ShoppingCart, ArrowLeft, CheckCircle } from 'lucide-react';

export default function BookDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ reviewerName: '', rating: 5, title: '', comment: '' });
  
  const { dispatch: cartDispatch } = useCart();
  const { dispatch: wishlistDispatch, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', slug],
    queryFn: () => api.getBookBySlug(slug as string),
    enabled: !!slug
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', book?.id],
    queryFn: () => api.getBookReviews(book?.id),
    enabled: !!book?.id
  });

  const submitReviewMutation = useMutation({
    mutationFn: (data: any) => api.submitBookReview(book?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', book?.id] });
      queryClient.invalidateQueries({ queryKey: ['book', slug] });
      setShowReviewForm(false);
      setReviewData({ reviewerName: '', rating: 5, title: '', comment: '' });
      showToast('Review submitted successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to submit review.', 'error');
    }
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReviewMutation.mutate(reviewData);
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-16 text-center text-textSecondary">Loading...</div>;
  }

  if (!book) {
    return <div className="container mx-auto px-4 py-16 text-center text-textSecondary">Book not found.</div>;
  }

  const isOutOfStock = book.stock === 0;
  const inWishlist = isInWishlist(book.id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    cartDispatch({
      type: 'ADD_TO_CART',
      payload: {
        bookId: book.id,
        title: book.title,
        author: book.author,
        unitPrice: book.price,
        coverImage: book.coverImage,
        quantity: qty,
        maxStock: book.stock
      }
    });
    showToast(`Added ${qty}x "${book.title}" to your cart!`, 'success');
  };

  const handleToggleWishlist = () => {
    wishlistDispatch({ type: 'TOGGLE_WISHLIST', payload: book });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-textSecondary hover:text-primary mb-8 transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-12 bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-divider">
        
        {/* Left Col - Image */}
        <div className="w-full md:w-1/3 max-w-sm mx-auto md:mx-0 shrink-0 relative">
          <div className={`aspect-[3/4] rounded-2xl overflow-hidden shadow-lg ${isOutOfStock ? 'grayscale opacity-70' : ''}`}>
            <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
              <span className="bg-surface/90 backdrop-blur-md text-textPrimary font-bold px-6 py-3 rounded-xl shadow-xl">
                Best Seller
              </span>
            </div>
          )}
        </div>

        {/* Right Col - Details */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-textPrimary leading-tight mb-2">
                {book.title}
              </h1>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleToggleWishlist}
                  className="p-3 bg-muted hover:bg-primary/10 rounded-full transition-colors shrink-0"
                >
                  <Heart size={24} className={inWishlist ? "fill-primary text-primary" : "text-textSecondary"} />
                </button>
              </div>
            </div>
            {book.author && (
              <p className="text-lg text-textSecondary mt-2"><span className="font-semibold text-textPrimary">Author:</span> {book.author}</p>
            )}
            {book.isbn && (
              <p className="text-sm text-textSecondary mt-1"><span className="font-semibold text-textPrimary">ISBN:</span> {book.isbn}</p>
            )}
          </div>

          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-divider">
            <div className="flex items-center gap-2">
              <Star className="fill-warning text-warning" size={20} />
              <span className="font-bold text-lg">{book.rating}</span>
            </div>
            <span className="text-textSecondary/70 text-sm underline decoration-divider">{book.reviewCount} Reviews</span>
            <span className="text-textSecondary/70 text-sm border-l border-divider pl-6">{book.format}</span>
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
              book.stock === 0 ? 'bg-danger/10 text-danger border-danger/20' : 
              book.stock <= 5 ? 'bg-warning/10 text-warning border-warning/20' : 
              'bg-success/10 text-success border-success/20'
            }`}>
              {book.stock === 0 ? 'Out of Stock' : book.stock <= 5 ? `Low Stock — Only ${book.stock} left!` : 'In Stock'}
            </span>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-textSecondary leading-relaxed">{book.description}</p>
          </div>

          <div className="mt-auto">
            <div className="flex items-end gap-4 mb-6">
              {book.isOnSale && book.oldPrice ? (
                <>
                  <div className="text-4xl font-bold text-primary">₹{book.price}</div>
                  <div className="text-xl text-textSecondary line-through mb-1">₹{book.oldPrice}</div>
                  <div className="text-sm font-semibold text-danger bg-danger/10 px-2 py-1 rounded mb-1 ml-2">
                    Save ₹{(book.oldPrice - book.price).toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-4xl font-bold text-primary">₹{book.price}</div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {!isOutOfStock ? (
                <>
                  <div className="mb-2">
                    <span className="text-sm text-textSecondary font-medium mb-2 block">Quantity</span>
                    <div className="flex items-center bg-muted rounded-xl border border-divider p-1 w-32 shrink-0">
                      <button 
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="w-10 h-10 flex items-center justify-center text-textSecondary hover:bg-surface hover:shadow rounded-lg transition-all"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-medium">{qty}</span>
                      <button 
                        onClick={() => setQty(Math.min(book.stock, qty + 1))}
                        className="w-10 h-10 flex items-center justify-center text-textSecondary hover:bg-surface hover:shadow rounded-lg transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleAddToCart} className="btn-secondary py-3 flex-1 text-lg flex items-center justify-center gap-2">
                      <ShoppingCart size={20} /> Add to Cart
                    </button>
                    <button 
                      onClick={() => {
                        handleAddToCart();
                        navigate('/checkout');
                      }} 
                      className="btn-primary py-3 flex-1 text-lg flex items-center justify-center shadow-lg shadow-primary/30"
                    >
                      Buy Now
                    </button>
                  </div>
                </>
              ) : (
                <button disabled className="btn-secondary opacity-50 py-3 flex-1 text-lg w-full">
                  Currently Unavailable
                </button>
              )}
            </div>
            
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-divider">
        <div className="flex items-center justify-between mb-8 border-b border-divider pb-4">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary">Customer Reviews</h2>
            <p className="text-textSecondary">{book.reviewCount} total reviews</p>
          </div>
          <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn-secondary">
            {showReviewForm ? 'Cancel' : 'Write a Review'}
          </button>
        </div>

        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="mb-10 bg-muted/50 p-6 rounded-2xl border border-divider">
            <h3 className="text-lg font-bold mb-4">Write your review</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Your Name</label>
                <input required type="text" className="input-field w-full" value={reviewData.reviewerName} onChange={e => setReviewData({...reviewData, reviewerName: e.target.value})} placeholder="John D." />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Rating</label>
                <select className="input-field w-full" value={reviewData.rating} onChange={e => setReviewData({...reviewData, rating: Number(e.target.value)})}>
                  <option value="5">5 Stars - Excellent</option>
                  <option value="4">4 Stars - Good</option>
                  <option value="3">3 Stars - Average</option>
                  <option value="2">2 Stars - Poor</option>
                  <option value="1">1 Star - Terrible</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Review Title (Optional)</label>
              <input type="text" className="input-field w-full" value={reviewData.title} onChange={e => setReviewData({...reviewData, title: e.target.value})} placeholder="Summary of your thoughts" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Review</label>
              <textarea required rows={4} className="input-field w-full resize-y" value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} placeholder="What did you like or dislike?" />
            </div>
            <div className="flex justify-end">
              <button disabled={submitReviewMutation.isPending} type="submit" className="btn-primary px-8">
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reviews.map((review: any) => (
            <div key={review.id} className="bg-muted p-6 rounded-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                  {review.reviewerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-textPrimary flex items-center gap-2">
                    {review.reviewerName}
                    {review.isVerified && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase tracking-wider">Verified</span>}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} className={star <= review.rating ? "fill-warning text-warning" : "text-textSecondary/70"} />
                      ))}
                    </div>
                    <span className="text-xs text-textSecondary">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {review.title && <h5 className="font-bold text-textPrimary mb-2">{review.title}</h5>}
              <p className="text-sm text-textSecondary leading-relaxed whitespace-pre-wrap">
                {review.comment}
              </p>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="col-span-full text-center py-12 text-textSecondary">
              Be the first to review this book!
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
