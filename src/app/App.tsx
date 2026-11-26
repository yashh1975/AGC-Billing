import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/toaster';

// Pages
import { LoginPage } from '@/pages/login/LoginPage';
import { SetupWizardPage } from '@/pages/setup-wizard/SetupWizardPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { SupplierDetailPage } from '@/pages/suppliers/SupplierDetailPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { DealerPurchasePage } from '@/pages/dealer-purchase/DealerPurchasePage';
import { SalesBillingPage } from '@/pages/sales/SalesBillingPage';
import { ServiceBillingPage } from '@/pages/service/ServiceBillingPage';
import { DraftBillsPage } from '@/pages/drafts/DraftBillsPage';
import { PledgeDetailsPage } from '@/pages/pledge-details/PledgeDetailsPage';
import { AllBillsPage } from '@/pages/all-bills/AllBillsPage';
import { GstReportsPage } from '@/pages/gst-reports/GstReportsPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-serif text-sm text-gray-500">
        Authenticating AGC Billing System...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { checkSession, isAuthenticated } = useAuth();
  useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Check if database has users (first launch check)
        const hasUsersRes = await window.api.auth.hasUsers();
        if (hasUsersRes.success && !hasUsersRes.data) {
          setNeedsSetup(true);
          navigate('/setup');
          setCheckingSetup(false);
          return;
        }

        // Check active session
        await checkSession();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setCheckingSetup(false);
      }
    }

    init();
  }, [checkSession, navigate]);

  // Global Ctrl + K search listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/all-bills');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-serif text-sm text-gray-500">
        Initializing local business database...
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Setup Wizard Route */}
        <Route path="/setup" element={<SetupWizardPage />} />

        {/* Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />

        {/* Protected Application Routes */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <MainLayout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dealer-purchase" element={<DealerPurchasePage />} />
                  <Route path="/sales" element={<SalesBillingPage />} />
                  <Route path="/service" element={<ServiceBillingPage />} />
                  <Route path="/draft-bills" element={<DraftBillsPage />} />
                  <Route path="/pledge-details" element={<PledgeDetailsPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                  <Route path="/all-bills" element={<AllBillsPage />} />
                  <Route path="/gst-reports" element={<GstReportsPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            </AuthGuard>
          }
        />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
