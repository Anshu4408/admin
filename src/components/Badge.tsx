import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky' | 'slate' | 'violet';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'sm' }) => {
  const variantClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
    slate: 'bg-neutral-800 text-neutral-200 border-neutral-800',
    violet: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 font-medium rounded-full border',
    md: 'text-sm px-3 py-1 font-medium rounded-full border',
  };

  return (
    <span data-badge className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap shrink-0 ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase() || '';
  if (s === 'paid' || s === 'success') {
    return (
      <Badge variant="emerald">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {status}
      </Badge>
    );
  }
  if (s === 'processing') {
    return (
      <Badge variant="amber">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Processing
      </Badge>
    );
  }
  if (s === 'pending') {
    return (
      <Badge variant="amber">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {status}
      </Badge>
    );
  }
  if (s === 'reversed') {
    return <Badge variant="rose">Unpaid (reversed)</Badge>;
  }
  if (s === 'failed' || s === 'rejected') {
    return (
      <Badge variant="rose">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        {status}
      </Badge>
    );
  }
  return <Badge variant="slate">{status || 'Pending'}</Badge>;
};
