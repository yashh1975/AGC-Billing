import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  Receipt,
  ShoppingCart,
  Wrench,
  Printer,
  FileCheck,
  Share2,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { InvoicePrintView } from '@/components/shared/InvoicePrintView';
import { useToast } from '@/hooks/useToast';
import { generateInvoicePdf, formatRecordToPdfData } from '@/services/pdf/pdf-generator';
import { AGC_DEFAULT_LOGO_BASE64 } from '@/assets/logo/logo-base64';

export function AllBillsPage() {
  const { activeYear, years } = useFinancialYear();
  const { toast } = useToast();

  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sharingBillId, setSharingBillId] = useState<number | null>(null);

  const [searchParams] = useSearchParams();
  const initialPaymentStatus = searchParams.get('paymentStatus') || (searchParams.get('due') === 'true' ? 'due' : 'all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sales' | 'purchase' | 'service'>('all');
  const [selectedFyId, setSelectedFyId] = useState<number | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(initialPaymentStatus);
  const [docStatusFilter, setDocStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Sync if URL search params change
  useEffect(() => {
    const dueParam = searchParams.get('paymentStatus') || (searchParams.get('due') === 'true' ? 'due' : null);
    if (dueParam && dueParam !== paymentStatusFilter) {
      setPaymentStatusFilter(dueParam);
    }
  }, [searchParams]);

  // Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'sales' | 'purchase' | 'service';
    data: any;
  } | null>(null);

  const loadBills = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.db.allBills.getAll({
        category: categoryFilter,
        fyId: selectedFyId === 'all' ? undefined : selectedFyId,
        status: docStatusFilter === 'all' ? undefined : docStatusFilter,
        paymentStatus: paymentStatusFilter === 'all' ? undefined : paymentStatusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery || undefined,
      });

      if (res.success && res.data) {
        setBills(res.data);
      }
    } catch (err: any) {
      toast({ title: 'Error loading bills', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [categoryFilter, selectedFyId, paymentStatusFilter, docStatusFilter, fromDate, toDate]);

  // Handle Search Input submit / debounce
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadBills();
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    for (const b of bills) {
      if (b.status !== 'cancelled') {
        totalInvoiced += b.total_amount || 0;
        totalPaid += b.amount_paid || 0;
        totalBalance += b.balance_due || 0;
      }
    }

    return {
      count: bills.length,
      totalInvoiced,
      totalPaid,
      totalBalance,
    };
  }, [bills]);

  // Open invoice preview
  const handleOpenPreview = async (bill: any) => {
    try {
      let fullDoc: any = null;
      if (bill.bill_type === 'sales') {
        const res = await window.api.db.salesInvoices.getById(bill.id);
        if (res.success) fullDoc = res.data;
      } else if (bill.bill_type === 'purchase') {
        const res = await window.api.db.dealerPurchases.getById(bill.id);
        if (res.success) fullDoc = res.data;
      } else if (bill.bill_type === 'service') {
        const res = await window.api.db.serviceInvoices.getById(bill.id);
        if (res.success) fullDoc = res.data;
      }

      if (fullDoc) {
        setPreviewModal({
          isOpen: true,
          type: bill.bill_type,
          data: fullDoc,
        });
      } else {
        toast({
          title: 'Error opening bill',
          description: 'Document details could not be loaded from database.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error opening bill', description: err.message, variant: 'destructive' });
    }
  };

  // WhatsApp quick share with PDF generation, clipboard copy, and file folder reveal
  const handleWhatsApp = async (bill: any) => {
    const mobile = bill.party_mobile;
    if (!mobile || !mobile.trim()) {
      toast({ title: 'No Mobile Number', description: 'Party has no recorded mobile number', variant: 'destructive' });
      return;
    }

    setSharingBillId(bill.id);
    try {
      // 1. Fetch full bill record
      let fullDoc: any = null;
      if (bill.bill_type === 'sales') {
        const res = await window.api.db.salesInvoices.getById(bill.id);
        if (res.success) fullDoc = res.data;
      } else if (bill.bill_type === 'purchase') {
        const res = await window.api.db.dealerPurchases.getById(bill.id);
        if (res.success) fullDoc = res.data;
      } else if (bill.bill_type === 'service') {
        const res = await window.api.db.serviceInvoices.getById(bill.id);
        if (res.success) fullDoc = res.data;
      }

      if (!fullDoc) {
        toast({
          title: 'Document Not Found',
          description: 'Document details could not be loaded from database.',
          variant: 'destructive',
        });
        return;
      }

      // 2. Fetch company profile
      const compRes = await window.api.db.companyProfile.get();
      const company = compRes.success ? compRes.data : {};

      // 3. Format and generate precision vector PDF
      const pdfData = formatRecordToPdfData(bill.bill_type, fullDoc, company);
      const doc = generateInvoicePdf({
        ...pdfData,
        companyProfile: company || {},
        logoBase64: AGC_DEFAULT_LOGO_BASE64,
      });
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // 4. Save PDF to obtain exact local filePath
      let typeFolder: 'Sales' | 'Dealer_Purchase' | 'Service' = 'Sales';
      if (bill.bill_type === 'purchase') typeFolder = 'Dealer_Purchase';
      if (bill.bill_type === 'service') typeFolder = 'Service';

      const saveRes = await window.api.pdf.saveDocument({
        type: typeFolder,
        documentId: fullDoc.id,
        documentNumber: pdfData.documentNumber,
        documentDate: pdfData.invoiceDate,
        pdfBase64,
      });

      const filePath = saveRes.data?.filePath || (saveRes as any).filePath;

      // 5. Build WhatsApp greeting & details message
      const cleanMobile = mobile.replace(/\D/g, '');
      const formattedMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
      const formattedAmount = (pdfData.grandTotalPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const msg = `Dear ${pdfData.partyName || 'Customer'},\n\nThank you for choosing Anjaneya Gold Company.\nPlease find your tax invoice ${pdfData.documentNumber} for ₹${formattedAmount}.\n\nWarm regards,\nAnjaneya Gold Company`;

      const shareRes = await window.api.whatsapp.share(formattedMobile, msg, filePath || undefined);
      if (shareRes && !shareRes.success) {
        toast({
          title: 'WhatsApp Error',
          description: shareRes.error || 'Failed to launch WhatsApp URL.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'WhatsApp Opened & PDF Copied',
        description: 'PDF copied to clipboard and folder opened! Simply press Ctrl+V in WhatsApp to attach and send.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Error Sharing Bill',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSharingBillId(null);
    }
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#171717] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C49A35]" />
            All Bills & Master Transactions
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Universal billing browser across Sales Invoices, Dealer Purchases, and Service Invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBills}
            className="text-xs border-[#E7E2D7] hover:bg-[#F8F2E4] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Total Documents</p>
          <p className="text-2xl font-bold text-[#171717] mt-1">{metrics.count}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Matching current filters</p>
        </Card>

        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Total Invoiced</p>
          <p className="text-2xl font-bold text-[#171717] mt-1">
            ₹{metrics.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Gross billed volume</p>
        </Card>

        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Total Paid / Received</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{metrics.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Realized settlements</p>
        </Card>

        <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider">Balance Due</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            ₹{metrics.totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Outstanding collection</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-[#E7E2D7] bg-white shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
          <span className="text-xs text-gray-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#C49A35]" /> Module:
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer font-medium ${
              categoryFilter === 'all'
                ? 'bg-[#171717] text-[#C49A35] border-[#171717]'
                : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => setCategoryFilter('sales')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              categoryFilter === 'sales'
                ? 'bg-[#A98226] text-white border-[#A98226]'
                : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-[#F8F2E4]'
            }`}
          >
            <Receipt className="w-3 h-3" /> Sales Invoices
          </button>
          <button
            onClick={() => setCategoryFilter('purchase')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              categoryFilter === 'purchase'
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-blue-50'
            }`}
          >
            <ShoppingCart className="w-3 h-3" /> Dealer Purchases
          </button>
          <button
            onClick={() => setCategoryFilter('service')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
              categoryFilter === 'service'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-gray-600 border-[#E7E2D7] hover:bg-emerald-50'
            }`}
          >
            <Wrench className="w-3 h-3" /> Service Invoices
          </button>
        </div>

        {/* Detailed Filters Bar (Responsive & Spacious) */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search invoice #, party, GSTIN..."
              className="pl-8 h-9 text-xs bg-[#F8F2E4] border-[#E7E2D7] focus-visible:ring-[#C49A35]"
            />
          </div>

          {/* Financial Year Filter */}
          <div className="w-auto min-w-[155px] shrink-0">
            <select
              value={selectedFyId}
              onChange={(e) => setSelectedFyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full h-9 px-3 text-xs bg-[#F8F2E4] border border-[#E7E2D7] rounded-md font-medium text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#C49A35] cursor-pointer"
            >
              <option value="all">All Financial Years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  FY {y.name} {y.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="w-auto min-w-[145px] shrink-0">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-[#F8F2E4] border border-[#E7E2D7] rounded-md font-medium text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#C49A35] cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="due">Due / Pending Balance</option>
              <option value="paid">Paid (Fully Cleared)</option>
              <option value="partial">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-600 font-semibold whitespace-nowrap">From:</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[145px] h-9 text-xs bg-[#F8F2E4] border-[#E7E2D7] font-medium"
              title="From Date"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-gray-600 font-semibold whitespace-nowrap">To:</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[145px] h-9 text-xs bg-[#F8F2E4] border-[#E7E2D7] font-medium"
              title="To Date"
            />
          </div>
        </div>
      </Card>

      {/* Master Documents Table */}
      <Card className="border-[#E7E2D7] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm border-collapse">
            <thead>
              <tr className="bg-[#171717] text-white border-b border-[#2d2d2d]">
                <th className="py-3.5 px-3 font-semibold text-xs md:text-sm">Type</th>
                <th className="py-3.5 px-3 font-semibold text-xs md:text-sm">Document No</th>
                <th className="py-3.5 px-3 font-semibold text-xs md:text-sm">Date</th>
                <th className="py-3.5 px-3 font-semibold text-xs md:text-sm">Party Name & Ref</th>
                <th className="py-3.5 px-3 font-semibold text-right text-xs md:text-sm">Taxable (₹)</th>
                <th className="py-3.5 px-3 font-semibold text-right text-xs md:text-sm">Total Tax (₹)</th>
                <th className="py-3.5 px-3 font-semibold text-right text-xs md:text-sm">Final Amount (₹)</th>
                <th className="py-3.5 px-3 font-semibold text-right text-xs md:text-sm">Paid / Balance</th>
                <th className="py-3.5 px-3 font-semibold text-center text-xs md:text-sm">Status</th>
                <th className="py-3.5 px-3 font-semibold text-center text-xs md:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500 text-sm">
                    Loading master transactions...
                  </td>
                </tr>
              )}

              {!isLoading && bills.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500 text-sm">
                    No transactions found matching the selected filters.
                  </td>
                </tr>
              )}

              {!isLoading &&
                bills.map((bill) => {
                  const isSales = bill.bill_type === 'sales';
                  const isPurchase = bill.bill_type === 'purchase';
                  const isService = bill.bill_type === 'service';

                  return (
                    <tr key={`${bill.bill_type}-${bill.id}`} className="hover:bg-[#F8F2E4]/40 transition-colors">
                      {/* Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isSales && (
                          <Badge className="bg-[#F8F2E4] text-[#A98226] border-[#E7E2D7] text-xs font-semibold">
                            Sales
                          </Badge>
                        )}
                        {isPurchase && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                            Purchase
                          </Badge>
                        )}
                        {isService && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                            Service
                          </Badge>
                        )}
                      </td>

                      {/* Document No */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-[#171717]">
                        <button
                          onClick={() => handleOpenPreview(bill)}
                          className="hover:text-[#C49A35] underline decoration-dotted text-left cursor-pointer font-semibold text-xs md:text-sm"
                        >
                          {bill.document_number}
                        </button>
                        {bill.original_invoice_number && (
                          <span className="block text-xs text-gray-400">
                            Orig: {bill.original_invoice_number}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-gray-600 text-xs md:text-sm">
                        {bill.document_date}
                      </td>

                      {/* Party */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#171717] block truncate max-w-[200px] text-xs md:text-sm">
                          {bill.party_name || 'Walk-in Customer'}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span>{bill.party_reference || 'N/A'}</span>
                          {bill.party_mobile && <span>• {bill.party_mobile}</span>}
                        </span>
                      </td>

                      {/* Taxable Value */}
                      <td className="py-3 px-3 text-right font-mono text-gray-700 whitespace-nowrap text-xs md:text-sm">
                        ₹{(bill.taxable_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Total Tax */}
                      <td className="py-3 px-3 text-right font-mono text-gray-700 whitespace-nowrap text-xs md:text-sm">
                        ₹{(bill.total_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Final Amount */}
                      <td className="py-3 px-3 text-right font-bold font-mono text-[#171717] whitespace-nowrap text-xs md:text-sm">
                        ₹{(bill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Paid & Balance */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="text-emerald-700 font-mono block text-xs md:text-sm font-semibold">
                          ₹{(bill.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {(bill.balance_due || 0) > 0 ? (
                          <span className="text-rose-700 font-mono text-xs font-semibold block">
                            Bal: ₹{bill.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs block font-medium">Cleared</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              bill.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bill.payment_status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {bill.payment_status || 'unpaid'}
                          </span>
                          {bill.status === 'draft' && (
                            <span className="text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">DRAFT</span>
                          )}
                          {bill.status === 'cancelled' && (
                            <span className="text-xs text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">CANCELLED</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(bill)}
                            className="h-7 w-7 p-0 hover:bg-[#F8F2E4] text-gray-600 hover:text-[#C49A35]"
                            title="View / Print Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {bill.party_mobile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWhatsApp(bill)}
                              disabled={sharingBillId === bill.id}
                              className="h-7 w-7 p-0 hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                              title="Share on WhatsApp (Copies PDF to Clipboard)"
                            >
                              {sharingBillId === bill.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Print & Preview Modal */}
      {previewModal && (
        <InvoicePrintView
          open={previewModal.isOpen}
          onOpenChange={(v) => !v && setPreviewModal(null)}
          type={previewModal.type}
          record={previewModal.data}
        />
      )}
    </div>
  );
}
