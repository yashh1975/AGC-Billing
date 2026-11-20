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
  ShoppingCart,
  Edit,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import type { Supplier } from '@/types/database';
import { useToast } from '@/hooks/useToast';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadSupplier = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await window.api.db.suppliers.getById(parseInt(id, 10));
      if (res.success && res.data) {
        setSupplier(res.data);
        setEditForm(res.data);
      }

      // Fetch supplier purchases
      const purchaseRes = await window.api.db.dealerPurchases.getAll({ supplierId: parseInt(id, 10) });
      if (purchaseRes.success && purchaseRes.data) {
        setPurchases(purchaseRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const handleUpdate = async () => {
    if (!supplier) return;
    setIsSaving(true);
    try {
      const res = await window.api.db.suppliers.update(supplier.id, editForm);
      if (res.success && res.data) {
        setSupplier(res.data);
        setIsEditDialogOpen(false);
        toast({
          title: 'Profile Updated',
          description: 'Dealer supplier details updated successfully.',
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

  const handleOpenFile = async (filePath: string) => {
    const res = await window.api.files.openFile(filePath);
    if (res && !res.success) {
      toast({
        title: 'Unable to Open Document',
        description: res.error || 'File not found.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-serif text-gray-500">
        Loading supplier profile...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center text-sm font-serif space-y-3">
        <p className="text-gray-500">Supplier record not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}>
          Return to Suppliers
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
          onClick={() => navigate('/suppliers')}
          className="text-xs text-gray-600 hover:text-[#171717] pl-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Supplier Directory
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

      {/* Supplier Profile Header Card */}
      <Card className="p-6 border-[#E7E2D7] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#F8F2E4] border border-[#E7E2D7] text-[#A98226] text-xs font-bold">
                {supplier.reference_number}
              </span>
              <h1 className="text-2xl font-bold text-[#171717]">
                {supplier.name}
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600 pt-2">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{supplier.mobile || 'No contact number'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{supplier.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>GSTIN: <strong>{supplier.gstin || 'Unregistered'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C49A35]" />
                <span>{supplier.address || supplier.city ? `${supplier.address || ''}, ${supplier.city || ''}, ${supplier.state || ''}` : 'No address recorded'}</span>
              </div>
            </div>
          </div>

          {/* Aggregate Stats */}
          <div className="flex gap-4 border-l border-[#E7E2D7] pl-6 shrink-0">
            <div>
              <span className="text-[11px] text-gray-400 block uppercase">
                Purchase Records
              </span>
              <span className="text-xl font-bold text-[#171717]">
                {supplier.total_bills || purchases.length || 0}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block uppercase">
                Total Sourced
              </span>
              <span className="text-xl font-bold text-[#A98226]">
                {formatCurrency(supplier.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Purchase History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#171717] flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#C49A35]" />
            Dealer Purchase Invoices Recorded
          </h2>
          <span className="text-xs text-gray-500">
            Note: AGC internal records summarize dealer invoices.
          </span>
        </div>

        <Card className="overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
                <tr>
                  <th className="p-3">AGC Record #</th>
                  <th className="p-3">Original Invoice #</th>
                  <th className="p-3">Inv Date</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Attachment</th>
                  <th className="p-3 text-center">Summary PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D7]">
                {purchases.length > 0 ? (
                  purchases.map((p, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/40">
                      <td className="p-3 font-semibold text-[#171717]">
                        {p.record_number}
                      </td>
                      <td className="p-3 font-medium text-gray-800">
                        {p.original_invoice_number || '—'}
                      </td>
                      <td className="p-3 text-gray-600">
                        {p.original_invoice_date || p.record_date}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {formatCurrency(p.taxable_amount)}
                      </td>
                      <td className="p-3 text-right font-semibold text-[#171717]">
                        {formatCurrency(p.grand_total)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={
                            p.payment_status === 'paid'
                              ? 'success'
                              : p.payment_status === 'partial'
                              ? 'warning'
                              : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {p.payment_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {p.attachment_path ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFile(p.attachment_path)}
                            className="h-7 text-xs text-blue-600 hover:text-blue-800"
                            title="Open original dealer invoice"
                          >
                            <Paperclip className="w-3.5 h-3.5 mr-1" />
                            Dealer Doc
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {p.pdf_path ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenFile(p.pdf_path)}
                            className="h-7 text-xs text-[#A98226]"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Internal PDF
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No purchase invoices recorded yet for this supplier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#171717]">
              Edit Supplier Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label>Supplier Name</Label>
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
                <Label>State</Label>
                <Input
                  value={editForm.state || ''}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
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
