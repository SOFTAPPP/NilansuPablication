import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DialogProvider } from './context/DialogContext';
import { io } from 'socket.io-client';
import { queryClient } from './main';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Initialize socket connection
const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
  withCredentials: true,
});

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Category = lazy(() => import('./pages/Category'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentSuccess = lazy(() => import('./pages/payment/Success'));
const PaymentFailed = lazy(() => import('./pages/payment/Failed'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Returns = lazy(() => import('./pages/Returns'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const AllCategories = lazy(() => import('./pages/AllCategories'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));

const NotFound = () => (
  <div className="container mx-auto px-4 py-32 flex flex-col items-center text-center">
    <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
    <h2 className="text-2xl font-bold text-textPrimary mb-4">Page Not Found</h2>
    <p className="text-textSecondary mb-8">The page you are looking for doesn't exist or has been moved.</p>
    <a href="/" className="btn-primary px-8 py-3 rounded-lg shadow-md">Go Back Home</a>
  </div>
);

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const { token } = useParams<{ token: string }>();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (user && user.role === 'ADMIN' && token) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/admin/validate-token/${token}`, { credentials: 'include' })
        .then(res => {
          if (res.ok) setIsValid(true);
          setIsValidating(false);
        })
        .catch(() => setIsValidating(false));
    } else if (!isLoading) {
      setIsValidating(false);
    }
  }, [user, isLoading, token]);

  if (isLoading || isValidating) return <PageLoader />;
  
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  if (!isValid) {
    return <NotFound />;
  }
  
  return children;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) {
    sessionStorage.setItem('redirect_after_login', location.pathname);
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Global fallback for Suspense
const PageLoader = () => (
  <div className="flex justify-center items-center h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
  </div>
);

function App() {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  
  useEffect(() => {
    socket.on('books_updated', () => {
      console.log('Real-time event received: books_updated');
      queryClient.refetchQueries({ queryKey: ['books'] });
      queryClient.refetchQueries({ queryKey: ['trendingBooks'] });
      queryClient.refetchQueries({ queryKey: ['book'] }); // Refetch single book queries too
    });

    socket.on('categories_updated', () => {
      console.log('Real-time event received: categories_updated');
      queryClient.refetchQueries({ queryKey: ['categories'] });
    });

    return () => {
      socket.off('books_updated');
      socket.off('categories_updated');
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <DialogProvider>
          <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow pt-16">
            <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="h-full w-full"
              >
                <Suspense fallback={<PageLoader />}>
                  <Routes location={location}>
                    <Route path="/" element={<Home />} />
                    <Route path="/categories" element={<AllCategories />} />
                    <Route path="/category/:categorySlug" element={<Category />} />
                    <Route path="/publication/:publicationSlug" element={<Category />} />
                    <Route path="/book/:slug" element={<BookDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                    <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
                    <Route path="/payment/failed" element={<ProtectedRoute><PaymentFailed /></ProtectedRoute>} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/help-center" element={<HelpCenter />} />
                    <Route path="/track-order" element={<TrackOrder />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/contact-us" element={<ContactUs />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/panel/:token/*" element={<AdminRoute><AdminPanel /></AdminRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
              </DialogProvider>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
