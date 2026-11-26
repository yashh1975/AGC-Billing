import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  Eye,
  Search,
  Receipt,
  ShoppingCart,
  Landmark,
  Layers,
  Scale,
} from 'lucide-react';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useToast } from '@/hooks/useToast';

interface GeneratedReport {
  fileName: string;
  filePath: string;
  createdAt: string;
}

export function GstReportsPage() {
  const { activeYear, years } = useFinancialYear();
  const { toast } = useToast();

  const [selectedFyId, setSelectedFyId] = useState<number | undefined>(undefined);
  const [period, setPeriod] = useState<'full' | 'q1' | 'q2' | 'q3' | 'q4' | 'month' | 'custom'>('full');
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // April default
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ filePath: string; fileName: string } | null>(null);
  const [recentExports, setRecentExports] = useState<GeneratedReport[]>([]);

  // Raw database records
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [rawServices, setRawServices] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Preview tab state & search filter
  const [previewTab, setPreviewTab] = useState<'sales' | 'purchases' | 'services' | 'hsn' | 'taxSummary'>('sales');
  const [previewSearch, setPreviewSearch] = useState('');

  useEffect(() => {
    if (activeYear && !selectedFyId) {
      setSelectedFyId(activeYear.id);
    }
  }, [activeYear]);

  // Load raw records from SQLite
  const loadData = async () => {
    if (!selectedFyId) return;
    setIsLoadingData(true);
    try {
      const [salesRes, purchRes, servRes] = await Promise.all([
        window.api.db.salesInvoices.getAll({ fyId: selectedFyId }),
        window.api.db.dealerPurchases.getAll({ fyId: selectedFyId }),
        window.api.db.serviceInvoices.getAll({ fyId: selectedFyId }),
      ]);

      if (salesRes.success && salesRes.data) {
        setRawSales(salesRes.data.filter((s: any) => s.status !== 'cancelled'));
      }
      if (purchRes.success && purchRes.data) {
        setRawPurchases(purchRes.data.filter((p: any) => p.status !== 'cancelled'));
      }
      if (servRes.success && servRes.data) {
        setRawServices(servRes.data.filter((sv: any) => sv.status !== 'cancelled'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFyId]);

  // Date filtering helper
  const matchesPeriod = (dateStr: string): boolean => {
    if (!dateStr) return false;
    if (period === 'full') return true;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const m = d.getMonth() + 1; // 1 to 12

    if (period === 'q1') return m >= 4 && m <= 6;
    if (period === 'q2') return m >= 7 && m <= 9;
    if (period === 'q3') return m >= 10 && m <= 12;
    if (period === 'q4') return m >= 1 && m <= 3;
    if (period === 'month') return m === selectedMonth;
    if (period === 'custom') {
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;
      return true;
    }
    return true;
  };

  // Filtered lists
  const filteredSales = useMemo(() => {
    return rawSales.filter((s) => matchesPeriod(s.invoice_date));
  }, [rawSales, period, selectedMonth, fromDate, toDate]);

  const filteredPurchases = useMemo(() => {
    return rawPurchases.filter((p) => matchesPeriod(p.record_date));
  }, [rawPurchases, period, selectedMonth, fromDate, toDate]);

  const filteredServices = useMemo(() => {
    return rawServices.filter((sv) => matchesPeriod(sv.invoice_date));
  }, [rawServices, period, selectedMonth, fromDate, toDate]);

  // Summary statistics (in Rupees)
  const stats = useMemo(() => {
    let salesTaxable = 0;
    let salesCgst = 0;
    let salesSgst = 0;
    let salesIgst = 0;
    let salesTotal = 0;

    for (const s of filteredSales) {
      salesTaxable += (s.taxable_amount || s.taxable_value || 0) / 100;
      salesCgst += (s.cgst_amount || 0) / 100;
      salesSgst += (s.sgst_amount || 0) / 100;
      salesIgst += (s.igst_amount || 0) / 100;
      salesTotal += (s.grand_total || 0) / 100;
    }
    const salesTax = salesCgst + salesSgst + salesIgst;

    let serviceTaxable = 0;
    let serviceCgst = 0;
    let serviceSgst = 0;
    let serviceIgst = 0;
    let serviceTotal = 0;

    for (const sv of filteredServices) {
      serviceTaxable += (sv.taxable_amount || sv.taxable_value || 0) / 100;
      serviceCgst += (sv.cgst_amount || 0) / 100;
      serviceSgst += (sv.sgst_amount || 0) / 100;
      serviceIgst += (sv.igst_amount || 0) / 100;
      serviceTotal += (sv.grand_total || 0) / 100;
    }
    const serviceTax = serviceCgst + serviceSgst + serviceIgst;

    let purchaseTaxable = 0;
    let purchaseCgst = 0;
    let purchaseSgst = 0;
    let purchaseIgst = 0;
    let purchaseTotal = 0;

    for (const p of filteredPurchases) {
      purchaseTaxable += (p.taxable_amount || p.taxable_value || 0) / 100;
      purchaseCgst += (p.cgst_amount || 0) / 100;
      purchaseSgst += (p.sgst_amount || 0) / 100;
      purchaseIgst += (p.igst_amount || 0) / 100;
      purchaseTotal += (p.grand_total || 0) / 100;
    }
    const purchaseTax = purchaseCgst + purchaseSgst + purchaseIgst;

    const totalOutwardTax = salesTax + serviceTax;
    const totalInwardItc = purchaseTax;
    const netPayable = totalOutwardTax - totalInwardItc;

    return {
      salesTaxable,
      salesCgst,
      salesSgst,
      salesIgst,
      salesTax,
      salesTotal,
      serviceTaxable,
      serviceCgst,
      serviceSgst,
      serviceIgst,
      serviceTax,
      serviceTotal,
      purchaseTaxable,
      purchaseCgst,
      purchaseSgst,
      purchaseIgst,
      purchaseTax,
      purchaseTotal,
      totalOutwardTax,
      totalInwardItc,
      netPayable,
    };
  }, [filteredSales, filteredPurchases, filteredServices]);

  // HSN / SAC Summary aggregation
  const hsnSummaryData = useMemo(() => {
    return [
      {
        code: '7113',
        description: 'Articles of Jewellery and parts thereof of precious metal',
        type: 'Outward (Goods)',
        taxable: stats.salesTaxable,
        cgst: stats.salesCgst,
        sgst: stats.salesSgst,
        igst: stats.salesIgst,
        totalTax: stats.salesTax,
      },
      {
        code: '9971',
        description: 'Financial Services (Gold Loan Takeover, Re-pledging & Settlement)',
        type: 'Outward (Service)',
        taxable: stats.serviceTaxable,
        cgst: stats.serviceCgst,
        sgst: stats.serviceSgst,
        igst: stats.serviceIgst,
        totalTax: stats.serviceTax,
      },
      {
        code: '7108 / 7113',
        description: 'Bullion & Jewellery Inward Purchases (Eligible ITC)',
        type: 'Inward (ITC)',
        taxable: stats.purchaseTaxable,
        cgst: stats.purchaseCgst,
        sgst: stats.purchaseSgst,
        igst: stats.purchaseIgst,
        totalTax: stats.purchaseTax,
      },
    ];
  }, [stats]);

  // Search filtered items for active tab
  const searchedSales = useMemo(() => {
    if (!previewSearch.trim()) return filteredSales;
    const q = previewSearch.toLowerCase();
    return filteredSales.filter(
      (s) =>
        (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.customer_mobile && s.customer_mobile.includes(q))
    );
  }, [filteredSales, previewSearch]);

  const searchedPurchases = useMemo(() => {
    if (!previewSearch.trim()) return filteredPurchases;
    const q = previewSearch.toLowerCase();
    return filteredPurchases.filter(
      (p) =>
        (p.record_number && p.record_number.toLowerCase().includes(q)) ||
        (p.original_invoice_number && p.original_invoice_number.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
        (p.supplier_gstin && p.supplier_gstin.toLowerCase().includes(q))
    );
  }, [filteredPurchases, previewSearch]);

  const searchedServices = useMemo(() => {
    if (!previewSearch.trim()) return filteredServices;
    const q = previewSearch.toLowerCase();
    return filteredServices.filter(
      (sv) =>
        (sv.invoice_number && sv.invoice_number.toLowerCase().includes(q)) ||
        (sv.customer_name && sv.customer_name.toLowerCase().includes(q)) ||
        (sv.customer_mobile && sv.customer_mobile.includes(q))
    );
  }, [filteredServices, previewSearch]);

  // Trigger Master Excel Export
  const handleExport = async (type: 'all' | 'sales' | 'purchases' | 'services' | 'summary' | 'hsn' = 'all') => {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const res = await window.api.excel.exportReport({
        fyId: selectedFyId,
        period,
        month: period === 'month' ? selectedMonth : undefined,
        fromDate: period === 'custom' ? fromDate : undefined,
        toDate: period === 'custom' ? toDate : undefined,
        type,
      });

      if (res.success && res.data) {
        setExportSuccess(res.data);
        setRecentExports((prev) => [
          {
            fileName: res.data.fileName,
            filePath: res.data.filePath,
            createdAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
        toast({
          title: 'Excel Master Report Generated',
          description: `Saved to ${res.data.fileName}`,
        });
      } else {
        toast({
          title: 'Export Failed',
          description: res.error || 'Failed to generate Excel report',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Export Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenFile = async (path: string) => {
    const res = await window.api.files.openFile(path);
    if (res && !res.success) {
      toast({
        title: 'Unable to open file',
        description: res.error || 'Failed to open file in system viewer.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenFolder = async (path: string) => {
    const res = await window.api.files.openFolder(path);
    if (res && !res.success) {
      toast({
        title: 'Unable to open folder',
        description: res.error || 'Failed to locate folder.',
        variant: 'destructive',
      });
    }
  };

  const formatCurr = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#171717] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C49A35]" />
            GST Reports & CA Filing Preparation
          </h1>
        </div>
      </div>

      {/* Period & Filter Control Card */}
      <Card className="p-5 border-[#E7E2D7] bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-[#171717]">Select Filing Period</h2>
            <p className="text-[11px] text-gray-500">Choose the financial year and reporting timeframe</p>
          </div>

          {/* FY Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Financial Year:</span>
            <select
              value={selectedFyId || ''}
              onChange={(e) => setSelectedFyId(Number(e.target.value))}
              className="h-8 px-3 text-xs bg-[#F8F2E4] border border-[#E7E2D7] rounded-md font-semibold text-[#A98226] focus:outline-none focus:ring-1 focus:ring-[#C49A35] cursor-pointer"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  FY {y.name} {y.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period Selection Buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPeriod('full')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'full'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Full Financial Year
            </button>
            <button
              onClick={() => setPeriod('q1')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'q1'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Q1 (Apr - Jun)
            </button>
            <button
              onClick={() => setPeriod('q2')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'q2'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Q2 (Jul - Sep)
            </button>
            <button
              onClick={() => setPeriod('q3')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'q3'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Q3 (Oct - Dec)
            </button>
            <button
              onClick={() => setPeriod('q4')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'q4'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Q4 (Jan - Mar)
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'month'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Specific Month
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                period === 'custom'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Conditional Month Selector */}
          {period === 'month' && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-gray-500 font-medium">Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-8 px-3 text-xs bg-[#F8F2E4] border border-[#E7E2D7] rounded-md font-medium text-[#171717] cursor-pointer"
              >
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
              </select>
            </div>
          )}

          {/* Conditional Custom Date Range */}
          {period === 'custom' && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 text-xs bg-[#F8F2E4] border-[#E7E2D7] w-36"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 text-xs bg-[#F8F2E4] border-[#E7E2D7] w-36"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Estimated Tax Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outward Output Tax */}
        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Outward Output Tax</span>
            <ArrowUpRight className="w-4 h-4 text-[#A98226]" />
          </div>
          <p className="text-2xl font-bold text-[#171717] mt-1">
            ₹{formatCurr(stats.totalOutwardTax)}
          </p>
          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5 border-t border-gray-100 pt-1.5">
            <div className="flex justify-between">
              <span>Sales Tax (3%):</span>
              <span className="font-mono">₹{formatCurr(stats.salesTax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Financial Services Tax (18%):</span>
              <span className="font-mono">₹{formatCurr(stats.serviceTax)}</span>
            </div>
          </div>
        </Card>

        {/* Inward Tax (ITC) */}
        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Inward Input Tax (ITC)</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            ₹{formatCurr(stats.totalInwardItc)}
          </p>
          <div className="text-[11px] text-gray-500 mt-2 space-y-0.5 border-t border-gray-100 pt-1.5">
            <div className="flex justify-between">
              <span>Dealer Purchases:</span>
              <span className="font-mono">₹{formatCurr(stats.purchaseTaxable)}</span>
            </div>
            <div className="flex justify-between">
              <span>Eligible ITC:</span>
              <span className="font-mono text-emerald-700 font-semibold">₹{formatCurr(stats.purchaseTax)}</span>
            </div>
          </div>
        </Card>

        {/* Net Tax Position */}
        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Net Estimated Position</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                stats.netPayable >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {stats.netPayable >= 0 ? 'Net Payable' : 'Credit Carryforward'}
            </span>
          </div>
          <p
            className={`text-2xl font-bold mt-1 ${
              stats.netPayable >= 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}
          >
            ₹{formatCurr(Math.abs(stats.netPayable))}
          </p>
          <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 pt-1.5">
            Output Tax (₹{formatCurr(stats.totalOutwardTax)}) - ITC (₹{formatCurr(stats.totalInwardItc)})
          </p>
        </Card>
      </div>

      {/* Main Master Export Action Box */}
      <Card className="p-6 border-2 border-[#C49A35] bg-gradient-to-r from-[#171717] to-[#262626] text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#C49A35]" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Complete GST Master Workbook (.xlsx)
              </h2>
            </div>
            <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
              Export all 5 registers in one audit-ready Excel workbook: Sales Register, Dealer Purchases, Financial Services Register (SAC 9971), HSN/SAC Summary, and CA Tax Reconciliation with verified GSTIN (29ACKFA4620Q1ZV) and Excel formulas.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => handleExport('all')}
            disabled={isExporting}
            className="bg-[#C49A35] hover:bg-[#A98226] text-[#171717] font-bold text-xs px-6 shrink-0 shadow-lg cursor-pointer flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Master Excel...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Complete Master Report (.xlsx)
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Live Working Register Preview */}
      <Card className="border-[#E7E2D7] bg-white shadow-xs overflow-hidden">
        {/* Preview Header & Tabs */}
        <div className="p-4 border-b border-[#E7E2D7] bg-[#F8F2E4]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#C49A35]" />
              Live Working Register Preview
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Live transaction ledger for the selected timeframe — verify all figures before export
            </p>
          </div>

          {/* Tab Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPreviewTab('sales')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'sales'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Sales ({filteredSales.length})
            </button>

            <button
              onClick={() => setPreviewTab('purchases')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'purchases'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-blue-50 text-blue-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Dealer Purchases ({filteredPurchases.length})
            </button>

            <button
              onClick={() => setPreviewTab('services')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'services'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-emerald-50 text-emerald-800'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Financial Services ({filteredServices.length})
            </button>

            <button
              onClick={() => setPreviewTab('hsn')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'hsn'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-purple-50 text-purple-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              HSN / SAC Summary
            </button>

            <button
              onClick={() => setPreviewTab('taxSummary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewTab === 'taxSummary'
                  ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                  : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-amber-50 text-amber-800'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Tax Liability & ITC
            </button>
          </div>
        </div>

        {/* Filter / Search Bar within preview */}
        {previewTab !== 'hsn' && previewTab !== 'taxSummary' && (
          <div className="px-4 py-2.5 border-b border-[#E7E2D7] bg-white flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <Input
                placeholder="Search by invoice #, party, mobile, or GSTIN..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-[#F8F2E4]/30 border-[#E7E2D7]"
              />
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Showing filtered records for active period
            </span>
          </div>
        )}

        {/* TAB 1: SALES REGISTER PREVIEW */}
        {previewTab === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[850px]">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-2.5 w-12 text-center font-bold">#</th>
                  <th className="p-2.5 w-24 font-bold">Date</th>
                  <th className="p-2.5 w-32 font-bold">Invoice #</th>
                  <th className="p-2.5 min-w-[160px] font-bold">Customer Name</th>
                  <th className="p-2.5 w-24 text-center font-bold">Supply</th>
                  <th className="p-2.5 w-28 text-right font-bold">Taxable (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">CGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">SGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">IGST (₹)</th>
                  <th className="p-2.5 w-28 text-right font-bold">Grand Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {searchedSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                      No sales invoices found for the selected period.
                    </td>
                  </tr>
                ) : (
                  searchedSales.map((s, idx) => {
                    const taxable = (s.taxable_amount || s.taxable_value || 0) / 100;
                    const cgst = (s.cgst_amount || 0) / 100;
                    const sgst = (s.sgst_amount || 0) / 100;
                    const igst = (s.igst_amount || 0) / 100;
                    const total = (s.grand_total || 0) / 100;

                    return (
                      <tr key={s.id || idx} className="hover:bg-[#F8F2E4]/20 transition-colors">
                        <td className="p-2.5 text-center text-gray-500">{idx + 1}</td>
                        <td className="p-2.5 whitespace-nowrap">{s.invoice_date}</td>
                        <td className="p-2.5 font-bold font-mono text-[#A98226] whitespace-nowrap">
                          {s.invoice_number}
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-[#171717] block uppercase">{s.customer_name || 'Retail Customer'}</span>
                          {s.customer_mobile && <span className="text-[10px] text-gray-400 block">{s.customer_mobile}</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase border-gray-300">
                            {s.supply_type || 'intra'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-medium">{formatCurr(taxable)}</td>
                        <td className="p-2.5 text-right text-gray-600">{cgst > 0 ? formatCurr(cgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{sgst > 0 ? formatCurr(sgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{igst > 0 ? formatCurr(igst) : '—'}</td>
                        <td className="p-2.5 text-right font-bold text-[#171717]">{formatCurr(total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {searchedSales.length > 0 && (
                <tfoot className="bg-[#F8F2E4] border-t-2 border-[#171717] font-bold text-[#171717]">
                  <tr>
                    <td colSpan={5} className="p-2.5 uppercase tracking-wide">
                      Sales Total ({searchedSales.length} Invoices)
                    </td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.salesTaxable)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.salesCgst)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.salesSgst)}</td>
                    <td className="p-2.5 text-right">{stats.salesIgst > 0 ? `₹${formatCurr(stats.salesIgst)}` : '—'}</td>
                    <td className="p-2.5 text-right text-base text-[#A98226]">₹{formatCurr(stats.salesTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 2: DEALER PURCHASES PREVIEW */}
        {previewTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[850px]">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-2.5 w-12 text-center font-bold">#</th>
                  <th className="p-2.5 w-24 font-bold">Record Date</th>
                  <th className="p-2.5 w-32 font-bold">Dealer Bill #</th>
                  <th className="p-2.5 min-w-[160px] font-bold">Dealer / Supplier</th>
                  <th className="p-2.5 w-32 font-mono font-bold">Dealer GSTIN</th>
                  <th className="p-2.5 w-28 text-right font-bold">Taxable (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">CGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">SGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">IGST (₹)</th>
                  <th className="p-2.5 w-28 text-right font-bold">Total ITC (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {searchedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                      No dealer purchase records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  searchedPurchases.map((p, idx) => {
                    const taxable = (p.taxable_amount || p.taxable_value || 0) / 100;
                    const cgst = (p.cgst_amount || 0) / 100;
                    const sgst = (p.sgst_amount || 0) / 100;
                    const igst = (p.igst_amount || 0) / 100;
                    const itc = cgst + sgst + igst;

                    return (
                      <tr key={p.id || idx} className="hover:bg-blue-50/20 transition-colors">
                        <td className="p-2.5 text-center text-gray-500">{idx + 1}</td>
                        <td className="p-2.5 whitespace-nowrap">{p.record_date}</td>
                        <td className="p-2.5 font-bold font-mono text-blue-700 whitespace-nowrap">
                          {p.original_invoice_number || p.record_number}
                        </td>
                        <td className="p-2.5 font-semibold text-[#171717] uppercase">
                          {p.supplier_name || 'Registered Dealer'}
                        </td>
                        <td className="p-2.5 font-mono text-gray-600">{p.supplier_gstin || '—'}</td>
                        <td className="p-2.5 text-right font-medium">{formatCurr(taxable)}</td>
                        <td className="p-2.5 text-right text-gray-600">{cgst > 0 ? formatCurr(cgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{sgst > 0 ? formatCurr(sgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{igst > 0 ? formatCurr(igst) : '—'}</td>
                        <td className="p-2.5 text-right font-bold text-blue-700">{formatCurr(itc)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {searchedPurchases.length > 0 && (
                <tfoot className="bg-[#F8F2E4] border-t-2 border-[#171717] font-bold text-[#171717]">
                  <tr>
                    <td colSpan={5} className="p-2.5 uppercase tracking-wide">
                      Purchase Total ({searchedPurchases.length} Records)
                    </td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.purchaseTaxable)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.purchaseCgst)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.purchaseSgst)}</td>
                    <td className="p-2.5 text-right">{stats.purchaseIgst > 0 ? `₹${formatCurr(stats.purchaseIgst)}` : '—'}</td>
                    <td className="p-2.5 text-right text-base text-blue-700">₹{formatCurr(stats.purchaseTax)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 3: FINANCIAL SERVICES PREVIEW */}
        {previewTab === 'services' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[850px]">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-2.5 w-12 text-center font-bold">#</th>
                  <th className="p-2.5 w-24 font-bold">Date</th>
                  <th className="p-2.5 w-32 font-bold">Service Inv #</th>
                  <th className="p-2.5 min-w-[160px] font-bold">Customer Name</th>
                  <th className="p-2.5 w-20 text-center font-mono font-bold">SAC</th>
                  <th className="p-2.5 w-28 text-right font-bold">Taxable (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">CGST 9% (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">SGST 9% (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">IGST 18% (₹)</th>
                  <th className="p-2.5 w-28 text-right font-bold">Grand Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {searchedServices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500 italic">
                      No financial service invoices found for the selected period.
                    </td>
                  </tr>
                ) : (
                  searchedServices.map((sv, idx) => {
                    const taxable = (sv.taxable_amount || sv.taxable_value || 0) / 100;
                    const cgst = (sv.cgst_amount || 0) / 100;
                    const sgst = (sv.sgst_amount || 0) / 100;
                    const igst = (sv.igst_amount || 0) / 100;
                    const total = (sv.grand_total || 0) / 100;

                    return (
                      <tr key={sv.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-2.5 text-center text-gray-500">{idx + 1}</td>
                        <td className="p-2.5 whitespace-nowrap">{sv.invoice_date}</td>
                        <td className="p-2.5 font-bold font-mono text-emerald-800 whitespace-nowrap">
                          {sv.invoice_number}
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-[#171717] block uppercase">{sv.customer_name || 'Client'}</span>
                          {sv.customer_mobile && <span className="text-[10px] text-gray-400 block">{sv.customer_mobile}</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold text-emerald-800">9971</td>
                        <td className="p-2.5 text-right font-medium">{formatCurr(taxable)}</td>
                        <td className="p-2.5 text-right text-gray-600">{cgst > 0 ? formatCurr(cgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{sgst > 0 ? formatCurr(sgst) : '—'}</td>
                        <td className="p-2.5 text-right text-gray-600">{igst > 0 ? formatCurr(igst) : '—'}</td>
                        <td className="p-2.5 text-right font-bold text-[#171717]">{formatCurr(total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {searchedServices.length > 0 && (
                <tfoot className="bg-[#F8F2E4] border-t-2 border-[#171717] font-bold text-[#171717]">
                  <tr>
                    <td colSpan={5} className="p-2.5 uppercase tracking-wide">
                      Financial Services Total ({searchedServices.length} Invoices)
                    </td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.serviceTaxable)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.serviceCgst)}</td>
                    <td className="p-2.5 text-right">₹{formatCurr(stats.serviceSgst)}</td>
                    <td className="p-2.5 text-right">{stats.serviceIgst > 0 ? `₹${formatCurr(stats.serviceIgst)}` : '—'}</td>
                    <td className="p-2.5 text-right text-base text-emerald-800">₹{formatCurr(stats.serviceTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 4: HSN / SAC SUMMARY */}
        {previewTab === 'hsn' && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-xs text-left border border-[#E7E2D7]">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-2.5 w-24 font-bold">HSN / SAC</th>
                  <th className="p-2.5 min-w-[220px] font-bold">Description</th>
                  <th className="p-2.5 w-28 text-center font-bold">Supply Nature</th>
                  <th className="p-2.5 w-32 text-right font-bold">Taxable Value (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">CGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">SGST (₹)</th>
                  <th className="p-2.5 w-24 text-right font-bold">IGST (₹)</th>
                  <th className="p-2.5 w-28 text-right font-bold">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {hsnSummaryData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F2E4]/20 transition-colors">
                    <td className="p-2.5 font-bold font-mono text-[#A98226]">{row.code}</td>
                    <td className="p-2.5 font-medium text-[#171717]">{row.description}</td>
                    <td className="p-2.5 text-center">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase">
                        {row.type}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-medium">{formatCurr(row.taxable)}</td>
                    <td className="p-2.5 text-right text-gray-600">{row.cgst > 0 ? formatCurr(row.cgst) : '—'}</td>
                    <td className="p-2.5 text-right text-gray-600">{row.sgst > 0 ? formatCurr(row.sgst) : '—'}</td>
                    <td className="p-2.5 text-right text-gray-600">{row.igst > 0 ? formatCurr(row.igst) : '—'}</td>
                    <td className="p-2.5 text-right font-bold text-[#171717]">{formatCurr(row.totalTax)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F8F2E4] border-t-2 border-[#171717] font-bold text-[#171717]">
                <tr>
                  <td colSpan={3} className="p-2.5 uppercase tracking-wide">
                    Total Outward Supplies (Goods + Services)
                  </td>
                  <td className="p-2.5 text-right">₹{formatCurr(stats.salesTaxable + stats.serviceTaxable)}</td>
                  <td className="p-2.5 text-right">₹{formatCurr(stats.salesCgst + stats.serviceCgst)}</td>
                  <td className="p-2.5 text-right">₹{formatCurr(stats.salesSgst + stats.serviceSgst)}</td>
                  <td className="p-2.5 text-right">
                    {stats.salesIgst + stats.serviceIgst > 0 ? `₹${formatCurr(stats.salesIgst + stats.serviceIgst)}` : '—'}
                  </td>
                  <td className="p-2.5 text-right text-base text-[#A98226]">
                    ₹{formatCurr(stats.totalOutwardTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 5: TAX LIABILITY & ITC RECONCILIATION */}
        {previewTab === 'taxSummary' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Outward Tax Breakdown */}
              <div className="border border-[#E7E2D7] rounded-lg p-4 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-[#A98226]" />
                  A. Outward Tax Liability (Sales & Services)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Gold Sales Taxable Value (3% GST):</span>
                    <span className="font-semibold">₹{formatCurr(stats.salesTaxable)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Financial Services Taxable (18% GST - SAC 9971):</span>
                    <span className="font-semibold">₹{formatCurr(stats.serviceTaxable)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">CGST Collected:</span>
                    <span className="font-medium">₹{formatCurr(stats.salesCgst + stats.serviceCgst)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">SGST Collected:</span>
                    <span className="font-medium">₹{formatCurr(stats.salesSgst + stats.serviceSgst)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pt-2 border-t-2 border-[#171717] font-bold text-[#171717]">
                    <span>Total Output Tax Payable:</span>
                    <span className="text-[#A98226] text-sm">₹{formatCurr(stats.totalOutwardTax)}</span>
                  </div>
                </div>
              </div>

              {/* Inward ITC Breakdown */}
              <div className="border border-[#E7E2D7] rounded-lg p-4 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  B. Input Tax Credit (ITC - Dealer Purchases)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Total Dealer Purchases Value:</span>
                    <span className="font-semibold">₹{formatCurr(stats.purchaseTaxable)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">CGST Input Credit:</span>
                    <span className="font-medium">₹{formatCurr(stats.purchaseCgst)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">SGST Input Credit:</span>
                    <span className="font-medium">₹{formatCurr(stats.purchaseSgst)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">IGST Input Credit:</span>
                    <span className="font-medium">₹{formatCurr(stats.purchaseIgst)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 pt-2 border-t-2 border-[#171717] font-bold text-[#171717]">
                    <span>Total Eligible ITC:</span>
                    <span className="text-blue-700 text-sm">₹{formatCurr(stats.totalInwardItc)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Position Banner */}
            <div className={`p-4 rounded-lg border flex items-center justify-between ${
              stats.netPayable >= 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-emerald-50/70 border-emerald-300'
            }`}>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#171717] block">
                  C. Net GST Filing Position (Output Tax - Inward ITC)
                </span>
                <span className="text-[11px] text-gray-500">
                  {stats.netPayable >= 0
                    ? 'Estimated net cash liability to be remitted via Challan (PMT-06)'
                    : 'Input tax credit available for carryforward to next tax period'}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xl font-black ${stats.netPayable >= 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                  ₹{formatCurr(Math.abs(stats.netPayable))}
                </span>
                <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                  {stats.netPayable >= 0 ? 'Net Tax Payable' : 'ITC Credit Carryforward'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Generated File Success Dialog / Notification */}
      {exportSuccess && (
        <Card className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">
                Successfully Exported: {exportSuccess.fileName}
              </p>
              <p className="text-[11px] text-emerald-700 truncate max-w-lg">
                Location: {exportSuccess.filePath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => handleOpenFile(exportSuccess.filePath)}
              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
            >
              Open in Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenFolder(exportSuccess.filePath)}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              Show in Folder
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Exports Log */}
      {recentExports.length > 0 && (
        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-3">
            <Clock className="w-4 h-4 text-[#C49A35]" />
            <span>Recent Exports in This Session</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {recentExports.map((rep, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-[#171717]">{rep.fileName}</span>
                  <span className="text-[10px] text-gray-400">({rep.createdAt})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenFile(rep.filePath)}
                    className="h-7 text-[11px] text-[#A98226] hover:bg-[#F8F2E4] cursor-pointer"
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenFolder(rep.filePath)}
                    className="h-7 text-[11px] text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    Folder
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}