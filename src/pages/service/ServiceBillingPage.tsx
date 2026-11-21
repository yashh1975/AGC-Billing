import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Wrench,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Eye,
  Search,
  User,
  Calculator,
} from 'lucide-react';
import type { Customer, SacCode } from '@/types/database';
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

export function ServiceBillingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeYear } = useFinancialYear();

  const [printModalDoc, setPrintModalDoc] = useState<any | null>(null);

  // Master lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sacCodes, setSacCodes] = useState<SacCode[]>([]);

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    mobile: '',
    gstin: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
  });

  // Invoice parameters
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [placeOfSupply, setPlaceOfSupply] = useState('Karnataka');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [amountReceivedInput, setAmountReceivedInput] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Screen Mode Switcher on Narrow Windows
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Financial Service presets for AGC (Gold loan takeover, re-pledging, settlement)
  const FINANCIAL_SERVICE_PRESETS = [
    { label: 'Gold Loan Takeover', desc: 'Gold Loan Takeover & Release Service', sac: '9971', principal: 100000, service: 500, gst: 18 },
    { label: 'Gold Re-pledging', desc: 'Gold Re-pledging & Documentation Service', sac: '9971', principal: 50000, service: 500, gst: 18 },
    { label: 'Settlement & Equity Payout', desc: 'Gold Loan Settlement & Balance Equity Payout', sac: '9971', principal: 100000, service: 1000, gst: 18 },
    { label: 'Valuation & Verification', desc: 'Gold Valuation & Purity Verification Service', sac: '9971', principal: 0, service: 500, gst: 18 },
  ];

  // Service line items
  const [items, setItems] = useState<LineItemInput[]>([
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [cRes, sRes] = await Promise.all([
          window.api.db.customers.getAll(),
          window.api.db.sacCodes.getAll(),
        ]);
        if (cRes.success && cRes.data) setCustomers(cRes.data);
        if (sRes.success && sRes.data) setSacCodes(sRes.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadMasters();
  }, []);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerForm({
      name: c.name,
      mobile: c.mobile || '',
      gstin: c.gstin || '',
      address: c.address || '',
      city: c.city || 'Bengaluru',
      state: c.state || 'Karnataka',
      stateCode: c.state_code || '29',
    });
    setPlaceOfSupply(c.place_of_supply || c.state || 'Karnataka');
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerForm({
      name: '',
      mobile: '',
      gstin: '',
      address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
    });
    setPlaceOfSupply('Karnataka');
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
        description: 'Gold Re-pledging & Documentation Service',
        category: 'Financial Service',
        sacCode: '9971',
        quantity: 1,
        principalAmount: 50000,
        serviceAmount: 500,
        rate: 500,
        makingCharges: 0,
        otherCharges: 0,
        discount: 0,
        gstRate: 18,
        isTaxInclusive: false,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const calculation = calculateInvoice(
    items,
    'Karnataka',
    placeOfSupply,
    amountReceivedInput,
    'service'
  );

  const handleSaveInvoice = async (status: 'draft' | 'finalized') => {
    if (!customerForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer name is required.',
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
        description: 'Please add at least one service item before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (calculation.grandTotalPaise <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Service invoice total must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        financialYearId: activeYear.id,
        customerId: selectedCustomerId,
        customer: selectedCustomerId ? null : customerForm,
        invoiceDate,
        placeOfSupply,
        supplyType: calculation.supplyType,
        subtotal: calculation.subtotalPaise,
        totalDiscount: calculation.totalDiscountPaise,
        taxableAmount: calculation.taxableAmountPaise,
        cgstAmount: calculation.cgstAmountPaise,
        sgstAmount: calculation.sgstAmountPaise,
        igstAmount: calculation.igstAmountPaise,
        roundOff: calculation.roundOffPaise,
        grandTotal: calculation.grandTotalPaise,
        amountReceived: calculation.amountReceivedPaise,
        balanceDue: calculation.balanceDuePaise,
        paymentMode,
        paymentReference,
        status,
        notes,
        items: calculation.items,
      };

      const res = await window.api.db.serviceInvoices.create(payload);

      if (res.success && res.data) {
        toast({
          title: status === 'finalized' ? 'Service Invoice Finalized' : 'Draft Saved',
          description: `Service invoice ${res.data.invoice_number} created successfully.`,
          variant: 'success',
        });

        if (status === 'finalized') {
          // Immediately fetch the recorded full doc to show preview & save/open PDF modal
          const fullRes = await window.api.db.serviceInvoices.getById(res.data.id);
          if (fullRes.success && fullRes.data) {
            setPrintModalDoc(fullRes.data);
            return;
          }
        }
        navigate('/all-bills');
      } else {
        toast({
          title: 'Operation Failed',
          description: res.error || 'Failed to record service invoice.',
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
            <Wrench className="w-5 h-5 text-[#C49A35]" />
            Financial Services Billing
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Issue GST tax invoices for gold loan takeover, gold re-pledging, loan settlement, and valuation services (SAC 9971 — 18% GST)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSaveInvoice('draft')}
            disabled={isSubmitting}
            className="text-xs flex items-center gap-1.5 h-8 px-3"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveInvoice('finalized')}
            disabled={isSubmitting}
            className="text-xs flex items-center gap-1.5 font-bold h-8 px-4 bg-[#171717] text-[#C49A35] hover:bg-[#2c2c2c]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Finalize Invoice
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
            Service Form
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
        {/* Left Column: Service Billing Entry Form */}
        <div className={`lg:col-span-7 min-w-0 space-y-6 ${activeTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* Customer Selection Card */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <User className="w-4 h-4 text-[#C49A35]" />
                Customer Billing Information
              </h3>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs text-[#A98226] hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Quick Customer Search Picker */}
            {!selectedCustomerId && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search existing customer by name, mobile, or GSTIN..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
                {customerSearch.trim().length > 1 && (
                  <div className="absolute left-0 right-0 top-10 bg-white border border-[#E7E2D7] rounded-md shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-[#E7E2D7]">
                    {customers
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.mobile && c.mobile.includes(customerSearch)) ||
                          (c.gstin && c.gstin.toLowerCase().includes(customerSearch.toLowerCase()))
                      )
                      .slice(0, 5)
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            handleSelectCustomer(c);
                            setCustomerSearch('');
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-[#171717]">{c.name}</span>
                            <span className="text-gray-500 ml-2">({c.mobile || 'No contact'})</span>
                          </div>
                          <span className="text-xs text-[#A98226] font-semibold">
                            {c.reference_number}
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
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  placeholder="Client name"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mobile Number</Label>
                <Input
                  placeholder="10-digit mobile"
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer GSTIN (B2B)</Label>
                <Input
                  placeholder="15-digit GSTIN (optional)"
                  value={customerForm.gstin}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, gstin: e.target.value.toUpperCase() })
                  }
                  className="h-9 text-sm font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Place of Supply (State) *</Label>
                <Input
                  placeholder="e.g. Karnataka"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  placeholder="Customer address"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Invoice Parameters Card */}
          <Card className="p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tax Supply Type</Label>
                <div className="h-9 flex items-center px-3 bg-[#F8F2E4] rounded-md border border-[#E7E2D7] text-xs font-bold text-[#A98226]">
                  {calculation.supplyType === 'intra'
                    ? 'Intrastate (CGST + SGST)'
                    : 'Interstate (IGST)'}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Financial Year</Label>
                <div className="h-9 flex items-center px-3 bg-[#F8F2E4] rounded-md border border-[#E7E2D7] text-xs font-bold text-[#171717]">
                  {activeYear ? `FY ${activeYear.name}` : 'FY 2026-27'}
                </div>
              </div>
            </div>
          </Card>

          {/* Service Items Table with Generous Width & Clean Inputs */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E2D7] pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  Financial Service Charges (SAC 9971)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Gold loan takeover, re-pledging, settlement, and appraisal fees
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addItemRow} className="text-xs h-8 shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Service Item
              </Button>
            </div>

            {/* Quick Service Preset Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick Presets:</span>
              {FINANCIAL_SERVICE_PRESETS.map((preset, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    setItems([
                      ...items,
                      {
                        description: preset.desc,
                        category: 'Financial Service',
                        sacCode: preset.sac,
                        quantity: 1,
                        principalAmount: preset.principal,
                        serviceAmount: preset.service,
                        rate: preset.service,
                        makingCharges: 0,
                        otherCharges: 0,
                        discount: 0,
                        gstRate: preset.gst,
                        isTaxInclusive: false,
                      },
                    ]);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-[#F8F2E4] hover:bg-[#EBDDC3] text-[#171717] rounded border border-[#E7E2D7] font-medium transition-colors cursor-pointer"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border border-[#E7E2D7]">
              <table className="w-full text-xs text-left min-w-[850px]">
                <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                  <tr>
                    <th className="p-2.5 w-56 min-w-[180px] font-bold">Service Description</th>
                    <th className="p-2.5 w-20 min-w-[70px] font-bold">SAC</th>
                    <th className="p-2.5 w-32 min-w-[120px] text-right font-bold">
                      <div>Principal Amt (₹)</div>
                      <div className="text-[9px] font-normal text-gray-500">(Loan Principal)</div>
                    </th>
                    <th className="p-2.5 w-28 min-w-[110px] text-right font-bold">
                      <div>Service Fee (₹)</div>
                      <div className="text-[9px] font-normal text-gray-500">(Taxed Amount)</div>
                    </th>
                    <th className="p-2.5 w-20 min-w-[75px] text-right font-bold">Disc (₹)</th>
                    <th className="p-2.5 w-16 min-w-[60px] text-center font-bold">GST %</th>
                    <th className="p-2.5 w-24 min-w-[90px] text-right font-bold">Taxable (₹)</th>
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
                            placeholder="e.g. Gold Loan Takeover & Release Service"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.sacCode}
                            onChange={(e) => handleItemChange(idx, 'sacCode', e.target.value)}
                            className="h-9 text-sm font-mono text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="1"
                            placeholder="e.g. 100000"
                            value={item.principalAmount !== undefined ? item.principalAmount : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleItemChange(idx, 'principalAmount', val);
                            }}
                            className="h-9 text-sm text-right font-semibold text-emerald-800"
                            title="Loan Principal Amount (Disbursed/Takeover). Not subject to GST."
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            value={item.serviceAmount !== undefined ? item.serviceAmount : (item.rate || '')}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...items];
                              updated[idx] = {
                                ...updated[idx],
                                serviceAmount: val,
                                rate: val,
                              };
                              setItems(updated);
                            }}
                            className="h-9 text-sm text-right font-bold text-[#171717]"
                            title="Service Facilitation Fee. 18% GST applies strictly on this amount."
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
                            className="h-9 text-sm text-center font-bold"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-[#171717] text-sm">
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

          {/* Payment Settlement Card */}
          <Card className="p-5 space-y-4 shadow-xs">
            <h4 className="font-bold text-sm text-[#171717] border-b border-[#E7E2D7] pb-2">
              Payment Settlement
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Mode</Label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full h-9 px-2 text-sm bg-white border border-[#E7E2D7] rounded-md text-[#171717]"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / GPay</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount Received (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountReceivedInput || ''}
                  onChange={(e) => setAmountReceivedInput(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm text-right font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payment Ref</Label>
                <Input
                  placeholder="Optional reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E7E2D7]">
              <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-md border border-emerald-200">
                <span className="text-emerald-800 font-semibold">Received Amount:</span>
                <span className="font-bold font-mono text-emerald-700">
                  {formatRupees(calculation.amountReceivedPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm p-3 bg-rose-50 rounded-md border border-rose-200">
                <span className="text-rose-800 font-semibold">Balance Due:</span>
                <span className="font-bold font-mono text-rose-700">
                  {formatRupees(calculation.balanceDuePaise)}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold">Internal Notes</Label>
              <Input
                placeholder="Remarks or internal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Live A4 PDF Preview (Sticky & Synchronized) */}
        <div className={`lg:col-span-5 min-w-0 lg:sticky lg:top-4 ${activeTab === 'form' ? 'hidden lg:block' : 'block'}`}>
          <LiveInvoicePreview
            type="service"
            documentNumber={activeYear ? `SRV/${activeYear.name}/0001` : 'SRV/2026-27/0001'}
            invoiceDate={invoiceDate}
            partyName={customerForm.name}
            partyMobile={customerForm.mobile}
            partyGstin={customerForm.gstin}
            partyAddress={customerForm.address}
            partyCity={customerForm.city}
            partyState={customerForm.state}
            placeOfSupply={placeOfSupply}
            items={items}
            notes={notes}
            onPrint={() => handleSaveInvoice('finalized')}
            onSavePdf={() => handleSaveInvoice('finalized')}
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
          type="service"
          record={printModalDoc}
        />
      )}
    </div>
  );
}
