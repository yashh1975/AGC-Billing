export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duplicates?: any[];
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export interface Customer {
  id: number;
  reference_number: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  gstin: string | null;
  place_of_supply: string | null;
  first_transaction_date: string | null;
  last_transaction_date: string | null;
  total_bills: number;
  total_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  reference_number: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  gstin: string | null;
  first_transaction_date: string | null;
  last_transaction_date: string | null;
  total_bills: number;
  total_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
}

export interface CompanyProfile {
  id: number;
  business_name: string;
  legal_name: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  signature_path: string | null;
  invoice_footer: string | null;
  terms_sales: string | null;
  terms_service: string | null;
  terms_purchase: string | null;
}

export interface DashboardSummary {
  todaySales: number;
  todayPurchases: number;
  todayServices: number;
  monthlySales: number;
  monthlyPurchases: number;
  monthlyServices: number;
  yearlySales?: number;
  yearlyPurchases?: number;
  yearlyServices?: number;
  totalBills: number;
  outstandingAmount: number;
  recentTransactions: RecentTransaction[];
}

export interface RecentTransaction {
  type: 'sales' | 'purchase' | 'service';
  doc_number: string;
  date: string;
  amount: number;
  payment_status: string;
  status: string;
  party_name: string | null;
}

export interface HsnCode {
  id: number;
  code: string;
  description: string;
  default_gst_rate: number;
  is_active: boolean;
}

export interface SacCode {
  id: number;
  code: string;
  description: string;
  default_gst_rate: number;
  is_active: boolean;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  hsn_code: string | null;
  sac_code: string | null;
  category: string;
  is_active: boolean;
}

export interface AppSetting {
  id: number;
  key: string;
  value: string | null;
  category: string | null;
  description: string | null;
}

// Window API type
declare global {
  interface Window {
    api: {
      db: {
        customers: {
          getAll: () => Promise<ApiResponse<Customer[]>>;
          getById: (id: number) => Promise<ApiResponse<Customer>>;
          search: (query: string) => Promise<ApiResponse<Customer[]>>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse<Customer>>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse<Customer>>;
        };
        suppliers: {
          getAll: () => Promise<ApiResponse<Supplier[]>>;
          getById: (id: number) => Promise<ApiResponse<Supplier>>;
          search: (query: string) => Promise<ApiResponse<Supplier[]>>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse<Supplier>>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse<Supplier>>;
        };
        salesInvoices: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse>;
          getById: (id: number) => Promise<ApiResponse>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse>;
          finalize: (id: number) => Promise<ApiResponse>;
          cancel: (id: number, reason: string) => Promise<ApiResponse>;
        };
        dealerPurchases: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse>;
          getById: (id: number) => Promise<ApiResponse>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse>;
        };
        serviceInvoices: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse>;
          getById: (id: number) => Promise<ApiResponse>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse>;
          finalize: (id: number) => Promise<ApiResponse>;
          cancel: (id: number, reason: string) => Promise<ApiResponse>;
        };
        payments: {
          create: (data: Record<string, unknown>) => Promise<ApiResponse>;
          getByDocument: (type: string, id: number) => Promise<ApiResponse>;
        };
        financialYears: {
          getAll: () => Promise<ApiResponse<FinancialYear[]>>;
          getActive: () => Promise<ApiResponse<FinancialYear | null>>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse<FinancialYear>>;
          setActive: (id: number) => Promise<ApiResponse<FinancialYear>>;
        };
        companyProfile: {
          get: () => Promise<ApiResponse<CompanyProfile | null>>;
          update: (data: Record<string, unknown>) => Promise<ApiResponse<CompanyProfile>>;
        };
        documentSequences: {
          getNext: (category: string, fyId: number) => Promise<ApiResponse>;
        };
        taxRates: {
          getAll: () => Promise<ApiResponse<TaxRate[]>>;
          create: (data: Record<string, unknown>) => Promise<ApiResponse>;
          update: (id: number, data: Record<string, unknown>) => Promise<ApiResponse>;
        };
        hsnCodes: {
          getAll: () => Promise<ApiResponse<HsnCode[]>>;
        };
        sacCodes: {
          getAll: () => Promise<ApiResponse<SacCode[]>>;
        };
        settings: {
          get: (key: string) => Promise<ApiResponse<string | null>>;
          set: (key: string, value: string) => Promise<ApiResponse>;
          getAll: () => Promise<ApiResponse<AppSetting[]>>;
        };
        auditLogs: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse>;
        };
        dashboard: {
          getSummary: (fyId?: number) => Promise<ApiResponse<DashboardSummary>>;
        };
        allBills: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse<any[]>>;
        };
        draftBills: {
          getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse<any[]>>;
          delete: (type: 'sales' | 'purchase' | 'service', id: number) => Promise<ApiResponse<void>>;
        };
      };
      search: {
        global: (query: string) => Promise<ApiResponse<any[]>>;
      };
      files: {
        selectDirectory: () => Promise<ApiResponse<string | null>>;
        selectFile: (filters?: Record<string, unknown>) => Promise<ApiResponse<string | null>>;
        openFile: (filePath: string) => Promise<ApiResponse>;
        openFolder: (folderPath: string) => Promise<ApiResponse>;
        getDataDirectory: () => Promise<ApiResponse<string>>;
        setDataDirectory: (dirPath: string) => Promise<ApiResponse>;
      };
      pdf: {
        generate: (type: string, id: number) => Promise<ApiResponse>;
        saveDocument: (params: Record<string, unknown>) => Promise<ApiResponse<{ filePath: string }>>;
        open: (filePath: string) => Promise<ApiResponse>;
        getPath: (type: string, id: number) => Promise<ApiResponse<string | null>>;
      };
      documents: {
        getAll: (filters?: Record<string, unknown>) => Promise<ApiResponse<any[]>>;
      };
      excel: {
        exportReport: (config: Record<string, unknown>) => Promise<ApiResponse>;
      };
      whatsapp: {
        share: (mobile: string, message: string, filePath?: string) => Promise<ApiResponse>;
      };
      backup: {
        create: (targetDir?: string) => Promise<ApiResponse<any>>;
        restore: (backupPath: string) => Promise<ApiResponse>;
        getHistory: () => Promise<ApiResponse<any[]>>;
      };
      auth: {
        login: (username: string, password: string) => Promise<ApiResponse<AuthData>>;
        changePassword: (oldPass: string, newPass: string) => Promise<ApiResponse>;
        checkSession: () => Promise<ApiResponse<{ user: User } | null>>;
        setupInitialUser: (data: Record<string, unknown>) => Promise<ApiResponse>;
        hasUsers: () => Promise<ApiResponse<boolean>>;
      };
      app: {
        getVersion: () => Promise<ApiResponse<string>>;
        quit: () => Promise<ApiResponse>;
        minimize: () => Promise<ApiResponse>;
        maximize: () => Promise<ApiResponse>;
        isMaximized: () => Promise<ApiResponse<boolean>>;
        getPath: (name: string) => Promise<ApiResponse<string>>;
      };
    };
  }
}

export {};
