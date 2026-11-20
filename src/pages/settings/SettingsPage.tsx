import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  FileText,
  Calendar,
  Settings as SettingsIcon,
  Percent,
  FolderOpen,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { CompanyProfile, FinancialYear, TaxRate, HsnCode, SacCode } from '@/types/database';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useToast } from '@/hooks/useToast';
import logoUrl from '@/assets/logo/agc-logo-circular.png';

export function SettingsPage() {
  const { toast } = useToast();
  const { years, activeYear, fetchYears, setActiveYear, createYear } = useFinancialYear();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [profileForm, setProfileForm] = useState<any>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // FY Creation
  const [newFyName, setNewFyName] = useState('');
  const [newFyStart, setNewFyStart] = useState('2027-04-01');
  const [newFyEnd, setNewFyEnd] = useState('2028-03-31');
  const [isCreatingFy, setIsCreatingFy] = useState(false);

  // Tax and Masters
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [sacCodes, setSacCodes] = useState<SacCode[]>([]);

  // Storage & Backup
  const [dataDir, setDataDir] = useState<string>('');
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackups = async () => {
    try {
      const res = await window.api.backup.getHistory();
      if (res.success && res.data) {
        setBackups(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await window.api.backup.create();
      if (res.success && res.data) {
        toast({
          title: 'Backup Successful',
          description: `Created ${res.data.fileName} (${res.data.sizeFormatted}) with verified checksum.`,
        });
        loadBackups();
      } else {
        toast({ title: 'Backup Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Backup Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupPath: string) => {
    if (!window.confirm('Are you sure you want to restore from this backup? A safety snapshot of the current state will be created automatically before restoring.')) {
      return;
    }
    setIsRestoring(true);
    try {
      const res = await window.api.backup.restore(backupPath);
      if (res.success) {
        toast({
          title: 'Restore Complete',
          description: 'Database and documents restored successfully.',
        });
        window.location.reload();
      } else {
        toast({ title: 'Restore Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Restore Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenFolder = async (folderPath: string) => {
    const res = await window.api.files.openFolder(folderPath);
    if (res && !res.success) {
      toast({
        title: 'Unable to Open Folder',
        description: res.error || 'Directory does not exist.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, setRes, taxRes, hsnRes, sacRes, dirRes] = await Promise.all([
          window.api.db.companyProfile.get(),
          window.api.db.settings.getAll(),
          window.api.db.taxRates.getAll(),
          window.api.db.hsnCodes.getAll(),
          window.api.db.sacCodes.getAll(),
          window.api.files.getDataDirectory(),
        ]);

        if (profRes.success && profRes.data) {
          const prof = { ...profRes.data };
          if (!prof.state_code || prof.state_code.length !== 2) {
            prof.state_code = (prof.gstin && prof.gstin.length >= 2) ? prof.gstin.slice(0, 2) : '29';
          }
          setProfile(prof);
          setProfileForm(prof);
        }

        if (setRes.success && setRes.data) {
          const map: Record<string, string> = {};
          setRes.data.forEach((s) => {
            if (s.value !== null) map[s.key] = s.value;
          });
          setSettings(map);
        }

        if (taxRes.success && taxRes.data) setTaxRates(taxRes.data);
        if (hsnRes.success && hsnRes.data) setHsnCodes(hsnRes.data);
        if (sacRes.success && sacRes.data) setSacCodes(sacRes.data);
        if (dirRes.success && dirRes.data) setDataDir(dirRes.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
    loadBackups();
    fetchYears();
  }, [fetchYears]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await window.api.db.companyProfile.update({
        businessName: profileForm.business_name,
        legalName: profileForm.legal_name,
        gstin: profileForm.gstin,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        stateCode: (profileForm.gstin && profileForm.gstin.trim().length >= 2) 
          ? profileForm.gstin.trim().slice(0, 2) 
          : '29',
        pincode: profileForm.pincode,
        phone: profileForm.phone,
        email: (profileForm.email || '').trim().toLowerCase(),
        bankName: profileForm.bank_name,
        bankAccountName: profileForm.bank_account_name,
        bankAccountNumber: profileForm.bank_account_number,
        bankIfsc: profileForm.bank_ifsc,
        bankBranch: profileForm.bank_branch,
        termsSales: profileForm.terms_sales,
        termsService: profileForm.terms_service,
        termsPurchase: profileForm.terms_purchase,
      });

      if (res.success) {
        toast({
          title: 'Profile Saved',
          description: 'Business profile and invoice terms updated successfully.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveBillingSettings = async () => {
    setIsSavingSettings(true);
    try {
      for (const [k, v] of Object.entries(settings)) {
        await window.api.db.settings.set(k, v);
      }
      toast({
        title: 'Settings Saved',
        description: 'Billing configurations updated successfully.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateFy = async () => {
    if (!newFyName.trim()) {
      toast({ title: 'Validation Error', description: 'Financial Year Name is required (e.g. 2027-28)', variant: 'destructive' });
      return;
    }
    setIsCreatingFy(true);
    const res = await createYear({
      name: newFyName.trim(),
      startDate: newFyStart,
      endDate: newFyEnd,
      setActive: false,
    });
    setIsCreatingFy(false);

    if (res.success) {
      toast({ title: 'Financial Year Created', description: `FY ${newFyName} created successfully.`, variant: 'success' });
      setNewFyName('');
    } else {
      toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#C49A35]" />
          System Settings & Configuration
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure business details, GSTIN, invoice design, terms & conditions, and financial years
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="bg-[#F8F2E4] p-1 border border-[#E7E2D7]">
          <TabsTrigger value="business" className="text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="invoice" className="text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Invoice Design & Terms
          </TabsTrigger>
          <TabsTrigger value="fy" className="text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Financial Years
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">
            <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
            Billing Prefixes
          </TabsTrigger>
          <TabsTrigger value="gst" className="text-xs">
            <Percent className="w-3.5 h-3.5 mr-1.5" />
            Tax & HSN/SAC
          </TabsTrigger>
          <TabsTrigger value="storage" className="text-xs">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            Local Storage
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BUSINESS PROFILE */}
        <TabsContent value="business">
          <Card className="p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  Company Legal & Registration Information
                </h3>
                <p className="text-xs text-gray-500">
                  This information appears directly on all generated tax invoices.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile} className="text-xs">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label>Business Trade Name</Label>
                <Input
                  value={profileForm.business_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Legal Registered Name</Label>
                <Input
                  value={profileForm.legal_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, legal_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>GSTIN</Label>
                <Input
                  value={profileForm.gstin || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label>Contact Phone</Label>
                <Input
                  value={profileForm.phone || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Company Email Address</Label>
                <Input
                  type="email"
                  value={profileForm.email || ''}
                  placeholder="anjaneyagoldcompany@gmail.com"
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value.toLowerCase() })}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Registered Office Address</Label>
                <Input
                  value={profileForm.address || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  value={profileForm.city || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Pincode</Label>
                <Input
                  value={profileForm.pincode || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>State</Label>
                <Input
                  value={profileForm.state || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: INVOICE DESIGN & TERMS */}
        <TabsContent value="invoice">
          <Card className="p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  Invoice Layout, Bank Details & Terms & Conditions
                </h3>
                <p className="text-xs text-gray-500">
                  Configure the bank account information and legally required terms for printed A4 documents.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveProfile} disabled={isSavingProfile} className="text-xs">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Circular Logo Preview */}
            <div className="flex items-center gap-4 p-4 bg-[#F8F2E4] rounded-lg border border-[#E7E2D7]">
              <div className="w-16 h-16 rounded-full border-2 border-[#C49A35] p-1 bg-black flex items-center justify-center shrink-0 shadow-sm">
                <img src={logoUrl} alt="AGC Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-bold text-[#171717] block">
                  Original AGC Circular Brand Identity
                </span>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  The original logo artwork is displayed with a metallic-gold circular border (#C49A35) in the top-left of all sales tax invoices, internal purchase summaries, and service invoices.
                </p>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider text-[#A98226]">
                Bank Details (Printed on Invoices)
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input
                    value={profileForm.bank_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Beneficiary Account Name</Label>
                  <Input
                    value={profileForm.bank_account_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input
                    value={profileForm.bank_account_number || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>IFSC Code</Label>
                  <Input
                    value={profileForm.bank_ifsc || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_ifsc: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Branch Location</Label>
                  <Input
                    value={profileForm.bank_branch || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, bank_branch: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Terms and Conditions (Editable in DB per spec) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider text-[#A98226]">
                Sales Invoice Terms & Conditions (Editable)
              </h4>
              <p className="text-[11px] text-gray-500">
                These terms are stored in the database and never hardcoded. Changes apply to newly generated documents only.
              </p>
              <textarea
                rows={7}
                value={profileForm.terms_sales || ''}
                onChange={(e) => setProfileForm({ ...profileForm, terms_sales: e.target.value })}
                className="w-full text-xs p-3 font-serif rounded-md border border-[#E7E2D7] bg-white focus:outline-none focus:ring-1 focus:ring-[#C49A35] leading-relaxed text-[#171717]"
              />
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: FINANCIAL YEARS */}
        <TabsContent value="fy">
          <Card className="p-6 space-y-6 shadow-xs">
            <div className="border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717]">
                Financial Year Management (April – March)
              </h3>
              <p className="text-xs text-gray-500">
                Switch active financial year or configure a new fiscal period. All document numbering and folders stay strictly isolated.
              </p>
            </div>

            {/* Financial Years List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#171717]">Configured Financial Years</h4>
              <div className="space-y-2">
                {years.map((y) => (
                  <div
                    key={y.id}
                    className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                      y.is_active
                        ? 'bg-[#F8F2E4] border-[#C49A35] text-[#171717]'
                        : 'bg-white border-[#E7E2D7] text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">FY {y.name}</span>
                        {y.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C49A35] text-white text-[10px] font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {y.start_date} to {y.end_date}
                      </span>
                    </div>

                    {!y.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveYear(y.id)}
                        className="text-xs h-7"
                      >
                        Set as Active FY
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Create New Financial Year */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#C49A35]" />
                Create New Financial Year
              </h4>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <Label>Name (e.g. 2027-28)</Label>
                  <Input
                    placeholder="2027-28"
                    value={newFyName}
                    onChange={(e) => setNewFyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Start Date (April 1)</Label>
                  <Input
                    type="date"
                    value={newFyStart}
                    onChange={(e) => setNewFyStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Date (March 31)</Label>
                  <Input
                    type="date"
                    value={newFyEnd}
                    onChange={(e) => setNewFyEnd(e.target.value)}
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleCreateFy}
                disabled={isCreatingFy}
                className="text-xs mt-2"
              >
                {isCreatingFy ? 'Creating...' : 'Create Financial Year'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: BILLING CONFIG */}
        <TabsContent value="billing">
          <Card className="p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E7E2D7] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  Document Numbering Sequences & Prefixes
                </h3>
                <p className="text-xs text-gray-500">
                  Independent series format for Sales, Purchases, Services, Customers & Suppliers.
                </p>
              </div>
              <Button size="sm" onClick={handleSaveBillingSettings} disabled={isSavingSettings} className="text-xs">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSavingSettings ? 'Saving...' : 'Save Prefixes'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label>Sales Invoice Prefix</Label>
                <Input
                  value={settings['sales_prefix'] || 'AGC/S'}
                  onChange={(e) => setSettings({ ...settings, sales_prefix: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">Example: AGC/S/26-27/0001</span>
              </div>

              <div className="space-y-1">
                <Label>Dealer Purchase Record Prefix</Label>
                <Input
                  value={settings['purchase_prefix'] || 'AGC/P'}
                  onChange={(e) => setSettings({ ...settings, purchase_prefix: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">Example: AGC/P/26-27/0001</span>
              </div>

              <div className="space-y-1">
                <Label>Service Invoice Prefix</Label>
                <Input
                  value={settings['service_prefix'] || 'AGC/SV'}
                  onChange={(e) => setSettings({ ...settings, service_prefix: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">Example: AGC/SV/26-27/0001</span>
              </div>

              <div className="space-y-1">
                <Label>Customer Reference Prefix</Label>
                <Input
                  value={settings['customer_prefix'] || 'AGC-CUS'}
                  onChange={(e) => setSettings({ ...settings, customer_prefix: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">Example: AGC-CUS-0001</span>
              </div>

              <div className="space-y-1">
                <Label>Supplier Reference Prefix</Label>
                <Input
                  value={settings['supplier_prefix'] || 'AGC-SUP'}
                  onChange={(e) => setSettings({ ...settings, supplier_prefix: e.target.value })}
                />
                <span className="text-[10px] text-gray-400">Example: AGC-SUP-0001</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: GST CONFIG */}
        <TabsContent value="gst">
          <Card className="p-6 space-y-5 shadow-xs">
            <div className="border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717]">
                GST Rates & HSN / SAC Master
              </h3>
              <p className="text-xs text-gray-500">
                Default tax rates and harmonized tariff codes used across billing calculations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* HSN Codes */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#A98226]">Gold & Jewellery HSN Codes</h4>
                <div className="border border-[#E7E2D7] rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7]">
                      <tr>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E2D7]">
                      {hsnCodes.map((h) => (
                        <tr key={h.id}>
                          <td className="p-2 font-mono font-semibold">{h.code}</td>
                          <td className="p-2 text-gray-600 truncate max-w-[180px]">{h.description}</td>
                          <td className="p-2 text-right font-bold text-[#171717]">{h.default_gst_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SAC Codes */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#A98226]">Service SAC Codes</h4>
                <div className="border border-[#E7E2D7] rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7]">
                      <tr>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">GST %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E2D7]">
                      {sacCodes.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td className="p-2 font-mono font-semibold">{s.code}</td>
                          <td className="p-2 text-gray-600 truncate max-w-[180px]">{s.description}</td>
                          <td className="p-2 text-right font-bold text-[#171717]">{s.default_gst_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: LOCAL STORAGE & BACKUP */}
        <TabsContent value="storage">
          <Card className="p-6 space-y-6 shadow-xs">
            <div className="border-b border-[#E7E2D7] pb-3">
              <h3 className="text-sm font-bold text-[#171717]">
                Local Storage & Automated Backup Vault
              </h3>
              <p className="text-xs text-gray-500">
                All business records, SQLite database, PDFs, supplier invoice attachments and Excel reports are preserved locally.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <Label>Current Data Root Directory (Persistent)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={dataDir} className="font-mono bg-gray-50 text-xs" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenFolder(dataDir)}
                    className="text-xs shrink-0 cursor-pointer"
                  >
                    Open in Explorer
                  </Button>
                </div>
                <span className="text-[11px] text-gray-500 block">
                  The AGC_Billing directory holds Documents, Attachments, GST_Reports, Backups and Exports.
                </span>
              </div>

              {/* Instant Backup Trigger Box */}
              <div className="p-5 bg-gradient-to-r from-[#171717] to-[#262626] rounded-lg text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#C49A35]">Create Full System Backup</h4>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Packages SQLite database, PDF documents, supplier invoices, and manifest into a timestamped ZIP archive.
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateBackup}
                    disabled={isBackingUp}
                    className="bg-[#C49A35] hover:bg-[#A98226] text-[#171717] font-bold text-xs cursor-pointer"
                  >
                    {isBackingUp ? 'Creating Backup...' : 'Backup Now (.zip)'}
                  </Button>
                </div>
              </div>

              {/* Previous Backups List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-[#171717]">Available Local Backups ({backups.length})</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadBackups}
                    className="h-6 text-[11px] text-[#A98226]"
                  >
                    Refresh
                  </Button>
                </div>

                {backups.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 border border-dashed border-[#E7E2D7] rounded-md">
                    No backups created yet. Click "Backup Now" to create your first full archive.
                  </div>
                ) : (
                  <div className="border border-[#E7E2D7] rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {backups.map((b, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-[#F8F2E4]/40">
                        <div>
                          <span className="font-bold text-xs text-[#171717]">{b.fileName}</span>
                          <span className="block text-[11px] text-gray-500">
                            Size: {b.sizeFormatted} • Date: {new Date(b.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenFolder(b.filePath)}
                            className="h-7 text-[11px]"
                          >
                            Locate
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRestoreBackup(b.filePath)}
                            disabled={isRestoring}
                            className="h-7 text-[11px]"
                          >
                            {isRestoring ? 'Restoring...' : 'Restore'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
