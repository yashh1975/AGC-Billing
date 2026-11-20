import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Receipt,
  ShoppingCart,
  Wrench,
  Users,
  Truck,
  ArrowRight,
  ExternalLink,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { InvoicePrintView } from './InvoicePrintView';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ type: 'sales' | 'purchase' | 'service'; data: any } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [open]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await window.api.search.global(text.trim());
        if (res.success && res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  };

  const handleSelect = async (item: any) => {
    if (item.category === 'customer') {
      onOpenChange(false);
      navigate(`/customers/${item.id}`);
    } else if (item.category === 'supplier') {
      onOpenChange(false);
      navigate(`/suppliers/${item.id}`);
    } else if (item.category === 'sales') {
      // Fetch full sales invoice and open preview modal
      const res = await window.api.db.salesInvoices.getById(item.id);
      if (res.success && res.data) {
        setSelectedInvoice({ type: 'sales', data: res.data });
      }
    } else if (item.category === 'purchase') {
      const res = await window.api.db.dealerPurchases.getById(item.id);
      if (res.success && res.data) {
        setSelectedInvoice({ type: 'purchase', data: res.data });
      }
    } else if (item.category === 'service') {
      const res = await window.api.db.serviceInvoices.getById(item.id);
      if (res.success && res.data) {
        setSelectedInvoice({ type: 'service', data: res.data });
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales':
        return <Receipt className="w-4 h-4 text-[#C49A35]" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'service':
        return <Wrench className="w-4 h-4 text-emerald-600" />;
      case 'customer':
        return <Users className="w-4 h-4 text-amber-700" />;
      case 'supplier':
        return <Truck className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'sales':
        return <Badge className="bg-[#F8F2E4] text-[#A98226] border-[#E7E2D7] text-[10px]">Sales Bill</Badge>;
      case 'purchase':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Purchase Bill</Badge>;
      case 'service':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Service Bill</Badge>;
      case 'customer':
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Customer</Badge>;
      case 'supplier':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Supplier</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden font-serif border-[#E7E2D7] shadow-2xl">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-sm font-semibold text-gray-500">
              Universal Search
            </DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className="p-4 border-b border-[#E7E2D7] relative">
            <Search className="w-4 h-4 absolute left-7 top-7 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type invoice #, party name, phone, GSTIN, or reference..."
              className="pl-9 h-11 text-sm bg-[#F8F2E4] border-[#E7E2D7] focus-visible:ring-[#C49A35] rounded-lg"
              autoFocus
            />
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-gray-100">
            {isLoading && (
              <div className="p-6 text-center text-xs text-gray-500">Searching master database...</div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                No matching records found for "{query}".
              </div>
            )}

            {!isLoading && !query && (
              <div className="p-6 text-center text-xs text-gray-400">
                Quickly search across Sales, Dealer Purchases, Service Invoices, Customers, and Suppliers.
              </div>
            )}

            {results.map((item, idx) => (
              <div
                key={`${item.category}-${item.id}-${idx}`}
                onClick={() => handleSelect(item)}
                className="p-3 hover:bg-[#F8F2E4]/60 cursor-pointer rounded-md flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#E7E2D7] flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#171717]">{item.title}</span>
                      {getCategoryBadge(item.category)}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.date && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#C49A35] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Print & Preview Modal */}
      {selectedInvoice && (
        <InvoicePrintView
          open={!!selectedInvoice}
          onOpenChange={(v) => !v && setSelectedInvoice(null)}
          type={selectedInvoice.type}
          record={selectedInvoice.data}
        />
      )}
    </>
  );
}
