import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Receipt,
  FileText,
  Edit,
  ExternalLink,
} from 'lucide-react';
import type { Customer } from '@/types/database';
import { useToast } from '@/hooks/useToast';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadCustomer = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await window.api.db.customers.getById(parseInt(id, 10));
      if (res.success && res.data) {
        setCustomer(res.data);
        setEditForm(res.data);
      }

      // Fetch customer invoices
      const salesRes = await window.api.db.salesInvoices.getAll({ customerId: parseInt(id, 10) });
      const serviceRes = await window.api.db.serviceInvoices.getAll({ customerId: parseInt(id, 10) });

      const allDocs: any[] = [];
      if (salesRes.success && salesRes.data) {
        allDocs.push(...salesRes.data.map((d: any) => ({ ...d, type: 'Sales' })));
      }
      if (serviceRes.success && serviceRes.data) {
        allDocs.push(...serviceRes.data.map((d: any) => ({ ...d, type: 'Service' })));
      }
      allDocs.sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || ''));
      setInvoices(allDocs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleUpdate = async () => {
    if (!customer) return;
    setIsSaving(true);
    try {
      const res = await window.api.db.customers.update(customer.id, editForm);
      if (res.success && res.data) {
        setCustomer(res.data);
        setIsEditDialogOpen(false);
        toast({
          title: 'Profile Updated',
          description: 'Customer profile details updated successfully.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((paise || 0) / 100);
  };

  const handleOpenPdf = async (filePath: string) => {
    const res = await window.api.files.openFile(filePath);
    if (res && !res.success) {
      toast({
        title: 'Unable to Open PDF',
        description: res.error || 'File not found.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-serif text-gray-500">
        Loading customer profile...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-sm font-serif space-y-3">
        <p className="text-gray-500">Customer record not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
          Return to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-serif">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
          className="text-xs text-gray-600 hover:text-[#171717] pl-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Customer Directory
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditDialogOpen(true)}
          className="text-xs flex items-center gap-1.5"
        >
          <Edit className="w-3.5 h-3.5 text-[#C49A35]" />
          Edit Profile
        </Button>
      </div>

      {/* Customer Header Card */}
      <Card className="p-6 border-[#E7E2D7] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#F8F2E4] border border-[#E7E2D7] text-[#A98226] text-xs font-bold">
                {customer.reference_number}
              </span>
              <h1 className="text-2xl font-bold text-[#171717]">
                {customer.name}
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600 pt-2">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{customer.mobile || 'No mobile registered'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{customer.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>GSTIN: <strong>{customer.gstin || 'Unregistered Consumer'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{customer.address || customer.city ? `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''}` : 'No address recorded'}</span>
              </div>
            </div>
          </div>

          {/* Aggregate Business Stats */}
          <div className="flex gap-4 border-l border-[#E7E2D7] pl-6 shrink-0">
            <div>
              <span className="text-[11px] text-gray-400 block uppercase">
                Total Bills
              </span>
              <span className="text-xl font-bold text-[#171717]">
                {customer.total_bills || invoices.length || 0}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block uppercase">
                Cumulative Value
              </span>
              <span className="text-xl font-bold text-[#A98226]">
                {formatCurrency(customer.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction History Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#171717] flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#C49A35]" />
          Transaction & Billing History
        </h2>

        <Card className="overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {invoices.length > 0 ? (
                  invoices.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40">
                      <td className="p-3 font-semibold text-[#171717]">
                        {inv.invoice_number}
                      </td>
                      <td className="p-3 font-medium text-gray-700">
                        {inv.type}
                      </td>
                      <td className="p-3 text-gray-600">
                        {inv.invoice_date}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {formatCurrency(inv.taxable_amount)}
                      </td>
                      <td className="p-3 text-right font-semibold text-[#171717]">
                        {formatCurrency(inv.grand_total)}
                      </td>
                      <td className="p-3 text-right font-medium text-rose-700">
                        {formatCurrency(inv.balance_due)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            inv.payment_status === 'paid'
                              ? 'success'
                              : inv.payment_status === 'partial'
                              ? 'warning'
                              : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {inv.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {inv.pdf_path ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPdf(inv.pdf_path)}
                            className="h-7 text-xs text-[#C49A35]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            PDF
                          </Button>
                        ) : (
                          <span className="text-[10px] text-gray-400">Draft</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No invoices recorded yet for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#171717]">
              Edit Customer Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Customer Name</Label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input
                  value={editForm.mobile || ''}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>GSTIN</Label>
                <Input
                  value={editForm.gstin || ''}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Place of Supply</Label>
                <Input
                  value={editForm.place_of_supply || ''}
                  onChange={(e) => setEditForm({ ...editForm, place_of_supply: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isSaving}
            >
              {isSaving ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
