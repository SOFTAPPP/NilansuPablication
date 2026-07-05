import React from 'react';
import { BookOpen, Users, Globe, Award } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-textPrimary mb-6">About Nilansu Publication</h1>
        <p className="text-lg text-textSecondary max-w-2xl mx-auto leading-relaxed">
          We are dedicated to empowering minds with quality literature. Our mission is to connect readers with the books they love and foster a global community of lifelong learners.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <img 
            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800" 
            alt="Library" 
            className="rounded-2xl shadow-xl object-cover h-[400px] w-full"
          />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-textPrimary mb-6">Our Story</h2>
          <p className="text-textSecondary mb-6 leading-relaxed">
            Founded with a passion for knowledge, Nilansu Publication started as a small independent bookstore. Today, we have grown into a premier destination for diverse literary voices, academic resources, and compelling fiction.
          </p>
          <p className="text-textSecondary leading-relaxed">
            We believe that a book is not just pages and ink, but a portal to another world, a catalyst for new ideas, and a lifelong companion. That's why we carefully curate our collection to ensure every reader finds their perfect match.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <div className="bg-surface p-8 rounded-2xl border border-divider text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <BookOpen size={32} />
          </div>
          <h3 className="text-xl font-bold text-textPrimary mb-3">Extensive Catalog</h3>
          <p className="text-sm text-textSecondary">Thousands of titles spanning diverse genres and topics.</p>
        </div>
        <div className="bg-surface p-8 rounded-2xl border border-divider text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-textPrimary mb-3">Community First</h3>
          <p className="text-sm text-textSecondary">Building connections between authors and readers globally.</p>
        </div>
        <div className="bg-surface p-8 rounded-2xl border border-divider text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Globe size={32} />
          </div>
          <h3 className="text-xl font-bold text-textPrimary mb-3">Global Reach</h3>
          <p className="text-sm text-textSecondary">Delivering literary masterpieces to doorsteps worldwide.</p>
        </div>
        <div className="bg-surface p-8 rounded-2xl border border-divider text-center hover:shadow-lg transition-shadow">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Award size={32} />
          </div>
          <h3 className="text-xl font-bold text-textPrimary mb-3">Premium Quality</h3>
          <p className="text-sm text-textSecondary">Ensuring the highest standards in binding and printing.</p>
        </div>
      </div>
    </div>
  );
}
