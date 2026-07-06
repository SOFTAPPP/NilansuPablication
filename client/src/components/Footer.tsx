import React, { useState } from 'react';
import { BookOpen, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../logo/logo.png';

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      setNewsletterStatus('Please enter a valid email address.');
      return;
    }
    setNewsletterStatus('Thank you for subscribing!');
    setNewsletterEmail('');
    setTimeout(() => setNewsletterStatus(null), 4000);
  };

  return (
    <footer className="bg-surface border-t border-divider pt-16 pb-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 mb-12">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 md:pr-4">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Nilansu Logo" className="h-16 w-auto object-contain" />
              <span className="text-lg font-semibold text-textPrimary">
                Nilansu <span className="text-primary font-normal">Publication</span>
              </span>
            </Link>
            <p className="text-textSecondary/70 text-sm leading-relaxed mb-6">
              Empowering minds with quality literature. Discover our vast collection of books spanning across various genres and categories.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-textSecondary hover:bg-primary hover:text-white transition-all"><Facebook size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-textSecondary hover:bg-primary hover:text-white transition-all"><Twitter size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-textSecondary hover:bg-primary hover:text-white transition-all"><Instagram size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-textSecondary hover:bg-primary hover:text-white transition-all"><Youtube size={18} /></a>
            </div>
          </div>

          {/* Links */}
          <div className="col-span-1">
            <h4 className="font-semibold text-textPrimary mb-4">Explore</h4>
            <ul className="space-y-3 text-sm text-textSecondary">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/category/bengali-textbook" className="hover:text-primary transition-colors">Bengali Textbook</Link></li>
              <li><Link to="/category/english-textbooks" className="hover:text-primary transition-colors">English Textbook</Link></li>
              <li><Link to="/category/computer" className="hover:text-primary transition-colors">Computer</Link></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-semibold text-textPrimary mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-textSecondary">
              <li><Link to="/help-center" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/track-order" className="hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link to="/returns" className="hover:text-primary transition-colors">Returns</Link></li>
              <li><Link to="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/about-us" className="hover:text-primary transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-semibold text-textPrimary mb-4">Newsletter</h4>
            <p className="text-textSecondary text-sm mb-4">Subscribe for soft aesthetic updates & offers.</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="input-field text-sm flex-1 min-w-0"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" className="btn-primary py-2 px-4 text-sm whitespace-nowrap shrink-0">
                Subscribe
              </button>
            </form>
            {newsletterStatus && (
              <p className={`text-xs mt-2 ${newsletterStatus.includes('Thank') ? 'text-success' : 'text-danger'}`}>{newsletterStatus}</p>
            )}
          </div>
        </div>

        <div className="border-t border-divider pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-textSecondary/70 gap-4">
          <p>© {new Date().getFullYear()} Nilansu Publication. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-textPrimary">Privacy Policy</a>
            <a href="#" className="hover:text-textPrimary">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
