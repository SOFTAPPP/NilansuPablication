import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactUs() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-4xl font-bold text-textPrimary mb-4 text-center">Contact Us</h1>
      <p className="text-textSecondary mb-12 text-center max-w-2xl mx-auto">Have a question or need assistance? Reach out to us using the form below or via our direct contact information.</p>
      
      <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
        <div>
          <h3 className="text-2xl font-semibold text-textPrimary mb-6">Get in Touch</h3>
          <form className="space-y-5 bg-surface p-8 rounded-3xl border border-divider shadow-sm" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Name</label>
              <input type="text" className="w-full bg-background border border-divider rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-textPrimary" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Email</label>
              <input type="email" className="w-full bg-background border border-divider rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-textPrimary" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Message</label>
              <textarea rows={5} className="w-full bg-background border border-divider rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-textPrimary" placeholder="How can we help?"></textarea>
            </div>
            <button type="submit" className="w-full bg-primary text-white rounded-xl py-3 font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Send Message
            </button>
          </form>
        </div>
        
        <div className="space-y-6 lg:mt-14">
          <div className="bg-surface rounded-3xl border border-divider p-6 flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-textPrimary mb-1">Email</h4>
              <p className="text-textSecondary">support@nilansupublication.com</p>
            </div>
          </div>
          <div className="bg-surface rounded-3xl border border-divider p-6 flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-textPrimary mb-1">Phone</h4>
              <p className="text-textSecondary">+91 98765 43210</p>
              <p className="text-sm text-textSecondary mt-1">Mon-Fri, 9am - 6pm IST</p>
            </div>
          </div>
          <div className="bg-surface rounded-3xl border border-divider p-6 flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-textPrimary mb-1">Address</h4>
              <p className="text-textSecondary leading-relaxed">Nilansu Publication<br/>Kolkata, West Bengal<br/>India 700001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
