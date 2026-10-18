import React from 'react';

interface NavbarProps { title: string; subtitle?: string; actions?: React.ReactNode; }

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, actions }) => (
  <header className="border-b border-neutral-800 bg-neutral-950 px-4 py-5 sm:px-6 lg:sticky lg:top-0 lg:z-30 lg:px-8">
    <div className="mx-auto flex max-w-[1536px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0"><h1 className="text-lg font-medium tracking-tight text-neutral-100 sm:text-xl">{title}</h1>{subtitle && <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-400">{subtitle}</p>}</div>
      {actions && <div className="admin-toolbar flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
);
