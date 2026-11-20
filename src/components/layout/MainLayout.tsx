import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GlobalSearchDialog } from '@/components/shared/GlobalSearchDialog';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#171717] font-serif">
      <Sidebar />
      <TopBar onSearchClick={() => setIsSearchOpen(true)} />
      <main className="ml-64 pt-16 min-h-screen p-6 overflow-y-auto">
        <div className="w-full max-w-[1920px] mx-auto space-y-6">
          {children}
        </div>
      </main>
      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
