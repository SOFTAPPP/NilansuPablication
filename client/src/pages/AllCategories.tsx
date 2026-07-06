import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { BookOpen, Layers } from 'lucide-react';
import { useIntersection } from '../hooks/useIntersection';

export default function AllCategories() {
  const {
    data: categoriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['categories'],
    queryFn: ({ pageParam = 0 }) => api.getCategories({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0
  });

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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center bg-primary/10 p-4 rounded-full text-primary mb-6">
          <Layers size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-textPrimary mb-4">All Categories</h1>
        <p className="text-textSecondary max-w-2xl mx-auto text-lg">Browse our extensive collection of books across various genres and disciplines.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : isError ? (
        <div className="text-center py-20">
          <p className="text-danger font-medium">Failed to load categories.</p>
          <p className="text-textSecondary text-sm mt-2">{(error as Error)?.message || 'Please try again later.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-[1400px] mx-auto">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
            {isFetchingNextPage && Array(6).fill(0).map((_, i) => (
              <div key={`skel-${i}`} className="h-[300px] bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div ref={setRef} className="h-4 w-full mt-4"></div>
        </>
      )}
    </div>
  );
}

function CategoryCard({ cat }: { cat: any }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link 
      to={`/category/${cat.slug}`}
      className="group bg-surface border border-divider shadow-sm rounded-xl hover:border-primary/50 hover:shadow-lg transition-all flex flex-col overflow-hidden"
    >
      {cat.image_path && !imgError ? (
        <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-muted">
          <img 
            src={cat.image_path} 
            alt={cat.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] flex items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-500">
          <BookOpen size={48} />
        </div>
      )}
      <div className="p-5 flex-grow flex items-center justify-center text-center">
        <h3 className="text-xl font-bold text-textPrimary group-hover:text-primary transition-colors">{cat.name}</h3>
      </div>
    </Link>
  );
}
