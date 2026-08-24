import React from 'react';
import { cn } from '../lib/utils';

/** Shimmering placeholder block for loading states. */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

/** Full-page skeleton for the staff portal first paint. */
export const StaffPortalSkeleton: React.FC = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading your workspace">
    {/* Header */}
    <div className="rounded-md border border-border bg-card p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="size-11 rounded-md shrink-0" />
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-9 w-28 shrink-0" />
    </div>

    {/* KPI row */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border rounded-md overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card p-3.5 space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>

    {/* Queue rows */}
    <div className="rounded-md border border-border bg-card divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="size-9 rounded-md shrink-0" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <Skeleton className="h-3.5 w-32 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>

    {/* Board cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  </div>
);
