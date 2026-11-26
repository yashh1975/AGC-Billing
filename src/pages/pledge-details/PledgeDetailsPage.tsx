import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Landmark,
  Plus,
  Search,
  FileSpreadsheet,
  FolderOpen,
  Users,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  Coins,
  MapPin,
  Phone,
  FileCheck,
  RefreshCw,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { PledgeRecord } from '@/types/database';

export function PledgeDetailsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'input' | 'list'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'released' | 'closed'>('all');

  // Pledge records state
  const [pledges, setPledges] = useState<PledgeRecord[]>([]);
  const [stats, setStats] = useState({
    totalPledges: 0,
    distinctPeople: 0,
    activePledges: 0,
    totalPrincipal: 0,
    totalPledgeAmount: 0,
  });

  // Form input state
  const initialForm = {
    recordDate: new Date().toISOString().slice(0, 10),
    customerName: '',
    phoneNumber: '',
    customerAddress: '',
    principalAmount: '',
    interestRate: '',
    pledgeDate: new Date().toISOString().slice(0, 10),
    pledgedName: '',
    pledgedItemName: '',
    pledgePlace: '',
    pledgeAmount: '',
    pledgeInterest: '',
    status: 'active' as 'active' | 'released' | 'closed',
    notes: '',
  };

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Pledges
  const loadPledges = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.db.pledges.getAll({
        search: searchQuery,
        status: statusFilter,
      });
      if (res.success && res.data) {
        setPledges(res.data.records);
        setStats(res.data.stats);
      }
    } catch (err: any) {
      console.error('Failed to load pledges:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load pledge records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPledges();
  }, [statusFilter]);

  // Handle Search on Enter or debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPledges();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatPercentage = (val?: string | null): string => {
    if (!val || !val.trim()) return '—';
    const t = val.trim();
    return t.includes('%') ? t : `${t}%`;
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Customer Name is required.',
        variant: 'destructive',
      });
      return;
    }

    const ensurePct = (val: string) => {
      const t = val.trim();
      if (!t) return undefined;
      return t.includes('%') ? t : `${t}%`;
    };

    setIsSaving(true);
    try {
      const payload = {
        recordDate: form.recordDate,
        customerName: form.customerName.trim(),
        customerAddress: form.customerAddress.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        principalAmount: parseFloat(form.principalAmount) || 0,
        interestRate: ensurePct(form.interestRate),
        pledgeDate: form.pledgeDate || undefined,
        pledgedName: form.pledgedName.trim() || undefined,
        pledgedItemName: form.pledgedItemName.trim() || undefined,
        pledgePlace: form.pledgePlace.trim() || undefined,
        pledgeAmount: parseFloat(form.pledgeAmount) || 0,
        pledgeInterest: ensurePct(form.pledgeInterest),
        status: form.status,
        notes: form.notes.trim() || undefined,
      };

      if (editingId) {
        const res = await window.api.db.pledges.update(editingId, payload);
        if (res.success) {
          toast({
            title: 'Pledge Updated',
            description: `Pledge record for ${form.customerName} updated successfully.`,
            variant: 'success',
          });
          setEditingId(null);
          setForm(initialForm);
          setActiveTab('list');
          loadPledges();
        } else {
          throw new Error(res.error || 'Failed to update pledge record');
        }
      } else {
        const res = await window.api.db.pledges.create(payload);
        if (res.success) {
          toast({
            title: 'Pledge Recorded',
            description: `Pledge record for ${form.customerName} saved successfully.`,
            variant: 'success',
          });
          setForm(initialForm);
          setActiveTab('list');
          loadPledges();
        } else {
          throw new Error(res.error || 'Failed to save pledge record');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save pledge record.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Start Edit
  const handleEdit = (p: PledgeRecord) => {
    setEditingId(p.id);
    setForm({
      recordDate: p.record_date || '',
      customerName: p.customer_name || '',
      phoneNumber: p.phone_number || '',
      customerAddress: p.customer_address || '',
      principalAmount: p.principal_amount ? String(p.principal_amount) : '',
      interestRate: p.interest_rate || '',
      pledgeDate: p.pledge_date || '',
      pledgedName: p.pledged_name || '',
      pledgedItemName: p.pledged_item_name || '',
      pledgePlace: p.pledge_place || '',
      pledgeAmount: p.pledge_amount ? String(p.pledge_amount) : '',
      pledgeInterest: p.pledge_interest || '',
      status: (p.status as any) || 'active',
      notes: p.notes || '',
    });
    setActiveTab('input');
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  // Delete Pledge
  const handleDelete = async (p: PledgeRecord) => {
    if (!window.confirm(`Are you sure you want to permanently delete the pledge record for "${p.customer_name}"?`)) {
      return;
    }
    try {
      const res = await window.api.db.pledges.delete(p.id);
      if (res.success) {
        toast({
          title: 'Record Deleted',
          description: `Pledge for ${p.customer_name} removed.`,
          variant: 'success',
        });
        loadPledges();
      } else {
        throw new Error(res.error || 'Failed to delete record');
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (p: PledgeRecord) => {
    const nextStatus = p.status === 'active' ? 'released' : 'active';
    try {
      const res = await window.api.db.pledges.update(p.id, { status: nextStatus });
      if (res.success) {
        toast({
          title: 'Status Updated',
          description: `Pledge for ${p.customer_name} marked as ${nextStatus.toUpperCase()}.`,
          variant: 'success',
        });
        loadPledges();
      }
    } catch (err: any) {
      toast({
        title: 'Status Update Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await window.api.db.pledges.exportExcel();
      if (res.success && res.data) {
        toast({
          title: 'Excel Export Successful',
          description: `Exported ${res.data.totalRecords} pledge records to Excel and opened in your spreadsheet viewer.`,
          variant: 'success',
        });
      } else {
        throw new Error(res.error || 'Failed to export excel');
      }
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Could not export Excel file.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Open Excel Export Folder
  const handleOpenFolder = async () => {
    try {
      const res = await window.api.db.pledges.openFolder();
      if (!res.success) {
        throw new Error(res.error || 'Failed to open folder');
      }
    } catch (err: any) {
      toast({
        title: 'Could Not Open Folder',
        description: err.message || 'Please check folder permissions.',
        variant: 'destructive',
      });
    }
  };

  const formatRupees = (amt: number) => {
    return '₹' + (amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#C49A35]" />
            Pledge Details Registry
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5"
            title="Export all pledge records to Microsoft Excel workbook"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {isExporting ? 'Exporting...' : 'Export to Excel (.xlsx)'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenFolder}
            className="text-xs border-amber-600 text-amber-900 hover:bg-amber-50 flex items-center gap-1.5"
            title="Open exported Excel folder in File Explorer"
          >
            <FolderOpen className="w-4 h-4 text-amber-700" />
            View in Folder
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (activeTab === 'input') {
                setActiveTab('list');
              } else {
                setEditingId(null);
                setForm(initialForm);
                setActiveTab('input');
              }
            }}
            className="text-xs flex items-center gap-1.5"
          >
            {activeTab === 'input' ? (
              <>
                <Users className="w-4 h-4" />
                View Pledged List
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Record New Pledge
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Distinct People Pledged */}
        <Card className="border-t-4 border-t-[#C49A35] shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>People Pledged</span>
              <Users className="w-4 h-4 text-[#C49A35]" />
            </div>
            <div className="text-2xl font-bold text-[#171717] mt-1.5 font-mono">
              {stats.distinctPeople}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Total individual borrowers
            </div>
          </CardContent>
        </Card>

        {/* Active Pledges */}
        <Card className="border-t-4 border-t-amber-600 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Active Pledges</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1.5 font-mono">
              {stats.activePledges} <span className="text-xs font-normal text-gray-500 font-sans">/ {stats.totalPledges} total</span>
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Currently unreleased items
            </div>
          </CardContent>
        </Card>

        {/* Total Principal Disbursed */}
        <Card className="border-t-4 border-t-[#171717] shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Total Principal</span>
              <Coins className="w-4 h-4 text-gray-800" />
            </div>
            <div className="text-xl font-bold text-[#171717] mt-1.5 font-mono truncate">
              {formatRupees(stats.totalPrincipal)}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Combined customer principal
            </div>
          </CardContent>
        </Card>

        {/* Total Pledged Amount */}
        <Card className="border-t-4 border-t-emerald-600 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Total Pledge Value</span>
              <Landmark className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1.5 font-mono truncate">
              {formatRupees(stats.totalPledgeAmount)}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">
              Total bank/institution valuation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-2">
          <TabsList className="bg-[#F8F2E4] p-1 border border-[#E7E2D7]">
            <TabsTrigger value="input" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-[#171717] data-[state=active]:text-white">
              <Plus className="w-3.5 h-3.5" />
              {editingId ? 'Edit Pledge Entry' : 'Input Detail (New Pledge)'}
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs flex items-center gap-1.5 data-[state=active]:bg-[#171717] data-[state=active]:text-white">
              <Users className="w-3.5 h-3.5" />
              Pledged People List ({pledges.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'list' && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadPledges}
                className="h-8 text-xs text-gray-600 hover:text-black flex items-center gap-1"
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SUBSECTION 1: INPUT DETAIL SUBSECTION */}
        {/* ───────────────────────────────────────────────────────────── */}
        <TabsContent value="input" className="space-y-4 m-0">
          <Card className="p-6 shadow-xs border-[#E7E2D7]">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-[#171717] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#C49A35]" />
                  {editingId ? `Edit Pledge Record #${editingId}` : 'Record New Customer Pledge'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter all customer details, loan principal, interest terms, and institution pledge information.
                </p>
              </div>

              {editingId && (
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="text-xs">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel Edit
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Group 1: Record Date & Customer Details */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#A98226] uppercase tracking-wider block border-b border-gray-100 pb-1">
                  1. Customer & Record Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Record Date *</Label>
                    <Input
                      type="date"
                      required
                      value={form.recordDate}
                      onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-gray-700">Customer Name *</Label>
                    <Input
                      placeholder="e.g. Ramesh Kumar / Smt. Lakshmi Devi"
                      required
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Phone Number (Ph. No)</Label>
                    <Input
                      placeholder="e.g. 9845012345"
                      value={form.phoneNumber}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Customer Address</Label>
                  <Input
                    placeholder="Full residential or contact address, Bengaluru, Karnataka"
                    value={form.customerAddress}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Group 2: Customer Loan Terms (Principal & Interest) */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-[#A98226] uppercase tracking-wider block border-b border-gray-100 pb-1">
                  2. Loan Terms (Principal & Customer Interest)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Principal Amount (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      required
                      value={form.principalAmount}
                      onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Interest (Customer Rate %)</Label>
                    <div className="relative flex items-center">
                      <Input
                        placeholder="e.g. 2.0"
                        value={form.interestRate}
                        onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                        className="h-9 text-xs pr-8 font-mono font-medium"
                      />
                      <span className="absolute right-2.5 text-xs font-bold text-gray-500 select-none pointer-events-none">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Status</Label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      className="w-full h-9 px-3 rounded-md border border-[#E7E2D7] bg-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#C49A35]"
                    >
                      <option value="active">Active (Currently Pledged)</option>
                      <option value="released">Released / Completed</option>
                      <option value="closed">Closed / Settled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 3: Institutional Pledge Details (Where, Item, Date, Amount, Interest) */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-[#A98226] uppercase tracking-wider block border-b border-gray-100 pb-1">
                  3. Pledge Institution & Pledged Item Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Date</Label>
                    <Input
                      type="date"
                      value={form.pledgeDate}
                      onChange={(e) => setForm({ ...form, pledgeDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Name (Name on Pledge Slip)</Label>
                    <Input
                      placeholder="e.g. Yashwanth / Ramesh Kumar"
                      value={form.pledgedName}
                      onChange={(e) => setForm({ ...form, pledgedName: e.target.value })}
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledged Item Name</Label>
                    <Input
                      placeholder="e.g. Gold Chain (24g), 2 Bangles (30g)"
                      value={form.pledgedItemName}
                      onChange={(e) => setForm({ ...form, pledgedItemName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Place (Bank / NBFC / Shop)</Label>
                    <Input
                      placeholder="e.g. Muthoot Finance / Canara Bank / Manappuram"
                      value={form.pledgePlace}
                      onChange={(e) => setForm({ ...form, pledgePlace: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.pledgeAmount}
                      onChange={(e) => setForm({ ...form, pledgeAmount: e.target.value })}
                      className="h-9 text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Pledge Interest (% Rate)</Label>
                    <div className="relative flex items-center">
                      <Input
                        placeholder="e.g. 1.2"
                        value={form.pledgeInterest}
                        onChange={(e) => setForm({ ...form, pledgeInterest: e.target.value })}
                        className="h-9 text-xs pr-8 font-mono font-medium"
                      />
                      <span className="absolute right-2.5 text-xs font-bold text-gray-500 select-none pointer-events-none">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-gray-700">Internal Remarks / Notes</Label>
                  <Input
                    placeholder="Loan account number or packet details..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E2D7]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                  className="text-xs"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="text-xs px-6 bg-[#171717] hover:bg-black text-white font-semibold"
                >
                  {isSaving ? 'Saving Pledge...' : editingId ? 'Update Pledge Record' : 'Save Pledge Entry'}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SUBSECTION 2: PLLEDGED LIST SUBSECTION */}
        {/* ───────────────────────────────────────────────────────────── */}
        <TabsContent value="list" className="space-y-4 m-0">
          {/* Search & Filter Bar */}
          <Card className="p-4 shadow-xs border-[#E7E2D7]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Search by customer, phone, item, place..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex rounded-md border border-[#E7E2D7] overflow-hidden bg-white text-xs">
                  {(['all', 'active', 'released', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        statusFilter === st
                          ? 'bg-[#171717] text-white font-semibold'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="h-9 text-xs border-emerald-600 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Export Excel
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFolder}
                  className="h-9 text-xs border-amber-600 text-amber-900 hover:bg-amber-50 flex items-center gap-1.5"
                  title="Open exported Excel folder in File Explorer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-700" />
                  View in Folder
                </Button>
              </div>
            </div>
          </Card>

          {/* Table Container */}
          <Card className="shadow-xs border-[#E7E2D7] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#171717] text-white uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Customer & Contact</th>
                    <th className="py-2.5 px-3 font-semibold">Pledge Name</th>
                    <th className="py-2.5 px-3 font-semibold">Address</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Principal Amt</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Interest (%)</th>
                    <th className="py-2.5 px-3 font-semibold">Pledged Item</th>
                    <th className="py-2.5 px-3 font-semibold">Pledge Place</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Pledge Amt</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Pledge Interest (%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D7] bg-white text-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-gray-500 italic">
                        Loading pledge records from database...
                      </td>
                    </tr>
                  ) : pledges.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-700">No pledge records found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {searchQuery ? 'Try clearing your search term' : 'Use the Input Detail subsection above to record customer pledges'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pledges.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#FDFBF7] transition-colors">
                        <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-900">
                          {p.record_date}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900">{p.customer_name}</div>
                          {p.phone_number && (
                            <div className="text-[11px] text-gray-500 flex items-center gap-1 font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-[#A98226]" />
                              {p.phone_number}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-gray-900 block">{p.pledged_name || p.customer_name || '—'}</span>
                        </td>
                        <td className="py-3 px-3 max-w-[180px] truncate text-gray-600" title={p.customer_address || ''}>
                          {p.customer_address || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatRupees(p.principal_amount)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200 text-xs font-mono">
                            {formatPercentage(p.interest_rate)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-gray-900">{p.pledged_item_name || '—'}</div>
                          {p.pledge_date && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              Pledged: {p.pledge_date}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-medium text-[11px]">
                            <Landmark className="w-3 h-3 text-gray-500" />
                            {p.pledge_place || 'Direct'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {formatRupees(p.pledge_amount)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 text-xs font-mono">
                            {formatPercentage(p.pledge_interest)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            title="Click to toggle status (Active / Released)"
                            className="cursor-pointer"
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 capitalize font-bold cursor-pointer transition-colors ${
                                p.status === 'active'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : p.status === 'released'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                            >
                              {p.status}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(p)}
                              className="h-7 w-7 p-0 text-gray-600 hover:text-black hover:bg-gray-100"
                              title="Edit record"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p)}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                              title="Delete pledge record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {pledges.length > 0 && (
                  <tfoot className="bg-[#F8F2E4] font-bold text-gray-900 border-t-2 border-[#171717]">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wide">
                        Total ({pledges.length} Records)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                        {formatRupees(pledges.reduce((acc, r) => acc + (Number(r.principal_amount) || 0), 0))}
                      </td>
                      <td></td>
                      <td colSpan={2}></td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 whitespace-nowrap">
                        {formatRupees(pledges.reduce((acc, r) => acc + (Number(r.pledge_amount) || 0), 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default PledgeDetailsPage;
