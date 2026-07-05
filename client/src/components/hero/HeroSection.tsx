import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import BackgroundLayers from './BackgroundLayers';
import FloatingPages from './FloatingPages';

const slides = [
  {
    id: 1,
    title: "Discover your next great read",
    subtitle: "A carefully curated selection of books blending traditional warmth with modern convenience.",
    tagline: "বই পড়ুন — জীবন বড়ো হোক (Read Books — Let Life Expand)",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=800&auto=format&fit=crop",
    link: "/categories"
  },
  {
    id: 2,
    title: "Explore Bengali Textbooks",
    subtitle: "Find all your essential academic readings and school syllabus books right here.",
    tagline: "Knowledge is power.",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop",
    link: "/category/bengali-textbook"
  },
  {
    id: 3,
    title: "Master English Grammar",
    subtitle: "Build a strong foundation with our comprehensive grammar and vocabulary collections.",
    tagline: "Speak and write with confidence.",
    image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop",
    link: "/category/english-grammar"
  },
  {
    id: 4,
    title: "Learn Computer Science",
    subtitle: "From basic computing to advanced programming, we have you covered.",
    tagline: "Code your future.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    link: "/category/computer"
  },
  {
    id: 5,
    title: "Dive into Story Books",
    subtitle: "Lose yourself in captivating fiction, romance, and thrilling mysteries.",
    tagline: "Every book is a new adventure.",
    image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=800&auto=format&fit=crop",
    link: "/category/story-book"
  }
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play interval of 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const current = slides[currentSlide];

  return (
    <section className="relative w-full h-[100vh] min-h-[600px] overflow-hidden bg-background font-body -mt-24 pt-24">
      <BackgroundLayers mouseX={0} mouseY={0} />
      <FloatingPages />

      <div className="container mx-auto h-full flex items-center relative z-30 px-4 md:px-8">
        
        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 md:left-8 z-40 p-2 md:p-3 rounded-full bg-surface/80 shadow hover:bg-surface text-textPrimary transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <button 
          onClick={nextSlide}
          className="absolute right-4 md:right-8 z-40 p-2 md:p-3 rounded-full bg-surface/80 shadow hover:bg-surface text-textPrimary transition-colors"
        >
          <ChevronRight size={24} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-12 md:px-20"
          >
            {/* Left Side: Text Content */}
            <div className="w-full md:w-[50%] flex flex-col justify-center items-center md:items-start text-center md:text-left order-2 md:order-1 pt-4 md:pt-0">
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-textPrimary leading-[1.15] mb-6"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              >
                {current.title}
              </motion.h1>
              
              <motion.p 
                className="text-textSecondary text-lg max-w-[520px] mb-4 font-body"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              >
                {current.subtitle}
              </motion.p>
              
              <motion.p 
                className="text-primary text-sm opacity-80 mb-8 tracking-wider font-semibold"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              >
                {current.tagline}
              </motion.p>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring" }}
              >
                <Link to={current.link} className="btn-primary inline-flex items-center gap-2 text-lg">
                  Explore <ArrowRight size={18} />
                </Link>
              </motion.div>
            </div>

            {/* Right Side: Image */}
            <div className="w-full md:w-[50%] h-[35vh] md:h-[55vh] relative order-1 md:order-2 flex items-center justify-center">
              <motion.img 
                src={current.image} 
                alt={current.title}
                className="w-full h-full object-cover rounded-2xl shadow-xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-40">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${currentSlide === index ? 'bg-primary scale-125' : 'bg-primary/30 hover:bg-primary/50'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
