import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Wrench,
  FileEdit,
  Users,
  Truck,
  FileText,
  BarChart3,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoUrl from '@/assets/logo/agc-logo-circular.png';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Dealer Purchase', to: '/dealer-purchase', icon: ShoppingCart },
  { name: 'Sales Billing', to: '/sales', icon: Receipt },
  { name: 'Service Billing', to: '/service', icon: Wrench },
  { name: 'Draft Bill', to: '/draft-bills', icon: FileEdit },
  { name: 'Customers', to: '/customers', icon: Users },
  { name: 'Suppliers', to: '/suppliers', icon: Truck },
  { name: 'All Bills', to: '/all-bills', icon: FileText },
  { name: 'GST Reports', to: '/gst-reports', icon: BarChart3 },
  { name: 'PDF Documents', to: '/documents', icon: FolderOpen },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#171717] text-white flex flex-col h-screen fixed left-0 top-0 z-30 select-none border-r border-[#2d2d2d] font-serif">
      {/* Brand & Logo Header */}
      <div className="p-4 flex items-center gap-3 border-b border-[#2d2d2d]">
        <div className="w-11 h-11 rounded-full border-2 border-[#C49A35] overflow-hidden bg-black shrink-0 flex items-center justify-center shadow-md">
          <img
            src={logoUrl}
            alt="AGC Logo"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-sm tracking-wider text-white uppercase truncate">
            Anjaneya Gold Co.
          </span>
          <span className="text-[11px] text-[#C49A35] tracking-wide font-medium">
            Billing & Management
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs tracking-wide transition-all font-medium',
                  isActive
                    ? 'bg-[#262626] text-[#C49A35] font-semibold border-l-4 border-[#C49A35] shadow-inner'
                    : 'text-gray-300 hover:bg-[#262626] hover:text-white'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#2d2d2d] text-center text-[10px] text-gray-500">
        <span>AGC Billing System v1.0</span>
      </div>
    </aside>
  );
}
