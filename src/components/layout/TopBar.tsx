import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { Search, Calendar, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  onSearchClick?: () => void;
}

export function TopBar({ onSearchClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const { activeYear, years, fetchYears, setActiveYear } = useFinancialYear();
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    fetchYears();
    const now = new Date();
    setCurrentDateStr(
      now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );
  }, [fetchYears]);

  const handleFyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value, 10);
    if (!isNaN(id)) {
      await setActiveYear(id);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E7E2D7] fixed top-0 right-0 left-64 z-20 px-3 sm:px-5 flex items-center justify-between font-serif gap-2 sm:gap-4 overflow-hidden">
      {/* Global Search Bar Input */}
      <div className="flex-1 max-w-xs sm:max-w-sm min-w-0">
        <button
          type="button"
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 text-xs text-gray-500 bg-[#F8F2E4] border border-[#E7E2D7] rounded-md hover:border-[#C49A35] transition-colors cursor-pointer truncate"
        >
          <span className="flex items-center gap-1.5 sm:gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate hidden sm:inline">Search invoices, customers, suppliers...</span>
            <span className="truncate sm:hidden">Search...</span>
          </span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white border border-[#E7E2D7] rounded shadow-xs text-gray-600 font-mono shrink-0 ml-2">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0 min-w-0">
        {/* Financial Year Selector */}
        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <span className="text-gray-500 font-medium hidden sm:inline">FY:</span>
          <select
            value={activeYear?.id || ''}
            onChange={handleFyChange}
            className="h-8 px-2 py-1 text-xs bg-[#F8F2E4] border border-[#E7E2D7] rounded-md font-semibold text-[#A98226] focus:outline-none focus:ring-1 focus:ring-[#C49A35] cursor-pointer max-w-[130px] sm:max-w-none truncate"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                FY {y.name} {y.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Current Date (Shown on wide screens, non-wrapping to prevent header crowding) */}
        <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-gray-700 border-l border-[#E7E2D7] pl-3 whitespace-nowrap shrink-0 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[#C49A35] shrink-0" />
          <span className="whitespace-nowrap">{currentDateStr}</span>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 border-l border-[#E7E2D7] pl-2 sm:pl-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F8F2E4] border border-[#C49A35] flex items-center justify-center text-[#A98226] shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-semibold text-[#171717] leading-tight truncate max-w-[100px]">
                {user?.displayName || user?.username || 'Admin'}
              </span>
              <span className="text-[10px] text-gray-500 uppercase leading-none mt-0.5">
                {user?.role || 'Administrator'}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Log Out"
            className="text-gray-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
