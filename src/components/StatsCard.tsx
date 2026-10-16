import React from 'react';
import type { LucideIcon } from 'lucide-react';
interface StatsCardProps {
  title: string; value: string | number; subtitle?: string; icon: LucideIcon;
  trend?: string; trendPositive?: boolean; color?: 'teal' | 'indigo' | 'emerald' | 'amber' | 'violet';
}
export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, trend, trendPositive }) => (
  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-xs text-neutral-400">{title}</p><Icon className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.5} /></div>
    <p className="mt-5 text-3xl font-medium tracking-tight text-neutral-100 tabular-nums">{value}</p>
    {subtitle && <p className="mt-2 text-xs leading-relaxed text-neutral-400">{subtitle}</p>}
    {trend && <p className={`mt-4 border-t border-neutral-800 pt-3 text-xs ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{trend}</p>}
  </div>
);
