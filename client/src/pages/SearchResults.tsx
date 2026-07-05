import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIntersection } from '../hooks/useIntersection';
import { api } from '../utils/api';
import BookCard from '../components/BookCard';
import SkeletonCard from '../components/SkeletonCard';
import { Search } from 'lucide-react';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam = 0 }) => api.getBooks({ searchQuery: query, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0
  });

  // Background prefetch
  useEffect(() => {
    if (searchData?.pages.length === 1 && hasNextPage) {
      fetchNextPage();
    }
  }, [searchData, hasNextPage, fetchNextPage]);

  const { isIntersecting, setRef } = useIntersection();

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const results = searchData?.pages.flatMap(page => page.data) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary mb-2">Search Results</h1>
        <p className="text-textSecondary">
          {query ? (
            <span>Showing results for <span className="font-semibold text-textPrimary">"{query}"</span></span>
          ) : (
            <span>Showing all books</span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array(10).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((book: any, i: number) => <BookCard key={book.id} book={book} isPriority={i < 10} />)}
            {isFetchingNextPage && Array(5).fill(0).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </div>
          <div ref={setRef} className="h-4 w-full mt-4"></div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-primary/5 p-6 rounded-full mb-6 text-primary/50">
            <Search size={48} />
          </div>
          <h2 className="text-2xl font-bold text-textPrimary mb-2">No results found</h2>
          <p className="text-textSecondary max-w-md">We couldn't find any books matching "{query}". Try checking your spelling or use more general terms.</p>
        </div>
      )}
    </div>
  );
}
