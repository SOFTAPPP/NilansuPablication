import React, { useEffect, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useIntersection } from '../hooks/useIntersection';

export default function Home() {
  const { data: trendingBooks = [], isLoading: isLoadingTrending } = useQuery({
    queryKey: ['trendingBooks'],
    queryFn: api.getTrendingBooks
  });

  const {
    data: categoriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingCategories
  } = useInfiniteQuery({
    queryKey: ['categories'],
    queryFn: ({ pageParam = 0 }) => api.getCategories({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0
  });

  // Background prefetch
  useEffect(() => {
    if (categoriesData?.pages.length === 1 && hasNextPage) {
      fetchNextPage();
    }
  }, [categoriesData, hasNextPage, fetchNextPage]);

  const { isIntersecting, setRef } = useIntersection();

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const categories = categoriesData?.pages.flatMap(page => page.data) || [];

  const isLoading = isLoadingTrending || isLoadingCategories;

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section Slider */}
      <HeroSlider />

      {/* Trending Books */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-textPrimary tracking-tight">Trending Now</h2>
          <Link to="/search?q=" className="text-primary hover:underline text-sm font-medium">View All</Link>
        </div>
        
        <div className="flex overflow-x-auto gap-6 pb-6 snap-x hide-scrollbar">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="w-[240px] md:w-[280px] shrink-0 snap-start">
                <SkeletonCard />
              </div>
            ))
          ) : (
            trendingBooks.map((book: any, i: number) => (
              <div key={book.id} className="w-[240px] md:w-[280px] shrink-0 snap-start">
                <BookCard book={book} variant="normal" isPriority={i < 4} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-textPrimary tracking-tight mb-8">Browse Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {isLoading ? (
             Array(10).fill(0).map((_, i) => (
               <div key={i} className="h-24 bg-muted rounded-xl animate-pulse"></div>
             ))
          ) : (
            categories.map(cat => (
              <CategoryCard 
                key={cat.id} 
                cat={cat} 
              />
            ))
          )}
        </div>
        <div ref={setRef} className="h-4 w-full mt-4"></div>
      </section>
    </div>
  );
}


const slides = [
  {
    id: 1,
    title: "Nilansu Publication Collection",
    description: "Explore the complete and exclusive collection of Nilansu Publication.",
    buttonText: "Explore Category",
    link: "/publication/nilansu-publication",
    bg: "bg-primary/5 dark:bg-transparent",
    glow1: "bg-primary/30",
    glow2: "bg-primary/20"
  },
  {
    id: 2,
    title: "Nil Publication Titles",
    description: "Discover the latest releases and bestsellers from Nil Publication.",
    buttonText: "Explore Category",
    link: "/publication/nil-publication",
    bg: "bg-blue-500/5 dark:bg-transparent",
    glow1: "bg-blue-500/30",
    glow2: "bg-blue-500/20"
  },
  {
    id: 3,
    title: "Academic & Textbooks",
    description: "Find the essential reading for your courses with our extensive educational catalogue.",
    buttonText: "Explore Category",
    link: "/category/bengali-textbook",
    bg: "bg-purple-500/5 dark:bg-transparent",
    glow1: "bg-purple-500/30",
    glow2: "bg-purple-500/20"
  },
  {
    id: 4,
    title: "Dive into Breathtaking Fiction",
    description: "Lose yourself in worlds of fantasy, mystery, and romance.",
    buttonText: "Explore Category",
    link: "/category/fiction",
    bg: "bg-emerald-500/5 dark:bg-transparent",
    glow1: "bg-emerald-500/30",
    glow2: "bg-emerald-500/20"
  },
  {
    id: 5,
    title: "Children's Books to Spark Imagination",
    description: "Delightful stories and colorful illustrations for the little ones.",
    buttonText: "Explore Category",
    link: "/category/children",
    bg: "bg-orange-500/5 dark:bg-transparent",
    glow1: "bg-orange-500/30",
    glow2: "bg-orange-500/20"
  }
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden h-[400px] md:h-[500px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 flex flex-col items-center justify-center text-center px-4 ${slides[current].bg}`}
        >
          {/* Premium Dark Mode Gradient Background */}
          <div className="absolute inset-0 hidden dark:block opacity-40">
             <div className={`absolute -top-[30%] -left-[10%] w-[70%] h-[70%] ${slides[current].glow1} rounded-full blur-[120px] mix-blend-screen`}></div>
             <div className={`absolute top-[40%] -right-[10%] w-[60%] h-[60%] ${slides[current].glow2} rounded-full blur-[100px] mix-blend-screen`}></div>
          </div>
          
          <div className="container mx-auto relative z-10 flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-textPrimary mb-6 max-w-4xl leading-tight drop-shadow-sm">
              {slides[current].title}
            </h1>
            <p className="text-lg md:text-xl text-textSecondary mb-8 max-w-2xl font-medium">
              {slides[current].description}
            </p>
            <Link to={slides[current].link} className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 shadow-lg hover:shadow-primary/30">
              {slides[current].buttonText} <ArrowRight size={20} />
            </Link>
          </div>
          {/* Decorative Background Elements (Light mode) */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none dark:hidden">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute top-40 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Slider Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full transition-colors ${current === idx ? 'bg-primary' : 'bg-primary/20 hover:bg-primary/50'}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ cat }: any) {
  return (
    <Link 
      to={`/category/${cat.slug}`}
      className="bg-surface border border-divider shadow-sm rounded-xl hover:border-primary/50 hover:shadow-lg transition-all group flex flex-col overflow-hidden"
    >
      {cat.image_path ? (
        <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-muted">
          <img 
            src={cat.image_path} 
            alt={cat.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-500">
          <BookOpen size={48} />
        </div>
      )}
      <div className="p-5 flex-grow flex flex-col items-center justify-center text-center">
        <h3 className="font-bold text-textPrimary group-hover:text-primary transition-colors leading-tight mb-2">{cat.name}</h3>
      </div>
    </Link>
  );
}
