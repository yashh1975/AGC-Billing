import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Eye,
  Search,
  Truck,
  UploadCloud,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import type { Supplier, FinancialYear, HsnCode } from '@/types/database';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useToast } from '@/hooks/useToast';
import {
  calculateInvoice,
  formatRupees,
  numberToWordsIndian,
  LineItemInput,
} from '@/services/gst/gst-engine';
import { LiveInvoicePreview } from '@/components/shared/LiveInvoicePreview';
import { InvoicePrintView } from '@/components/shared/InvoicePrintView';

export function DealerPurchasePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeYear } = useFinancialYear();

  const [printModalDoc, setPrintModalDoc] = useState<any | null>(null);

  // Suppliers & Masters
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    mobile: '',
    gstin: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
  });

  // Original Supplier Invoice Info
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState('');
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Payment
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState<number>(0);

  // Responsive tab switcher for smaller screens
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Line items
  const [items, setItems] = useState<LineItemInput[]>([
    {
      description: 'Standard Gold Bullion Bar 999',
      category: 'Bullion',
      hsnCode: '7108',
      quantity: 1,
      grossWeight: 0,
      netWeight: 0,
      rate: 0,
      vaPercent: 0,
      makingCharges: 0,
      otherCharges: 0,
      discount: 0,
      gstRate: 3,
      isTaxInclusive: false,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDocNumber, setCurrentDocNumber] = useState('');

  const loadNextDocNumber = useCallback(async () => {
    if (!activeYear) return;
    try {
      const res = await window.api.db.documentSequences.peekNext('purchase', activeYear.id);
      if (res.success && res.data?.documentNumber) {
        setCurrentDocNumber(res.data.documentNumber);
      }
    } catch (err) {
      console.error('Failed to peek next purchase sequence number:', err);
    }
  }, [activeYear]);

  useEffect(() => {
    loadNextDocNumber();
  }, [loadNextDocNumber]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await window.api.db.suppliers.getAll();
        if (res.success && res.data) setSuppliers(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadSuppliers();
  }, []);

  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierId(s.id);
    setSupplierForm({
      name: s.name,
      mobile: s.mobile || '',
      gstin: s.gstin || '',
      address: s.address || '',
      city: s.city || 'Bengaluru',
      state: s.state || 'Karnataka',
      stateCode: s.state_code || '29',
    });
  };

  const handleClearSupplier = () => {
    setSelectedSupplierId(null);
    setSupplierForm({
      name: '',
      mobile: '',
      gstin: '',
      address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
    });
  };

  const handleItemChange = (index: number, field: keyof LineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        description: 'Gold Bullion Item',
        category: 'Bullion',
        hsnCode: '7108',
        quantity: 1,
        grossWeight: 0,
        netWeight: 0,
        rate: 0,
        vaPercent: 0,
        makingCharges: 0,
        otherCharges: 0,
        discount: 0,
        gstRate: 3,
        isTaxInclusive: false,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSelectAttachment = async () => {
    try {
      const res = await window.api.files.selectFile({
        title: "Select Dealer's Original Invoice Scan/PDF",
        filters: [
          { name: 'Documents & Images', extensions: ['pdf', 'jpg', 'jpeg', 'png'] },
        ],
      });
      if (res.success && res.data) {
        setAttachmentPath(res.data);
        toast({
          title: 'Attachment Selected',
          description: `Attached original invoice: ${res.data.split('\\').pop()}`,
          variant: 'success',
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Perform calculation
  const calculation = calculateInvoice(
    items,
    'Karnataka',
    supplierForm.state || 'Karnataka',
    amountPaidInput,
    'purchase'
  );

  const handleSavePurchase = async (status: 'draft' | 'finalized') => {
    if (!supplierForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Supplier name is required.',
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

    if (items.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one line item before saving purchase record.',
        variant: 'destructive',
      });
      return;
    }

    if (calculation.grandTotalPaise <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Purchase total must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        financialYearId: activeYear.id,
        supplierId: selectedSupplierId,
        supplier: supplierForm,
        originalInvoiceNumber,
        originalInvoiceDate,
        recordDate,
        subtotal: calculation.subtotalPaise,
        totalDiscount: calculation.totalDiscountPaise,
        taxableAmount: calculation.taxableAmountPaise,
        cgstAmount: calculation.cgstAmountPaise,
        sgstAmount: calculation.sgstAmountPaise,
        igstAmount: calculation.igstAmountPaise,
        roundOff: calculation.roundOffPaise,
        grandTotal: calculation.grandTotalPaise,
        amountPaid: calculation.amountReceivedPaise,
        balanceDue: calculation.balanceDuePaise,
        paymentMode,
        paymentReference,
        status,
        attachmentPath,
        notes,
        items: calculation.items,
      };

      const res = await window.api.db.dealerPurchases.create(payload);

      if (res.success && res.data) {
        toast({
          title: status === 'finalized' ? 'Purchase Record Saved' : 'Draft Saved',
          description: status === 'finalized'
            ? `Purchase record ${res.data.record_number} created successfully.`
            : `Draft ${res.data.record_number} saved successfully.`,
          variant: 'success',
        });

        if (status === 'draft') {
          navigate('/drafts');
          return;
        }

        loadNextDocNumber();
        // Immediately fetch the recorded full doc to show preview & save/open PDF modal
        const fullRes = await window.api.db.dealerPurchases.getById(res.data.id);
        if (fullRes.success && fullRes.data) {
          setPrintModalDoc(fullRes.data);
          return;
        }
        navigate('/all-bills');
      } else {
        toast({
          title: 'Operation Failed',
          description: res.error || 'Failed to record dealer purchase.',
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#C49A35]" />
            Dealer Purchase Register
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Record bullion dealer purchases & original tax invoice references
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSavePurchase('draft')}
            disabled={isSubmitting}
            className="text-xs flex items-center gap-1.5 h-8 px-3"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSavePurchase('finalized')}
            disabled={isSubmitting}
            className="text-xs flex items-center gap-1.5 font-bold h-8 px-4 bg-[#171717] text-[#C49A35] hover:bg-[#2c2c2c]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Save Purchase Record
          </Button>
        </div>
      </div>

      {/* Screen Mode Switcher on Narrow Windows */}
      <div className="flex lg:hidden items-center justify-between bg-white p-2.5 rounded-lg border border-black shadow-xs">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={activeTab === 'form' ? 'default' : 'outline'}
            onClick={() => setActiveTab('form')}
            className="text-xs h-8"
          >
            Purchase Form
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('preview')}
            className="text-xs h-8 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Live A4 Invoice Preview
          </Button>
        </div>
        <span className="text-sm font-bold text-[#A98226]">
          Total: {formatRupees(calculation.grandTotalPaise)}
        </span>
      </div>

      {/* Split-Screen 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Purchase Entry Form */}
        <div className={`lg:col-span-7 min-w-0 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Supplier Picker & Profile Card */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#C49A35]" />
                Bullion Dealer / Supplier Details
              </h3>
              {selectedSupplierId && (
                <button
                  type="button"
                  onClick={handleClearSupplier}
                  className="text-xs text-[#A98226] hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Quick Supplier Search */}
            {!selectedSupplierId && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search existing dealer by name, mobile, or GSTIN..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
                {supplierSearch.trim().length > 1 && (
                  <div className="absolute left-0 right-0 top-10 bg-white border border-[#E7E2D7] rounded-md shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-[#E7E2D7]">
                    {suppliers
                      .filter(
                        (s) =>
                          s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                          (s.mobile && s.mobile.includes(supplierSearch)) ||
                          (s.gstin && s.gstin.toLowerCase().includes(supplierSearch.toLowerCase()))
                      )
                      .slice(0, 5)
                      .map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleSelectSupplier(s);
                            setSupplierSearch('');
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-[#171717]">{s.name}</span>
                            <span className="text-gray-500 ml-2">({s.mobile || 'No contact'})</span>
                          </div>
                          <span className="text-xs text-[#A98226] font-semibold">
                            {s.reference_number}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dealer / Business Name *</Label>
                <Input
                  placeholder="e.g. Apex Bullion Pvt Ltd"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dealer GSTIN</Label>
                <Input
                  placeholder="15-character dealer GSTIN"
                  value={supplierForm.gstin}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })
                  }
                  className="h-9 text-sm font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  placeholder="Dealer mobile/office phone"
                  value={supplierForm.mobile}
                  onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Supplier State</Label>
                <Input
                  placeholder="e.g. Karnataka"
                  value={supplierForm.state}
                  onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  placeholder="Bullion market / office address"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Original Invoice Parameters Card */}
          <Card className="p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dealer's Original Bill # *</Label>
                <Input
                  placeholder="e.g. APX-9981"
                  value={originalInvoiceNumber}
                  onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dealer Invoice Date *</Label>
                <Input
                  type="date"
                  value={originalInvoiceDate}
                  onChange={(e) => setOriginalInvoiceDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">System Entry Date</Label>
                <Input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Purchase Items Table with Generous Width & Clean Inputs */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717]">
                Dealer Purchase Items
              </h3>
              <Button size="sm" variant="outline" onClick={addItemRow} className="text-xs h-8">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border border-[#E7E2D7]">
              <table className="w-full text-xs text-left min-w-[880px]">
                <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                  <tr>
                    <th className="p-2.5 w-48 min-w-[170px] font-bold">Description</th>
                    <th className="p-2.5 w-24 min-w-[85px] font-bold">HSN</th>
                    <th className="p-2.5 w-20 min-w-[70px] text-center font-bold">Qty</th>
                    <th className="p-2.5 w-24 min-w-[85px] text-right font-bold">G. Wt(g)</th>
                    <th className="p-2.5 w-24 min-w-[85px] text-right font-bold">N. Wt(g)</th>
                    <th className="p-2.5 w-28 min-w-[105px] text-right font-bold">Rate (₹)</th>
                    <th className="p-2.5 w-24 min-w-[85px] text-center font-bold">Wastage (VA %)</th>
                    <th className="p-2.5 w-24 min-w-[85px] text-right font-bold">Disc (₹)</th>
                    <th className="p-2.5 w-20 min-w-[70px] text-center font-bold">GST %</th>
                    <th className="p-2.5 w-28 min-w-[95px] text-right font-bold">Taxable</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D7]">
                  {items.map((item, idx) => {
                    const calc = calculation.items[idx];
                    return (
                      <tr key={idx} className="align-middle hover:bg-[#F8F2E4]/30 transition-colors">
                        <td className="p-2">
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="h-9 text-sm"
                            placeholder="Bullion / Raw item"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.hsnCode}
                            onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                            className="h-9 text-sm font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                            }
                            className="h-9 text-sm text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            value={item.grossWeight || ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'grossWeight', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            value={item.netWeight || ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'netWeight', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.rate || ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-right font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={item.vaPercent !== undefined ? item.vaPercent : ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'vaPercent', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-center font-bold text-amber-800"
                            title="Wastage / VA %"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.discount || ''}
                            onChange={(e) =>
                              handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.1"
                            value={item.gstRate}
                            onChange={(e) =>
                              handleItemChange(idx, 'gstRate', parseFloat(e.target.value) || 0)
                            }
                            className="h-9 text-sm text-center"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-[#171717] text-sm">
                          {formatRupees(calc?.taxableValuePaise)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="text-gray-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer p-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment & Settlement Card */}
          <Card className="p-5 space-y-4 shadow-xs">
            <h4 className="font-bold text-sm text-[#171717] border-b border-[#E7E2D7] pb-2">
              Payment & Settlement to Dealer
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-9 px-2 text-sm bg-white border border-[#E7E2D7] rounded-md text-[#171717]"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount Paid (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountPaidInput || ''}
                  onChange={(e) => setAmountPaidInput(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm text-right font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank UTR / Cheque #</Label>
                <Input
                  placeholder="Transaction UTR"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E2D7]">
              <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-md border border-emerald-200">
                <span className="text-emerald-800 font-semibold">Paid to Dealer:</span>
                <span className="font-bold font-mono text-emerald-700">
                  {formatRupees(calculation.amountReceivedPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm p-3 bg-rose-50 rounded-md border border-rose-200">
                <span className="text-rose-800 font-semibold">Payable Balance:</span>
                <span className="font-bold font-mono text-rose-700">
                  {formatRupees(calculation.balanceDuePaise)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAttachment}
                className="text-xs h-9"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-[#C49A35]" />
                {attachmentPath ? 'Replace Attached Invoice Scan' : 'Attach Original Dealer Bill (Scan/PDF)'}
              </Button>
              {attachmentPath && (
                <span className="text-xs text-emerald-700 font-semibold truncate max-w-xs">
                  ✓ {attachmentPath.split('\\').pop()}
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Live A4 PDF Preview (Sticky & Synchronized) */}
        <div className={`lg:col-span-5 min-w-0 lg:sticky lg:top-4 ${activeTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          <LiveInvoicePreview
            type="purchase"
            documentNumber={currentDocNumber || (activeYear ? `AGC/P/${activeYear.name}/0001` : 'AGC/P/26-27/0001')}
            invoiceDate={recordDate}
            partyName={supplierForm.name}
            partyMobile={supplierForm.mobile}
            partyGstin={supplierForm.gstin}
            partyAddress={supplierForm.address}
            placeOfSupply={supplierForm.state || 'Karnataka'}
            originalInvoiceNumber={originalInvoiceNumber}
            originalInvoiceDate={originalInvoiceDate}
            items={items}
            notes={notes}
            onPrint={() => handleSavePurchase('finalized')}
            onSavePdf={() => handleSavePurchase('finalized')}
            isSaving={isSubmitting}
          />
        </div>
      </div>

      {/* Invoice Print & Preview Modal */}
      {printModalDoc && (
        <InvoicePrintView
          open={!!printModalDoc}
          onOpenChange={(v) => {
            if (!v) {
              setPrintModalDoc(null);
              navigate('/all-bills');
            }
          }}
          type="purchase"
          record={printModalDoc}
        />
      )}
    </div>
  );
}
