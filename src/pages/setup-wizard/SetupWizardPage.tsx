import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ArrowLeft, Building2, User, Landmark, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import logoUrl from '@/assets/logo/agc-logo-circular.png';

export function SetupWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Business
    businessName: 'Anjaneya Gold Company',
    legalName: '',
    gstin: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    stateCode: '29',
    pincode: '',
    phone: '',
    email: '',

    // Bank Details
    bankName: '',
    bankAccountName: 'Anjaneya Gold Company',
    bankAccountNumber: '',
    bankIfsc: '',
    bankBranch: '',

    // Admin Account
    adminUsername: 'admin',
    adminDisplayName: 'Administrator',
    adminPassword: '',
    confirmPassword: '',

    // Financial Year
    fyName: '2026-27',
    fyStartDate: '2026-04-01',
    fyEndDate: '2027-03-31',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setError(null);
    if (step === 2) {
      if (!formData.businessName.trim()) {
        setError('Business Name is required.');
        return;
      }
      if (!formData.gstin.trim()) {
        setError('Please enter your company GSTIN.');
        return;
      }
      if (!formData.address.trim()) {
        setError('Please enter your registered address.');
        return;
      }
    }

    if (step === 4) {
      if (!formData.adminUsername.trim() || !formData.adminPassword) {
        setError('Username and password are required.');
        return;
      }
      if (formData.adminPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Setup Admin User
      const userRes = await window.api.auth.setupInitialUser({
        username: formData.adminUsername.trim(),
        displayName: formData.adminDisplayName.trim() || 'Administrator',
        password: formData.adminPassword,
      });

      if (!userRes.success) {
        setError(userRes.error || 'Failed to initialize administrator user.');
        setIsSubmitting(false);
        return;
      }

      // 2. Setup Company Profile
      const profileRes = await window.api.db.companyProfile.update({
        businessName: formData.businessName.trim(),
        legalName: formData.legalName.trim() || formData.businessName.trim(),
        gstin: formData.gstin.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        stateCode: formData.stateCode.trim(),
        pincode: formData.pincode.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        bankName: formData.bankName.trim(),
        bankAccountName: formData.bankAccountName.trim(),
        bankAccountNumber: formData.bankAccountNumber.trim(),
        bankIfsc: formData.bankIfsc.trim(),
        bankBranch: formData.bankBranch.trim(),
      });

      if (!profileRes.success) {
        setError(profileRes.error || 'Failed to save business profile.');
        setIsSubmitting(false);
        return;
      }

      // 3. Create initial Financial Year
      const fyRes = await window.api.db.financialYears.create({
        name: formData.fyName.trim(),
        startDate: formData.fyStartDate,
        endDate: formData.fyEndDate,
        setActive: true,
      });

      if (!fyRes.success) {
        setError(fyRes.error || 'Failed to create financial year.');
        setIsSubmitting(false);
        return;
      }

      // Automatically sign in or navigate to login
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Setup encountered an unexpected error.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-serif">
      <Card className="w-full max-w-2xl shadow-xl border-[#E7E2D7] bg-white">
        <CardHeader className="border-b border-[#E7E2D7] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#C49A35] p-0.5 bg-black shadow-sm flex items-center justify-center shrink-0">
                <img
                  src={logoUrl}
                  alt="AGC"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-[#171717]">
                  First-Launch Business Setup Wizard
                </CardTitle>
                <CardDescription className="text-xs text-[#A98226]">
                  Configure your business parameters, credentials & financial year
                </CardDescription>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-[#F8F2E4] border border-[#E7E2D7] rounded text-[#A98226] font-semibold">
              Step {step} of 6
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 pt-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s <= step ? 'bg-[#C49A35]' : 'bg-[#E7E2D7]'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6 min-h-[350px]">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-4 text-center py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#F8F2E4] border border-[#C49A35] flex items-center justify-center text-[#A98226]">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#171717]">
                Welcome to AGC Billing & Management System
              </h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                This setup wizard will help you configure your local Windows billing system for Anjaneya Gold Company.
                All information entered here is stored locally and securely in your computer's offline database.
              </p>
              <div className="p-3 bg-[#F8F2E4] rounded-md text-xs text-[#A98226] font-medium max-w-md mx-auto border border-[#E7E2D7]">
                Note: In compliance with business rules, company GSTIN, bank details and legal name are never pre-invented. Please have your registration details ready.
              </div>
            </div>
          )}

          {/* STEP 2: BUSINESS PROFILE */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C49A35]" />
                Registered Business Information
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <Label>Business Trade Name *</Label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Legal Registered Name</Label>
                  <Input
                    placeholder="As per GST registration"
                    value={formData.legalName}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>GSTIN *</Label>
                  <Input
                    placeholder="e.g. 29ACKFA4620Q1ZV"
                    value={formData.gstin}
                    onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="e.g. 9008477669"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label>Registered Address *</Label>
                  <Input
                    placeholder="#20, 1st Floor, Saraswathipura Main Road..."
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>State & Code</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      className="col-span-2"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                    <Input
                      value={formData.stateCode}
                      onChange={(e) => handleChange('stateCode', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BANK DETAILS */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#C49A35]" />
                Official Bank Information (For Invoices)
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input
                    placeholder="e.g. IDFC FIRST Bank"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Beneficiary Name</Label>
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => handleChange('bankAccountName', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="e.g. 10309933727"
                    value={formData.bankAccountNumber}
                    onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>IFSC Code</Label>
                  <Input
                    placeholder="e.g. IDFB0081179"
                    value={formData.bankIfsc}
                    onChange={(e) => handleChange('bankIfsc', e.target.value.toUpperCase())}
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label>Branch Name / Location</Label>
                  <Input
                    placeholder="e.g. Nandini Layout Branch"
                    value={formData.bankBranch}
                    onChange={(e) => handleChange('bankBranch', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ADMIN ACCOUNT */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-[#C49A35]" />
                Create Administrator Account
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <Label>Username *</Label>
                  <Input
                    value={formData.adminUsername}
                    onChange={(e) => handleChange('adminUsername', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Display Name</Label>
                  <Input
                    value={formData.adminDisplayName}
                    onChange={(e) => handleChange('adminDisplayName', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Password (min 6 chars) *</Label>
                  <Input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirm Password *</Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: FINANCIAL YEAR */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C49A35]" />
                Initial Financial Year (April – March)
              </h3>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <Label>FY Name (e.g. 2026-27)</Label>
                  <Input
                    value={formData.fyName}
                    onChange={(e) => handleChange('fyName', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Start Date (1 April)</Label>
                  <Input
                    type="date"
                    value={formData.fyStartDate}
                    onChange={(e) => handleChange('fyStartDate', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Date (31 March)</Label>
                  <Input
                    type="date"
                    value={formData.fyEndDate}
                    onChange={(e) => handleChange('fyEndDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-[#F8F2E4] rounded-md text-xs text-[#A98226] border border-[#E7E2D7]">
                Documents will be systematically organized by Financial Year ({formData.fyName}) and respective calendar months under your AGC_Billing directory.
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & COMPLETE */}
          {step === 6 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-[#171717] border-b border-[#E7E2D7] pb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Review & Confirm Setup
              </h3>

              <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8F2E4] rounded-lg border border-[#E7E2D7]">
                <div>
                  <span className="text-gray-500 block">Trade Name:</span>
                  <span className="font-semibold text-[#171717]">{formData.businessName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">GSTIN:</span>
                  <span className="font-semibold text-[#171717]">{formData.gstin || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Bank Account:</span>
                  <span className="font-semibold text-[#171717]">{formData.bankName} - {formData.bankAccountNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Admin Username:</span>
                  <span className="font-semibold text-[#171717]">{formData.adminUsername}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Active Financial Year:</span>
                  <span className="font-semibold text-[#171717]">FY {formData.fyName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">State:</span>
                  <span className="font-semibold text-[#171717]">{formData.state} ({formData.stateCode})</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-[#E7E2D7] pt-4">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <Button size="sm" onClick={handleNext}>
              Next Step
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={isSubmitting}>
              <Check className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Finalizing Setup...' : 'Complete & Launch System'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
