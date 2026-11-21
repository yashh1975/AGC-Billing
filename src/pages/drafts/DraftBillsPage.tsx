import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  FileEdit,
  Search,
  Receipt,
  ShoppingCart,
  Wrench,
  Printer,
  Share2,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  List,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { InvoicePrintView } from '@/components/shared/InvoicePrintView';
import { LiveInvoicePreview, LiveInvoiceItem } from '@/components/shared/LiveInvoicePreview';
import { useToast } from '@/hooks/useToast';
import { generateInvoicePdf, formatRecordToPdfData } from '@/services/pdf/pdf-generator';
import { calculateInvoice, formatRupees, LineItemInput } from '@/services/gst/gst-engine';
import { AGC_DEFAULT_LOGO_BASE64 } from '@/assets/logo/logo-base64';
import type { Customer, Supplier } from '@/types/database';

export function DraftBillsPage() {
  const { activeYear } = useFinancialYear();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [draftType, setDraftType] = useState<'sales' | 'service' | 'purchase'>('sales');

  // List State
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'sales' | 'service' | 'purchase'>('all');
  const [sharingBillId, setSharingBillId] = useState<number | null>(null);

  // Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'sales' | 'purchase' | 'service';
    data: any;
  }>({
    isOpen: false,
    type: 'sales',
    data: null,
  });

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    draft: any | null;
  }>({
    isOpen: false,
    draft: null,
  });

  // Masters for creation
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Create Form State - Common Party
  const [partyForm, setPartyForm] = useState({
    name: '',
    mobile: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    gstin: '',
  });
  const [placeOfSupply, setPlaceOfSupply] = useState('Karnataka');
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Create Form State - Sales Items
  const [salesItems, setSalesItems] = useState<LineItemInput[]>([
    {
      description: 'Gold Jewellery Article',
      category: 'Gold Ornament',
      hsnCode: '7113',
      quantity: 1,
      grossWeight: 10.0,
      netWeight: 10.0,
      rate: 7000,
      makingCharges: 1000,
      otherCharges: 0,
      discount: 0,
      gstRate: 3,
      isTaxInclusive: false,
    },
  ]);

  // Create Form State - Service Items
  const [serviceItems, setServiceItems] = useState<LineItemInput[]>([
    {
      description: 'Gold Loan Takeover & Release Service',
      category: 'Financial Service',
      sacCode: '9971',
      quantity: 1,
      principalAmount: 100000,
      serviceAmount: 500,
      rate: 500,
      makingCharges: 0,
      otherCharges: 0,
      discount: 0,
      gstRate: 18,
      isTaxInclusive: false,
    },
  ]);

  // Create Form State - Purchase Items
  const [purchaseItems, setPurchaseItems] = useState<LineItemInput[]>([
    {
      description: 'Gold Jewellery Inward Estimate',
      category: 'Gold Bullion',
      hsnCode: '7113',
      quantity: 1,
      grossWeight: 15.0,
      netWeight: 15.0,
      rate: 6900,
      makingCharges: 0,
      otherCharges: 0,
      discount: 0,
      gstRate: 3,
      isTaxInclusive: false,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // Load drafts list
  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.db.draftBills.getAll({
        category: categoryFilter,
        search: searchQuery,
      });
      if (res.success && res.data) {
        setDrafts(res.data);
      } else {
        toast({
          title: 'Error Loading Drafts',
          description: res.error || 'Failed to fetch draft bills.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [categoryFilter]);

  // Load masters for quick search
  useEffect(() => {
    window.api.db.customers.getAll().then((r: any) => {
      if (r.success && r.data) setCustomers(r.data);
    }).catch(() => {});
    window.api.db.suppliers.getAll().then((r: any) => {
      if (r.success && r.data) setSuppliers(r.data);
    }).catch(() => {});
  }, []);

  // Filtered drafts by search query
  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    const term = searchQuery.trim().toLowerCase();
    return drafts.filter((d) =>
      (d.document_number && d.document_number.toLowerCase().includes(term)) ||
      (d.party_name && d.party_name.toLowerCase().includes(term)) ||
      (d.party_mobile && d.party_mobile.toLowerCase().includes(term))
    );
  }, [drafts, searchQuery]);

  // View Draft in Modal
  const handleViewDraft = async (draft: any) => {
    try {
      let fullDoc: any = null;
      if (draft.bill_type === 'sales') {
        const res = await window.api.db.salesInvoices.getById(draft.id);
        if (res.success) fullDoc = res.data;
      } else if (draft.bill_type === 'purchase') {
        const res = await window.api.db.dealerPurchases.getById(draft.id);
        if (res.success) fullDoc = res.data;
      } else if (draft.bill_type === 'service') {
        const res = await window.api.db.serviceInvoices.getById(draft.id);
        if (res.success) fullDoc = res.data;
      }

      if (fullDoc) {
        setPreviewModal({
          isOpen: true,
          type: draft.bill_type,
          data: {
            ...fullDoc,
            isDraft: true,
          },
        });
      } else {
        toast({
          title: 'Document Not Found',
          description: 'Could not load draft record details.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // WhatsApp Share
  const handleWhatsAppDraft = async (draft: any) => {
    const mobile = draft.party_mobile;
    if (!mobile || !mobile.trim()) {
      toast({
        title: 'No Mobile Number',
        description: 'Customer / party has no recorded mobile number for WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    setSharingBillId(draft.id);
    try {
      let fullDoc: any = null;
      if (draft.bill_type === 'sales') {
        const res = await window.api.db.salesInvoices.getById(draft.id);
        if (res.success) fullDoc = res.data;
      } else if (draft.bill_type === 'purchase') {
        const res = await window.api.db.dealerPurchases.getById(draft.id);
        if (res.success) fullDoc = res.data;
      } else if (draft.bill_type === 'service') {
        const res = await window.api.db.serviceInvoices.getById(draft.id);
        if (res.success) fullDoc = res.data;
      }

      if (!fullDoc) {
        toast({
          title: 'Error',
          description: 'Failed to retrieve full draft record.',
          variant: 'destructive',
        });
        return;
      }

      const compRes = await window.api.db.companyProfile.get();
      const company = compRes.success ? compRes.data : {};

      const pdfData = formatRecordToPdfData(draft.bill_type, { ...fullDoc, isDraft: true }, company);
      const doc = generateInvoicePdf({
        ...pdfData,
        isDraft: true,
        companyProfile: company || {},
        logoBase64: AGC_DEFAULT_LOGO_BASE64,
      });
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      let typeFolder: 'Sales' | 'Dealer_Purchase' | 'Service' = 'Sales';
      if (draft.bill_type === 'purchase') typeFolder = 'Dealer_Purchase';
      if (draft.bill_type === 'service') typeFolder = 'Service';

      const saveRes = await window.api.pdf.saveDocument({
        type: typeFolder,
        documentId: fullDoc.id,
        documentNumber: pdfData.documentNumber,
        documentDate: pdfData.invoiceDate,
        pdfBase64,
      });

      const filePath = saveRes.data?.filePath || (saveRes as any).filePath;
      const cleanMobile = mobile.replace(/\D/g, '');
      const formattedMobile = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
      const formattedAmount = (pdfData.grandTotalPaise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const msg = `Dear ${pdfData.partyName || 'Customer'},\n\nPlease find your estimation quote / draft bill reference ${pdfData.documentNumber} for ₹${formattedAmount}.\n\nWarm regards,\nAnjaneya Gold Company`;

      const shareRes = await window.api.whatsapp.share(formattedMobile, msg, filePath || undefined);
      if (shareRes && !shareRes.success) {
        toast({
          title: 'WhatsApp Error',
          description: shareRes.error || 'Failed to open WhatsApp.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Draft Shared to WhatsApp',
        description: 'WhatsApp opened with draft quote details and PDF attached.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'WhatsApp Sharing Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSharingBillId(null);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async () => {
    if (!deleteConfirm.draft) return;
    const { bill_type, id, document_number } = deleteConfirm.draft;

    try {
      const res = await window.api.db.draftBills.delete(bill_type, id);
      if (res.success) {
        toast({
          title: 'Draft Deleted',
          description: `Draft bill ${document_number} removed successfully.`,
          variant: 'success',
        });
        setDeleteConfirm({ isOpen: false, draft: null });
        loadDrafts();
      } else {
        toast({
          title: 'Delete Failed',
          description: res.error || 'Unable to delete this draft bill.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Current items for active draft creation type
  const currentItems = draftType === 'sales' ? salesItems : draftType === 'service' ? serviceItems : purchaseItems;
  const currentSetItems = draftType === 'sales' ? setSalesItems : draftType === 'service' ? setServiceItems : setPurchaseItems;

  const currentCalc = calculateInvoice(
    currentItems,
    'Karnataka',
    placeOfSupply,
    0
  );

  // Convert items for LiveInvoicePreview
  const previewLiveItems: LiveInvoiceItem[] = currentItems.map((it) => ({
    description: it.description,
    hsnCode: it.hsnCode,
    sacCode: it.sacCode,
    quantity: it.quantity,
    grossWeight: it.grossWeight,
    netWeight: it.netWeight,
    rate: it.rate,
    principalAmount: it.principalAmount,
    serviceAmount: it.serviceAmount,
    makingCharges: it.makingCharges,
    discount: it.discount,
    gstRate: it.gstRate,
  }));

  // Handle Save Draft Bill
  const handleSaveDraft = async () => {
    if (!partyForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: `${draftType === 'purchase' ? 'Supplier' : 'Customer'} name is required.`,
        variant: 'destructive',
      });
      return;
    }

    if (!activeYear) {
      toast({
        title: 'Validation Error',
        description: 'No active Financial Year selected. Please check Settings.',
        variant: 'destructive',
      });
      return;
    }

    if (currentItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one line item.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      let res: any = null;
      if (draftType === 'sales') {
        res = await window.api.db.salesInvoices.create({
          financialYearId: activeYear.id,
          customer: partyForm,
          invoiceDate: draftDate,
          placeOfSupply,
          supplyType: currentCalc.supplyType,
          subtotal: currentCalc.subtotalPaise,
          totalDiscount: currentCalc.totalDiscountPaise,
          taxableAmount: currentCalc.taxableAmountPaise,
          cgstAmount: currentCalc.cgstAmountPaise,
          sgstAmount: currentCalc.sgstAmountPaise,
          igstAmount: currentCalc.igstAmountPaise,
          roundOff: currentCalc.roundOffPaise,
          grandTotal: currentCalc.grandTotalPaise,
          amountReceived: 0,
          balanceDue: currentCalc.grandTotalPaise,
          paymentMode: 'cash',
          status: 'draft',
          notes: notes || 'Draft Sales Estimation',
          items: currentCalc.items,
        });
      } else if (draftType === 'service') {
        res = await window.api.db.serviceInvoices.create({
          financialYearId: activeYear.id,
          customer: partyForm,
          invoiceDate: draftDate,
          placeOfSupply,
          supplyType: currentCalc.supplyType,
          subtotal: currentCalc.subtotalPaise,
          totalDiscount: currentCalc.totalDiscountPaise,
          taxableAmount: currentCalc.taxableAmountPaise,
          cgstAmount: currentCalc.cgstAmountPaise,
          sgstAmount: currentCalc.sgstAmountPaise,
          igstAmount: currentCalc.igstAmountPaise,
          roundOff: currentCalc.roundOffPaise,
          grandTotal: currentCalc.grandTotalPaise,
          amountReceived: 0,
          balanceDue: currentCalc.grandTotalPaise,
          paymentMode: 'cash',
          status: 'draft',
          notes: notes || 'Draft Financial Service Estimation',
          items: currentCalc.items,
        });
      } else if (draftType === 'purchase') {
        res = await window.api.db.dealerPurchases.create({
          financialYearId: activeYear.id,
          supplier: partyForm,
          recordDate: draftDate,
          placeOfSupply,
          supplyType: currentCalc.supplyType,
          subtotal: currentCalc.subtotalPaise,
          totalDiscount: currentCalc.totalDiscountPaise,
          taxableAmount: currentCalc.taxableAmountPaise,
          cgstAmount: currentCalc.cgstAmountPaise,
          sgstAmount: currentCalc.sgstAmountPaise,
          igstAmount: currentCalc.igstAmountPaise,
          roundOff: currentCalc.roundOffPaise,
          grandTotal: currentCalc.grandTotalPaise,
          amountPaid: 0,
          balanceDue: currentCalc.grandTotalPaise,
          paymentMode: 'cash',
          status: 'draft',
          notes: notes || 'Draft Dealer Purchase Estimation',
          items: currentCalc.items,
        });
      }

      if (res && res.success) {
        toast({
          title: 'Draft Bill Created',
          description: `Draft reference recorded successfully.`,
          variant: 'success',
        });
        setActiveTab('list');
        loadDrafts();
      } else {
        toast({
          title: 'Creation Failed',
          description: res?.error || 'Failed to save draft bill.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[#C49A35]" />
            Draft & Estimation Bills
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Generate and manage reference estimates without consuming official GST invoice sequence numbers. View, share via WhatsApp, or delete drafts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'list' ? (
            <Button
              size="sm"
              onClick={() => setActiveTab('create')}
              className="text-xs flex items-center gap-1.5 font-bold h-8 px-4 bg-[#171717] text-[#C49A35] hover:bg-[#2c2c2c]"
            >
              <Plus className="w-3.5 h-3.5" />
              New Draft Bill
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('list')}
              className="text-xs flex items-center gap-1.5 h-8 px-3 border-[#E7E2D7]"
            >
              <List className="w-3.5 h-3.5" />
              View Drafts Register
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'list' ? (
        /* ═══════════════════════════════════════════════════════════════ */
        /* VIEW A: DRAFT REGISTER LIST */
        /* ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('all')}
                  className={`text-xs h-8 ${categoryFilter === 'all' ? 'bg-[#171717] text-[#C49A35]' : ''}`}
                >
                  All Drafts ({drafts.length})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'sales' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('sales')}
                  className={`text-xs h-8 ${categoryFilter === 'sales' ? 'bg-[#171717] text-[#C49A35]' : ''}`}
                >
                  <Receipt className="w-3 h-3 mr-1" />
                  Sales Drafts
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'service' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('service')}
                  className={`text-xs h-8 ${categoryFilter === 'service' ? 'bg-[#171717] text-[#C49A35]' : ''}`}
                >
                  <Wrench className="w-3 h-3 mr-1" />
                  Service Drafts
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'purchase' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('purchase')}
                  className={`text-xs h-8 ${categoryFilter === 'purchase' ? 'bg-[#171717] text-[#C49A35]' : ''}`}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Purchase Drafts
                </Button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <Input
                  placeholder="Search draft #, party name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>
            </div>
          </Card>

          {/* Drafts Table */}
          <Card className="overflow-hidden shadow-xs border-[#E7E2D7]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                  <tr>
                    <th className="p-3 w-10 text-center font-bold">#</th>
                    <th className="p-3 font-bold">Estimate / Draft Ref</th>
                    <th className="p-3 font-bold">Date</th>
                    <th className="p-3 font-bold">Type</th>
                    <th className="p-3 font-bold">Customer / Supplier</th>
                    <th className="p-3 text-right font-bold">Taxable Value</th>
                    <th className="p-3 text-right font-bold">GST</th>
                    <th className="p-3 text-right font-bold">Estimate Total</th>
                    <th className="p-3 text-center font-bold w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D7] bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 italic">
                        Loading draft bills...
                      </td>
                    </tr>
                  ) : filteredDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 italic">
                        No draft estimation bills found. Click "+ New Draft Bill" to generate one.
                      </td>
                    </tr>
                  ) : (
                    filteredDrafts.map((draft, idx) => {
                      const typeBadge =
                        draft.bill_type === 'sales'
                          ? { label: 'Sales Draft', bg: 'bg-amber-100 text-amber-800 border-amber-300' }
                          : draft.bill_type === 'service'
                          ? { label: 'Service Draft', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
                          : { label: 'Purchase Draft', bg: 'bg-blue-100 text-blue-800 border-blue-300' };

                      return (
                        <tr key={`${draft.bill_type}-${draft.id}`} className="hover:bg-amber-50/20 transition-colors">
                          <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                          <td className="p-3 font-bold font-mono text-[#171717] whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px]">
                              {draft.document_number}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-gray-600">{draft.document_date}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${typeBadge.bg}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#171717] uppercase">
                              {draft.party_name || 'Retail Client'}
                            </div>
                            {draft.party_mobile && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                {draft.party_mobile}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-medium">
                            ₹{(draft.taxable_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-600">
                            ₹{(draft.total_tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-extrabold text-[#171717] whitespace-nowrap">
                            ₹{(draft.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View / Print Draft */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDraft(draft)}
                                className="h-7 px-2 text-xs border-gray-300 hover:bg-gray-100"
                                title="View & Print Draft"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#171717]" />
                              </Button>

                              {/* WhatsApp Share */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWhatsAppDraft(draft)}
                                disabled={sharingBillId === draft.id}
                                className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                title="Share via WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>

                              {/* Delete Draft */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteConfirm({ isOpen: true, draft })}
                                className="h-7 px-2 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                title="Delete Draft"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════ */
        /* VIEW B: CREATE DRAFT ESTIMATION BILL */
        /* ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Draft Type Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDraftType('sales')}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                draftType === 'sales'
                  ? 'border-[#C49A35] bg-[#F8F2E4] shadow-xs'
                  : 'border-[#E7E2D7] bg-white hover:bg-gray-50'
              }`}
            >
              <div className="p-2 rounded-md bg-amber-100 text-amber-800">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#171717]">1. Sales Draft</div>
                <div className="text-[11px] text-gray-500">Gold jewellery estimation (Gram Rate & Making)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDraftType('service')}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                draftType === 'service'
                  ? 'border-[#C49A35] bg-[#F8F2E4] shadow-xs'
                  : 'border-[#E7E2D7] bg-white hover:bg-gray-50'
              }`}
            >
              <div className="p-2 rounded-md bg-emerald-100 text-emerald-800">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#171717]">2. Financial Services Draft</div>
                <div className="text-[11px] text-gray-500">Loan takeover & release (Principal & Fee)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDraftType('purchase')}
              className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                draftType === 'purchase'
                  ? 'border-[#C49A35] bg-[#F8F2E4] shadow-xs'
                  : 'border-[#E7E2D7] bg-white hover:bg-gray-50'
              }`}
            >
              <div className="p-2 rounded-md bg-blue-100 text-blue-800">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#171717]">3. Dealer Purchase Draft</div>
                <div className="text-[11px] text-gray-500">Inward gold purchase estimation from dealers</div>
              </div>
            </button>
          </div>

          {/* Split Screen Grid: Form (Left) & Live Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Party Information */}
              <Card className="p-5 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2">
                  {draftType === 'purchase' ? 'Supplier Details' : 'Customer Details'} (Draft Bill)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Party Name *</Label>
                    <Input
                      placeholder={draftType === 'purchase' ? 'Supplier name' : 'Customer name'}
                      value={partyForm.name}
                      onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mobile Number</Label>
                    <Input
                      placeholder="10-digit mobile"
                      value={partyForm.mobile}
                      onChange={(e) => setPartyForm({ ...partyForm, mobile: e.target.value })}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Draft Date</Label>
                    <Input
                      type="date"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Place of Supply</Label>
                    <Input
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </Card>

              {/* Line Items Card */}
              <Card className="p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-2">
                  <h3 className="text-sm font-bold text-[#171717]">
                    Line Items ({draftType === 'service' ? 'Financial Services' : 'Gold Items'})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (draftType === 'service') {
                        currentSetItems([
                          ...currentItems,
                          {
                            description: 'Gold Re-pledging & Documentation Service',
                            category: 'Financial Service',
                            sacCode: '9971',
                            quantity: 1,
                            principalAmount: 50000,
                            serviceAmount: 500,
                            rate: 500,
                            discount: 0,
                            gstRate: 18,
                          },
                        ]);
                      } else {
                        currentSetItems([
                          ...currentItems,
                          {
                            description: 'Gold Article',
                            category: 'Gold Ornament',
                            hsnCode: '7113',
                            quantity: 1,
                            grossWeight: 5.0,
                            netWeight: 5.0,
                            rate: 7000,
                            makingCharges: 500,
                            discount: 0,
                            gstRate: 3,
                          },
                        ]);
                      }
                    }}
                    className="text-xs h-7"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto rounded border border-[#E7E2D7]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                      {draftType === 'service' ? (
                        <tr>
                          <th className="p-2 w-48 font-bold">Service Description</th>
                          <th className="p-2 w-28 text-right font-bold">Principal Amt (₹)</th>
                          <th className="p-2 w-28 text-right font-bold">Service Fee (₹)</th>
                          <th className="p-2 w-16 text-center font-bold">GST %</th>
                          <th className="p-2 w-24 text-right font-bold">Taxable</th>
                          <th className="p-2 w-10 text-center"></th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="p-2 w-44 font-bold">Description</th>
                          <th className="p-2 w-20 text-center font-bold">Net Wt (g)</th>
                          <th className="p-2 w-24 text-right font-bold">Rate/g (₹)</th>
                          <th className="p-2 w-20 text-right font-bold">Making (₹)</th>
                          <th className="p-2 w-16 text-center font-bold">GST %</th>
                          <th className="p-2 w-24 text-right font-bold">Taxable</th>
                          <th className="p-2 w-10 text-center"></th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-[#E7E2D7]">
                      {currentItems.map((item, idx) => {
                        const calc = currentCalc.items[idx];
                        return (
                          <tr key={idx} className="align-middle">
                            <td className="p-1.5">
                              <Input
                                value={item.description}
                                onChange={(e) => {
                                  const upd = [...currentItems];
                                  upd[idx].description = e.target.value;
                                  currentSetItems(upd);
                                }}
                                className="h-8 text-xs"
                              />
                            </td>
                            {draftType === 'service' ? (
                              <>
                                <td className="p-1.5">
                                  <Input
                                    type="number"
                                    value={item.principalAmount || ''}
                                    placeholder="100000"
                                    onChange={(e) => {
                                      const upd = [...currentItems];
                                      upd[idx].principalAmount = parseFloat(e.target.value) || 0;
                                      currentSetItems(upd);
                                    }}
                                    className="h-8 text-xs text-right font-semibold text-emerald-800"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    type="number"
                                    value={item.serviceAmount !== undefined ? item.serviceAmount : item.rate}
                                    placeholder="500"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const upd = [...currentItems];
                                      upd[idx].serviceAmount = val;
                                      upd[idx].rate = val;
                                      currentSetItems(upd);
                                    }}
                                    className="h-8 text-xs text-right font-bold"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-1.5">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    value={item.netWeight || ''}
                                    placeholder="10.000"
                                    onChange={(e) => {
                                      const upd = [...currentItems];
                                      const val = parseFloat(e.target.value) || 0;
                                      upd[idx].netWeight = val;
                                      upd[idx].grossWeight = val;
                                      currentSetItems(upd);
                                    }}
                                    className="h-8 text-xs text-center"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    type="number"
                                    value={item.rate || ''}
                                    placeholder="7000"
                                    onChange={(e) => {
                                      const upd = [...currentItems];
                                      upd[idx].rate = parseFloat(e.target.value) || 0;
                                      currentSetItems(upd);
                                    }}
                                    className="h-8 text-xs text-right font-medium"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    type="number"
                                    value={item.makingCharges || ''}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const upd = [...currentItems];
                                      upd[idx].makingCharges = parseFloat(e.target.value) || 0;
                                      currentSetItems(upd);
                                    }}
                                    className="h-8 text-xs text-right"
                                  />
                                </td>
                              </>
                            )}
                            <td className="p-1.5">
                              <Input
                                type="number"
                                value={item.gstRate}
                                onChange={(e) => {
                                  const upd = [...currentItems];
                                  upd[idx].gstRate = parseFloat(e.target.value) || 0;
                                  currentSetItems(upd);
                                }}
                                className="h-8 text-xs text-center"
                              />
                            </td>
                            <td className="p-1.5 text-right font-bold text-xs whitespace-nowrap">
                              {formatRupees(calc?.taxableValuePaise)}
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentItems.length > 1) {
                                    currentSetItems(currentItems.filter((_, i) => i !== idx));
                                  }
                                }}
                                disabled={currentItems.length <= 1}
                                className="text-gray-400 hover:text-rose-600 disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E7E2D7]">
                  <span className="text-xs text-gray-500">
                    Draft Estimate Total (Non-statutory quotation)
                  </span>
                  <span className="text-base font-black text-[#171717]">
                    {formatRupees(currentCalc.grandTotalPaise)}
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="bg-[#171717] text-[#C49A35] hover:bg-[#2c2c2c] font-bold text-xs h-9 px-6"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    {isSaving ? 'Saving Draft...' : 'Save Draft Estimate'}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Live A4 Preview Column */}
            <div className="lg:col-span-5 lg:sticky lg:top-4">
              <LiveInvoicePreview
                type={draftType}
                documentNumber={`EST-${draftType === 'sales' ? 'S' : draftType === 'service' ? 'SV' : 'P'}-DRAFT`}
                invoiceDate={draftDate}
                partyName={partyForm.name}
                partyMobile={partyForm.mobile}
                partyAddress={partyForm.address}
                placeOfSupply={placeOfSupply}
                items={previewLiveItems}
                isDraft={true}
                notes={notes}
                onPrint={handleSaveDraft}
                onSavePdf={handleSaveDraft}
                isSaving={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* View / Print Modal */}
      {previewModal.isOpen && previewModal.data && (
        <InvoicePrintView
          open={previewModal.isOpen}
          onOpenChange={(v) => {
            if (!v) setPreviewModal({ isOpen: false, type: 'sales', data: null });
          }}
          type={previewModal.type}
          record={previewModal.data}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4 bg-white shadow-2xl border border-black">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#171717]">Confirm Draft Deletion</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete draft estimate{' '}
              <strong>{deleteConfirm.draft?.document_number}</strong>? Since this is an estimation/reference bill and not an official GST tax invoice, it can be permanently removed from your drafts register without affecting accounting.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E2D7]">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteConfirm({ isOpen: false, draft: null })}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteDraft}
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Delete Draft
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
