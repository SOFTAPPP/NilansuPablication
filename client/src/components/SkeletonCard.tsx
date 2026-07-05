import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-muted w-full" />
      <div className="p-4 space-y-3">
        <div className="w-16 h-4 bg-muted rounded" />
        <div className="w-full h-5 bg-muted rounded" />
        <div className="w-3/4 h-4 bg-muted rounded" />
        <div className="flex justify-between items-end mt-4">
          <div className="w-12 h-6 bg-muted rounded" />
          <div className="w-16 h-8 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}
