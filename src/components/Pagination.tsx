import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagination: { page: number; pages: number; total: number; limit: number };
  onPageChange: (page: number) => void;
  noun: string;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange, noun }) => {
  const { page, pages, total, limit } = pagination;
  if (!total) return null;
  const visiblePages = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter(value => value >= 1 && value <= pages).sort((a, b) => a - b);
  const buttonStyle = 'flex min-h-11 items-center justify-center gap-1 rounded-lg border border-neutral-800 px-3 py-2 text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-t border-neutral-800 p-4 text-xs font-medium text-neutral-400">
      <p>Showing <strong className="text-neutral-100">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</strong> of <strong className="text-neutral-100">{total}</strong> {noun}</p>
      <nav aria-label="Pagination" className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={buttonStyle}><ChevronLeft className="h-3.5 w-3.5 shrink-0" />Previous</button>
        <span aria-live="polite" className="sm:sr-only">{page} / {pages}</span>
        <div className="hidden flex-wrap items-center justify-center gap-1 sm:flex">
          {visiblePages.map((value, index) => (
            <React.Fragment key={value}>
              {index > 0 && value - visiblePages[index - 1] > 1 && <span className="px-1" aria-hidden="true">…</span>}
              <button type="button" onClick={() => onPageChange(value)} aria-label={`Page ${value}`} aria-current={value === page ? 'page' : undefined} className={`min-h-11 min-w-11 rounded-lg px-2 ${value === page ? 'bg-neutral-200 text-neutral-950' : 'hover:bg-neutral-800'}`}>{value}</button>
            </React.Fragment>
          ))}
        </div>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pages} className={buttonStyle}>Next<ChevronRight className="h-3.5 w-3.5 shrink-0" /></button>
      </nav>
    </div>
  );
};
