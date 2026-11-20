import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Receipt,
  ShoppingCart,
  Wrench,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import type { DashboardSummary } from '@/types/database';
import { useFinancialYear } from '@/hooks/useFinancialYear';

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeYear } = useFinancialYear();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const res = await window.api.db.dashboard.getSummary(activeYear?.id);
        if (res.success && res.data) {
          setSummary(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [activeYear?.id]);

  const formatCurrency = (paise: number) => {
    const rupees = (paise || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(rupees);
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight">
            Billing & Operations Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time business summary for Financial Year{' '}
            <span className="font-semibold text-[#A98226]">
              {activeYear ? `FY ${activeYear.name}` : 'Current'}
            </span>
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/sales')}
            className="text-xs flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            Sales Billing
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dealer-purchase')}
            className="text-xs flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Dealer Purchase
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/service')}
            className="text-xs flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            Service Billing
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gst-reports')}
            className="text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            GST Reports
          </Button>
        </div>
      </div>

      {/* Primary Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <Card className="border-t-4 border-t-[#C49A35] shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Today's Sales</span>
              <Receipt className="w-4 h-4 text-[#C49A35]" />
            </div>
            <div className="text-xl font-bold text-[#171717] mt-1.5">
              {isLoading ? '...' : formatCurrency(summary?.todaySales || 0)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-0.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Month:</span>
                <span className="font-semibold">{formatCurrency(summary?.monthlySales || 0)}</span>
              </div>
              <div className="flex justify-between text-[#A98226]">
                <span className="font-medium">FY Total:</span>
                <span className="font-bold">{formatCurrency(summary?.yearlySales || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dealer Purchases Card */}
        <Card className="border-t-4 border-t-[#171717] shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Today's Purchases</span>
              <ShoppingCart className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-xl font-bold text-[#171717] mt-1.5">
              {isLoading ? '...' : formatCurrency(summary?.todayPurchases || 0)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-0.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Month:</span>
                <span className="font-semibold">{formatCurrency(summary?.monthlyPurchases || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-800">
                <span className="font-medium">FY Total:</span>
                <span className="font-bold">{formatCurrency(summary?.yearlyPurchases || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Card */}
        <Card className="border-t-4 border-t-[#A98226] shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Today's Services</span>
              <Wrench className="w-4 h-4 text-[#A98226]" />
            </div>
            <div className="text-xl font-bold text-[#171717] mt-1.5">
              {isLoading ? '...' : formatCurrency(summary?.todayServices || 0)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-0.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Month:</span>
                <span className="font-semibold">{formatCurrency(summary?.monthlyServices || 0)}</span>
              </div>
              <div className="flex justify-between text-[#A98226]">
                <span className="font-medium">FY Total:</span>
                <span className="font-bold">{formatCurrency(summary?.yearlyServices || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Receivables (Clickable to view Due Bills) */}
        <Card
          onClick={() => navigate('/all-bills?paymentStatus=due')}
          className="border-t-4 border-t-rose-600 shadow-xs cursor-pointer hover:shadow-md hover:border-rose-400 transition-all group"
          title="Click to view all bills with pending balance"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-rose-600 font-medium">
              <span>Outstanding Due</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1.5">
              {isLoading ? '...' : formatCurrency(summary?.outstandingAmount || 0)}
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-xs text-rose-600 font-semibold group-hover:underline">
              <span>View Due Bills</span>
              <span>→</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Annual Financial Year Performance Bar */}
      <Card className="bg-gradient-to-r from-[#F8F2E4] via-white to-[#F8F2E4] border-[#E7E2D7] shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2D7] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C49A35]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Financial Year Performance — {activeYear ? `FY ${activeYear.name}` : 'Current FY'}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Consolidated Year-to-Date Performance
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 p-3 rounded-md border border-[#E7E2D7]/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium block">
                  Yearly Sales
                </span>
                <span className="text-base font-bold text-[#A98226]">
                  {isLoading ? '...' : formatCurrency(summary?.yearlySales || 0)}
                </span>
              </div>
              <div className="p-2 rounded-full bg-[#F8F2E4] text-[#A98226]">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-md border border-[#E7E2D7]/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium block">
                  Yearly Purchases
                </span>
                <span className="text-base font-bold text-[#171717]">
                  {isLoading ? '...' : formatCurrency(summary?.yearlyPurchases || 0)}
                </span>
              </div>
              <div className="p-2 rounded-full bg-gray-100 text-gray-700">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-md border border-[#E7E2D7]/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium block">
                  Yearly Services
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {isLoading ? '...' : formatCurrency(summary?.yearlyServices || 0)}
                </span>
              </div>
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-700">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions & Quick Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C49A35]" />
              Recent Transactions
            </h2>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/all-bills')}
              className="text-xs p-0 h-auto"
            >
              View All Bills
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <Card className="shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                  <tr>
                    <th className="p-3">Doc #</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D7]">
                  {summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
                    summary.recentTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/40">
                        <td className="p-3 font-semibold text-[#171717]">
                          {tx.doc_number}
                        </td>
                        <td className="p-3 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              tx.type === 'sales'
                                ? 'bg-amber-100 text-amber-800'
                                : tx.type === 'purchase'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{tx.date}</td>
                        <td className="p-3 text-gray-800 font-medium">
                          {tx.party_name || 'N/A'}
                        </td>
                        <td className="p-3 text-right font-semibold text-[#171717]">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              tx.payment_status === 'paid'
                                ? 'success'
                                : tx.payment_status === 'partial'
                                ? 'warning'
                                : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            {tx.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <Layers className="w-8 h-8 text-gray-300" />
                          <p>No transactions recorded yet in this Financial Year.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/sales')}
                            className="text-xs mt-2"
                          >
                            Create First Sales Bill
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Directory & Overview Panel */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#171717] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C49A35]" />
            Business Directories
          </h2>

          <Card className="p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  Customer Directory
                </span>
                <span className="text-[11px] text-gray-500">
                  Manage GST & retail customer profiles
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/customers')}
                className="text-xs"
              >
                Open
              </Button>
            </div>

            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  Supplier Directory
                </span>
                <span className="text-[11px] text-gray-500">
                  Manage bullion dealers & vendors
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/suppliers')}
                className="text-xs"
              >
                Open
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  PDF Document Vault
                </span>
                <span className="text-[11px] text-gray-500">
                  Browse finalized PDFs by month
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/documents')}
                className="text-xs"
              >
                Open
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
