import { contextBridge, ipcRenderer } from 'electron';

const api = {
  db: {
    customers: {
      getAll: () => ipcRenderer.invoke('customers:getAll'),
      getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
      search: (query: string) => ipcRenderer.invoke('customers:search', query),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('customers:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('customers:update', id, data),
    },
    suppliers: {
      getAll: () => ipcRenderer.invoke('suppliers:getAll'),
      getById: (id: number) => ipcRenderer.invoke('suppliers:getById', id),
      search: (query: string) => ipcRenderer.invoke('suppliers:search', query),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('suppliers:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('suppliers:update', id, data),
    },
    salesInvoices: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('sales:getAll', filters),
      getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('sales:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('sales:update', id, data),
      finalize: (id: number) => ipcRenderer.invoke('sales:finalize', id),
      cancel: (id: number, reason: string) => ipcRenderer.invoke('sales:cancel', id, reason),
    },
    dealerPurchases: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('purchases:getAll', filters),
      getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('purchases:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('purchases:update', id, data),
      cancel: (id: number, reason: string) => ipcRenderer.invoke('purchases:cancel', id, reason),
    },
    serviceInvoices: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('services:getAll', filters),
      getById: (id: number) => ipcRenderer.invoke('services:getById', id),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('services:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('services:update', id, data),
      finalize: (id: number) => ipcRenderer.invoke('services:finalize', id),
      cancel: (id: number, reason: string) => ipcRenderer.invoke('services:cancel', id, reason),
    },
    payments: {
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('payments:create', data),
      getByDocument: (type: string, id: number) => ipcRenderer.invoke('payments:getByDocument', type, id),
    },
    financialYears: {
      getAll: () => ipcRenderer.invoke('fy:getAll'),
      getActive: () => ipcRenderer.invoke('fy:getActive'),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('fy:create', data),
      setActive: (id: number) => ipcRenderer.invoke('fy:setActive', id),
    },
    companyProfile: {
      get: () => ipcRenderer.invoke('settings:getCompanyProfile'),
      update: (data: Record<string, unknown>) => ipcRenderer.invoke('settings:updateCompanyProfile', data),
    },
    documentSequences: {
      getNext: (category: string, fyId: number) => ipcRenderer.invoke('sequences:getNext', category, fyId),
      peekNext: (category: string, fyId: number) => ipcRenderer.invoke('sequences:peekNext', category, fyId),
    },
    taxRates: {
      getAll: () => ipcRenderer.invoke('tax:getAll'),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('tax:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('tax:update', id, data),
    },
    hsnCodes: {
      getAll: () => ipcRenderer.invoke('hsn:getAll'),
    },
    sacCodes: {
      getAll: () => ipcRenderer.invoke('sac:getAll'),
    },
    settings: {
      get: (key: string) => ipcRenderer.invoke('settings:get', key),
      set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
      getAll: () => ipcRenderer.invoke('settings:getAll'),
    },
    auditLogs: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('audit:getAll', filters),
    },
    dashboard: {
      getSummary: (fyId?: number) => ipcRenderer.invoke('dashboard:getSummary', fyId),
    },
    allBills: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('billing:getAllBills', filters),
    },
    draftBills: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('drafts:getAll', filters),
      delete: (type: 'sales' | 'purchase' | 'service', id: number) => ipcRenderer.invoke('drafts:delete', type, id),
      getNextNumber: () => ipcRenderer.invoke('drafts:getNextNumber'),
    },
    pledges: {
      getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('pledges:getAll', filters),
      getById: (id: number) => ipcRenderer.invoke('pledges:getById', id),
      create: (data: Record<string, unknown>) => ipcRenderer.invoke('pledges:create', data),
      update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('pledges:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('pledges:delete', id),
      exportExcel: () => ipcRenderer.invoke('pledges:exportExcel'),
      openFolder: () => ipcRenderer.invoke('pledges:openFolder'),
    },
  },
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
  },
  files: {
    selectDirectory: () => ipcRenderer.invoke('files:selectDirectory'),
    selectFile: (filters?: Record<string, unknown>) => ipcRenderer.invoke('files:selectFile', filters),
    openFile: (filePath: string) => ipcRenderer.invoke('files:openFile', filePath),
    openFolder: (folderPath: string) => ipcRenderer.invoke('files:openFolder', folderPath),
    getDataDirectory: () => ipcRenderer.invoke('files:getDataDirectory'),
    setDataDirectory: (dirPath: string) => ipcRenderer.invoke('files:setDataDirectory', dirPath),
  },
  pdf: {
    generate: (type: string, id: number) => ipcRenderer.invoke('pdf:generate', type, id),
    saveDocument: (params: Record<string, unknown>) => ipcRenderer.invoke('pdf:saveDocument', params),
    open: (filePath: string) => ipcRenderer.invoke('files:openFile', filePath),
    getPath: (type: string, id: number) => ipcRenderer.invoke('pdf:getPath', type, id),
  },
  documents: {
    getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('documents:getAll', filters),
  },
  excel: {
    exportReport: (config: Record<string, unknown>) => ipcRenderer.invoke('excel:exportReport', config),
  },
  whatsapp: {
    share: (mobile: string, message: string, filePath?: string) => ipcRenderer.invoke('whatsapp:share', mobile, message, filePath),
  },
  backup: {
    create: (targetDir?: string) => ipcRenderer.invoke('backup:create', targetDir),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    getHistory: () => ipcRenderer.invoke('backup:getHistory'),
  },
  auth: {
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
    changePassword: (oldPass: string, newPass: string) => ipcRenderer.invoke('auth:changePassword', oldPass, newPass),
    checkSession: () => ipcRenderer.invoke('auth:checkSession'),
    setupInitialUser: (data: Record<string, unknown>) => ipcRenderer.invoke('auth:setupInitialUser', data),
    hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
