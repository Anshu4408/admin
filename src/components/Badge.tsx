import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky' | 'slate' | 'violet';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'sm' }) => {
  const variantClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    violet: 'bg-purple-50 text-purple-700 border-purple-200/80',
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 font-medium rounded-full border',
    md: 'text-sm px-3 py-1 font-medium rounded-full border',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase() || '';
  if (s === 'paid' || s === 'success') {
    return (
      <Badge variant="emerald">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {status}
      </Badge>
    );
  }
  if (s === 'processing') {
    return (
      <Badge variant="amber">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
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
