import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, UserPlus, Eye, Users, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import type { Customer } from '@/types/database';
import { useToast } from '@/hooks/useToast';

export function CustomersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any[] | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    gstin: '',
    placeOfSupply: 'Karnataka',
  });

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.db.customers.getAll();
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadCustomers();
      return;
    }
    try {
      const res = await window.api.db.customers.search(query.trim());
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      gstin: '',
      placeOfSupply: 'Karnataka',
    });
    setDialogError(null);
    setDuplicateWarning(null);
    setIsDialogOpen(true);
  };

  const handleSaveCustomer = async (force: boolean = false) => {
    setDialogError(null);
    if (!formData.name.trim()) {
      setDialogError('Customer name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await window.api.db.customers.create({
        ...formData,
        forceCreate: force,
      });

      if (!res.success) {
        if (res.error === 'duplicate' && res.duplicates) {
          setDuplicateWarning(res.duplicates);
          setIsSubmitting(false);
          return;
        }
        setDialogError(res.error || 'Failed to save customer.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'Customer Added',
        description: `Successfully added ${res.data?.name} (${res.data?.reference_number})`,
        variant: 'success',
      });

      setIsDialogOpen(false);
      loadCustomers();
    } catch (err: any) {
      setDialogError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((paise || 0) / 100);
  };

  return (
    <div className="space-y-6 font-serif">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E7E2D7] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C49A35]" />
            Customer Directory
          </h1>
        </div>

        <Button size="sm" onClick={handleOpenAdd} className="text-xs flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          Add Customer
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search by name, mobile, GSTIN, reference..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto font-medium">
            Showing {customers.length} customer records
          </span>
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F2E4] border-b border-[#E7E2D7] text-[#171717]">
              <tr>
                <th className="p-3">Reference #</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-center">Bills</th>
                <th className="p-3 text-right">Total Business</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2D7]">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-[#A98226]">
                      {c.reference_number}
                    </td>
                    <td className="p-3 font-medium text-[#171717]">
                      {c.name}
                    </td>
                    <td className="p-3 text-gray-600">
                      {c.mobile || '—'}
                    </td>
                    <td className="p-3 text-gray-600 font-mono">
                      {c.gstin || 'Unregistered'}
                    </td>
                    <td className="p-3 text-gray-600">
                      {c.city || c.state || '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
                        {c.total_bills || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-[#171717]">
                      {formatCurrency(c.total_amount)}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${c.id}`);
                        }}
                        className="h-7 text-xs text-[#A98226] hover:bg-[#F8F2E4]"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Profile
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    {isLoading ? 'Loading customer accounts...' : 'No customer records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#171717]">
              Add New Customer Record
            </DialogTitle>
          </DialogHeader>

          {dialogError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{dialogError}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Possible Duplicate Record Detected</span>
              </div>
              <p className="text-[11px]">
                A customer already exists with matching {duplicateWarning.map(d => d.type).join(', ')}:
              </p>
              <div className="bg-white p-2 rounded border border-amber-200 text-[11px]">
                {duplicateWarning.map((d, i) => (
                  <div key={i}>
                    <strong>{d.record.name}</strong> ({d.record.reference_number}) - Mobile: {d.record.mobile || 'N/A'}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveCustomer(true)}
                  className="text-xs h-7"
                >
                  Create Anyway
                </Button>
              </div>
            </div>
          )}

          {!duplicateWarning && (
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Customer Name *</Label>
                <Input
                  placeholder="Full name or company name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Mobile Number</Label>
                  <Input
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>GSTIN (Optional)</Label>
                  <Input
                    placeholder="15-character GSTIN"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Address</Label>
                <Input
                  placeholder="Street / locality"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>State Code</Label>
                  <Input
                    value={formData.stateCode}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!duplicateWarning && (
              <Button
                size="sm"
                onClick={() => handleSaveCustomer(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Customer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
