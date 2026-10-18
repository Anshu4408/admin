import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 sm:p-12 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/50">
      <div className="p-3.5 mb-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-semibold text-neutral-100 mb-1">{title}</h4>
      <p className="text-xs text-neutral-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
