import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Search, BookOpen, Sun, Moon, Menu, X, ChevronDown, ArrowLeft, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import logo from '../logo/logo.png';
export default function Navbar() {
  const { cartCount } = useCart();
  const { state: wishlistState } = useWishlist();
  const wishlistCount = wishlistState?.items?.length || 0;
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSupportOpen, setIsMobileSupportOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile search & menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setShowSuggestions(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['liveSearch', debouncedQuery],
    queryFn: () => api.searchBooks(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 60000,
  });

  useEffect(() => {
    if (searchResults) {
      setSuggestions(searchResults);
    }
  }, [searchResults]);


  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileSupportOpen(false);
  };

  const renderSuggestions = () => {
    if (!showSuggestions || !searchQuery.trim()) return null;

    let categoryMatches = [];
    let otherMatches = [];

    if (suggestions && suggestions.length > 0) {
      categoryMatches = suggestions.filter(b => b.matchedOn === 'category');
      otherMatches = suggestions.filter(b => b.matchedOn !== 'category');
    }

    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 mt-2 bg-surface border border-divider rounded-xl shadow-xl overflow-y-auto max-h-[70vh] z-50 flex flex-col"
        >
          {isFetching && suggestions.length === 0 ? (
             <div className="p-4 text-center text-textSecondary text-sm">Searching...</div>
          ) : suggestions.length === 0 ? (
             <div className="p-4 text-center text-textSecondary text-sm">No results found for "{searchQuery}"</div>
          ) : (
            <>
              {categoryMatches.length > 0 && (
                <div className="flex flex-col">
                  <div className="px-4 py-2 bg-muted text-xs font-bold text-textSecondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                    Books in Categories
                  </div>
                  {categoryMatches.map((book: any) => (
                    <Link 
                      key={book.id} 
                      to={`/book/${book.slug}`}
                      className="flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors border-b border-divider/50 last:border-b-0"
                      onClick={() => {
                        setShowSuggestions(false);
                        setIsMobileSearchOpen(false);
                      }}
                    >
                      <img src={book.coverImage?.includes('uploaded_books') ? `${book.coverImage}?w=100` : (book.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=100')} alt={book.title} className="w-12 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-textPrimary line-clamp-1">{book.title}</h4>
                        <p className="text-xs text-textSecondary truncate">{book.author}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        Category: {book.categoryName}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              
              {otherMatches.length > 0 && (
                <div className="flex flex-col">
                  {categoryMatches.length > 0 && (
                     <div className="px-4 py-2 bg-muted text-xs font-bold text-textSecondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                       Other Matches
                     </div>
                  )}
                  {otherMatches.map((book: any) => (
                    <Link 
                      key={book.id} 
                      to={`/book/${book.slug}`}
                      className="flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors border-b border-divider/50 last:border-b-0"
                      onClick={() => {
                        setShowSuggestions(false);
                        setIsMobileSearchOpen(false);
                      }}
                    >
                      <img src={book.coverImage?.includes('uploaded_books') ? `${book.coverImage}?w=100` : (book.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=100')} alt={book.title} className="w-12 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-textPrimary line-clamp-1">{book.title}</h4>
                        <p className="text-xs text-textSecondary truncate">{book.author}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                        {book.matchedOn || 'Match'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <button 
                type="button"
                onClick={handleSearch}
                className="w-full p-3 text-sm text-center text-primary font-medium hover:bg-primary/5 transition-colors sticky bottom-0 bg-surface/95 backdrop-blur-sm border-t border-divider"
              >
                See all results for "{searchQuery}"
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-surface/90 dark:bg-[#1F1F1F]/70 backdrop-blur-2xl z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all border-b border-transparent dark:border-white/5">
        {/* Modern gradient bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
        <div className="container mx-auto px-4 h-full flex items-center justify-between relative">
          
          {/* Mobile Menu Button & Logo Group */}
          <div className="flex items-center gap-2">
            <button 
              className="lg:hidden p-2 -ml-2 text-textSecondary hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group" onClick={closeMobileMenu}>
              <div className="flex items-center justify-center p-1 rounded-xl transition-colors duration-300">
                <img src={logo} alt="Nilansu Logo" className="h-16 w-auto object-contain" />
              </div>
              <div className="hidden sm:flex flex-col gap-1">
                <span className="text-xl font-semibold tracking-tight text-textPrimary leading-none mt-1">
                  Nilansu <span className="text-primary font-normal">Publication</span>
                </span>
                <span className="text-xl font-semibold tracking-tight text-textPrimary leading-none">
                  Nil <span className="text-primary font-normal">Publication</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden lg:block relative" ref={searchRef}>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search books, authors, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if(searchQuery.trim().length > 1) setShowSuggestions(true); }}
                className="w-full bg-background dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full py-2 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/40 focus:border-primary dark:focus:border-primary/50 focus:shadow-[0_0_15px_rgba(132,204,22,0.2)] dark:focus:shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all duration-300 text-sm text-textPrimary hover:dark:border-white/20"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-textSecondary" size={18} />
            </form>
            {renderSuggestions()}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-textSecondary mx-4">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <Link to="/publication/nilansu-publication" className="hover:text-primary transition-colors">Nilansu Publication</Link>
            <Link to="/publication/nil-publication" className="hover:text-primary transition-colors">Nil Publication</Link>
            <Link to="/categories" className="hover:text-primary transition-colors">Categories</Link>
            <div className="relative group py-2">
              <span className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1">Support</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-48 bg-surface border border-divider rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden z-50">
                <Link to="/help-center" className="px-4 py-3 hover:bg-primary/5 hover:text-primary border-b border-divider/50">Help Center</Link>
                <Link to="/track-order" className="px-4 py-3 hover:bg-primary/5 hover:text-primary border-b border-divider/50">Track Order</Link>
                <Link to="/returns" className="px-4 py-3 hover:bg-primary/5 hover:text-primary border-b border-divider/50">Returns</Link>
                <Link to="/contact-us" className="px-4 py-3 hover:bg-primary/5 hover:text-primary border-b border-divider/50">Contact Us</Link>
                <Link to="/about-us" className="px-4 py-3 hover:bg-primary/5 hover:text-primary">About Us</Link>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-4">
            <button 
              className="p-2 text-textSecondary hover:text-primary transition-colors hover:bg-primary/5 rounded-full lg:hidden"
              onClick={() => setIsMobileSearchOpen(true)}
            >
              <Search size={22} />
            </button>
            {!user && (
              <Link to="/login" className="px-4 py-1.5 text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors rounded-full">
                Login
              </Link>
            )}

            <button onClick={toggleTheme} className="p-2 text-textSecondary hover:text-primary transition-colors hover:bg-primary/5 rounded-full">
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            
            {user && (
              <Link to={user.role === 'ADMIN' ? (user.adminUrl || "/profile") : "/profile"} className="p-2 text-textSecondary hover:text-primary transition-colors hover:bg-primary/5 rounded-full" title={user.role === 'ADMIN' ? "Admin Panel" : "Profile"}>
                <User size={22} />
              </Link>
            )}

            <Link to="/wishlist" className="p-2 text-textSecondary hover:text-primary transition-colors hover:bg-primary/5 rounded-full relative">
              <Heart size={22} />
              {wishlistCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={`wishlist-${wishlistCount}`}
                  className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
                >
                  {wishlistCount}
                </motion.span>
              )}
            </Link>
            <Link to="/cart" className="p-2 text-textSecondary hover:text-primary transition-colors hover:bg-primary/5 rounded-full relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                  className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 h-16 bg-surface z-[60] flex items-center px-4 shadow-sm"
          >
            <button 
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-2 mr-2 text-textSecondary hover:text-primary"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex-1 relative" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if(searchQuery.trim().length > 1) setShowSuggestions(true); }}
                  className="w-full bg-background border border-divider rounded-full py-2 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-textPrimary"
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
              </form>
              {renderSuggestions()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-surface shadow-2xl z-50 lg:hidden flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="h-16 flex items-center px-4 border-b border-divider justify-between shrink-0 bg-surface/50 backdrop-blur-md">
              <div className="flex flex-col gap-1">
                <span className="text-xl font-semibold tracking-tight text-textPrimary leading-none mt-1">
                  Nilansu <span className="text-primary font-normal">Publication</span>
                </span>
                <span className="text-xl font-semibold tracking-tight text-textPrimary leading-none">
                  Nil <span className="text-primary font-normal">Publication</span>
                </span>
              </div>
              <button onClick={closeMobileMenu} className="p-2 -mr-2 text-textSecondary hover:text-primary transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              {/* Mobile Links */}
              <div className="flex flex-col gap-2">
                <Link 
                  to="/" 
                  className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  Home
                </Link>
                <Link 
                  to="/publication/nilansu-publication" 
                  className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  Nilansu Publication
                </Link>
                <Link 
                  to="/publication/nil-publication" 
                  className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  Nil Publication
                </Link>
                <Link 
                  to="/categories" 
                  className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  Categories
                </Link>

                {user ? (
                  <Link 
                    to={user.role === 'ADMIN' ? (user.adminUrl || "/profile") : "/profile"} 
                    className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors flex items-center gap-2"
                    onClick={closeMobileMenu}
                  >
                    <User size={18} /> {user.role === 'ADMIN' ? "Admin Panel" : "My Profile"}
                  </Link>
                ) : (
                  <Link 
                    to="/login" 
                    className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors flex items-center gap-2"
                    onClick={closeMobileMenu}
                  >
                    <User size={18} /> Login / Sign Up
                  </Link>
                )}
                
                <div className="flex flex-col mt-4">
                  <span className="px-3 pb-2 text-xs font-semibold text-textSecondary uppercase tracking-wider">Support</span>
                  <Link to="/help-center" className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors" onClick={closeMobileMenu}>Help Center</Link>
                  <Link to="/track-order" className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors" onClick={closeMobileMenu}>Track Order</Link>
                  <Link to="/returns" className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors" onClick={closeMobileMenu}>Returns</Link>
                  <Link to="/contact-us" className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors" onClick={closeMobileMenu}>Contact Us</Link>
                  <Link to="/about-us" className="p-3 rounded-xl hover:bg-primary/5 text-textPrimary font-medium transition-colors" onClick={closeMobileMenu}>About Us</Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
