import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useIntersection } from '../hooks/useIntersection';

export default function Category() {
  const { categorySlug, publicationSlug } = useParams();
  const activeSlug = categorySlug || publicationSlug;
  const [categoryName, setCategoryName] = useState('');
  const [sortOption, setSortOption] = useState('trending');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const toggleFormat = (fmt: string) => {
    setSelectedFormats(prev => 
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    );
  };

  const {
    data: booksData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['books', categorySlug, publicationSlug, sortOption, inStockOnly, selectedFormats],
    queryFn: ({ pageParam = 0 }) => api.getBooks({ 
      category: categorySlug, 
      publication: publicationSlug, 
      cursor: pageParam,
      sort: sortOption,
      inStockOnly,
      formats: selectedFormats
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!activeSlug
  });

  // Background prefetch
  useEffect(() => {
    if (booksData?.pages.length === 1 && hasNextPage) {
      fetchNextPage();
    }
  }, [booksData, hasNextPage, fetchNextPage]);

  const { isIntersecting, setRef } = useIntersection();

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const books = booksData?.pages.flatMap(page => page.data) || [];

  useEffect(() => {
    if (books.length > 0) {
      if (publicationSlug) {
        setCategoryName(String(publicationSlug).replace(/-/g, ' '));
      } else {
        setCategoryName(books[0].category);
      }
    } else if (activeSlug) {
      setCategoryName(String(activeSlug).replace(/-/g, ' '));
    }
  }, [books, activeSlug, publicationSlug]);



  return (
    <div className="container mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary mb-2">{categoryName}</h1>
        <p className="text-textSecondary">Explore our collection of {categoryName} books.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0">
          {/* Mobile Filter Toggle */}
          <button 
            className="lg:hidden w-full bg-surface border border-divider shadow-sm p-4 rounded-xl flex items-center justify-between font-semibold text-textPrimary mb-4 transition-colors hover:bg-primary/5"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter size={20} />
              <span>Filters</span>
            </div>
            {isMobileFiltersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          <div className={`bg-surface rounded-2xl border border-divider shadow-sm p-6 lg:sticky lg:top-24 ${isMobileFiltersOpen ? 'block mb-6' : 'hidden lg:block'}`}>
            <div className="hidden lg:flex items-center gap-2 mb-6 text-textPrimary font-semibold">
              <Filter size={20} /> Filters
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Availability</h4>
                <label className="flex items-center gap-2 text-sm text-textSecondary cursor-pointer hover:text-primary">
                  <input 
                    type="checkbox" 
                    className="rounded text-primary focus:ring-primary" 
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  In Stock Only
                </label>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Format</h4>
                <div className="space-y-2">
                  {['Paperback', 'Hardcover', 'E-Book'].map(fmt => (
                    <label key={fmt} className="flex items-center gap-2 text-sm text-textSecondary cursor-pointer hover:text-primary">
                      <input 
                        type="checkbox" 
                        className="rounded text-primary focus:ring-primary"
                        checked={selectedFormats.includes(fmt)}
                        onChange={() => toggleFormat(fmt)}
                      />
                      {fmt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
            <span className="text-sm text-textSecondary">
              Showing {books.length} results
            </span>
            
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-surface border border-divider rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
            >
              <option value="trending">Trending</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : books.length > 0 ? (
              books.map((book: any, i: number) => <BookCard key={book.id} book={book} isPriority={i < 8} />)
            ) : (
              <div className="col-span-full text-center py-20 text-textSecondary">
                No books found in this category.
              </div>
            )}
            {isFetchingNextPage && Array(4).fill(0).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </div>
          <div ref={setRef} className="h-4 w-full mt-4"></div>
        </main>
      </div>
    </div>
  );
}
