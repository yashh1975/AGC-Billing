# AGC Billing & Management System
### Anjaneya Gold Company (AGC) — Professional Desktop Billing Application

A robust, offline-first, professional Windows desktop billing and GST management software developed specifically for **Anjaneya Gold Company (AGC)**. Built with Electron 32, React 18, TypeScript, Tailwind CSS, SQLite (`better-sqlite3`), Drizzle ORM, jsPDF, and ExcelJS.

---

## Key Highlights & Business Rules

1. **Strict Exclusion of Gold Purity**:
   - Per explicit AGC company guidelines, gold purity (e.g. 22K, 24K, 916) is **strictly omitted** from all sales billing forms, sales invoice PDFs, database records, search screens, and CA report registers.

2. **Three Core Billing Modules**:
   - **Dealer Purchase Bill Recording**: Records original dealer invoices with dealer bill numbers, dates, attachments, and generates an internal AGC record stamped with: `"INTERNAL PURCHASE RECORD – NOT A TAX INVOICE"`.
   - **Sales Billing**: Professional GST invoices with line-item weights, rates, making charges, discounts, intra-state (CGST+SGST) vs. inter-state (IGST) calculations, payment tracking, and A4 print/PDF generation.
   - **Financial Services Billing**: Outward service tax invoices for Gold Loan Takeover, Re-pledging, Settlement, and Valuation services with statutory SAC 9971 classification (18% GST) and independent sequence numbers.

3. **Financial Year Isolation & Document Numbering**:
   - Independent numbering series per module (e.g., `AGC/S/26-27/0001`, `AGC/P/26-27/0001`, `AGC/SV/26-27/0001`).
   - Hard isolation: documents belong strictly to the financial year dictated by their invoice date.

4. **Automatic Customer & Supplier Management**:
   - Direct entry during billing automatically registers parties with permanent identifiers (`AGC-CUS-XXXX`, `AGC-SUP-XXXX`).
   - Duplicate detection on GSTIN, mobile, and legal name.

5. **Automated Local Storage Vault**:
   - PDF documents organized automatically: `AGC_Billing/Documents/[FinancialYear]/[Category]/[Month]/`.
   - Supplier invoice attachments organized: `AGC_Billing/Attachments/Supplier_Invoices/[FinancialYear]/`.
   - CA/GST Excel exports saved under: `AGC_Billing/GST_Reports/[FinancialYear]/`.

6. **Audit-Ready Excel Reports for CA Filing**:
   - Generates 5 dedicated registers with ExcelJS:
     1. Sales Register (Item-level breakdown, strictly NO purity)
     2. Dealer Purchase Register (With original dealer invoice details)
     3. Service Register (SAC 9988 jobwork invoices)
     4. GST Tax Summary (Outward vs. Inward ITC reconciliation)
     5. Tariff-wise HSN / SAC Summary

7. **Universal Search & Automated Backup**:
   - `Ctrl + K` global command palette across invoices, customers, and suppliers.
   - Verified ZIP backup creation with atomic SQLite snapshot and SHA-256 checksum verification.

---

## Technology Stack

- **Desktop Shell**: Electron 32 (Context Isolation, Sandboxed Preload, Single Instance Lock)
- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Database**: SQLite 3 via `better-sqlite3` with WAL mode and `drizzle-orm`
- **PDF Engine**: `jspdf` vector A4 engine with Times New Roman typography and metallic gold aesthetics
- **Spreadsheets**: `exceljs` styled multi-tab workbooks
- **Packaging**: `electron-builder` with NSIS Windows installer

---

## Directory Structure

```
agc-billing/
├── assets/                  # Brand assets (AGC Logo)
├── build/                   # App icon and build resources
├── drizzle/                 # Drizzle schema migrations
├── electron/
│   ├── database/            # SQLite init, schema, migrations, seed
│   ├── file-manager/        # Folder organization and path resolution
│   ├── ipc/                 # Electron IPC handlers
│   ├── main/                # Main process entry, window lifecycle
│   ├── preload/             # Context bridge exposing window.api
│   ├── security/            # App security, CSP, input hygiene
│   └── services/            # PDF service, Excel service, Backup service
├── src/
│   ├── assets/              # Renderer assets
│   ├── components/          # Layout, Navigation, Modals, Forms
│   ├── hooks/               # Custom React hooks (useAuth, useFinancialYear, useToast)
│   ├── lib/                 # Utility functions
│   ├── pages/               # Application views
│   │   ├── all-bills/       # Master unified billing browser
│   │   ├── customers/       # Customer profiles and ledger
│   │   ├── dashboard/       # Real-time financial metrics
│   │   ├── dealer-purchase/ # Module 1: Dealer purchase recording
│   │   ├── documents/       # PDF document vault browser
│   │   ├── gst-reports/     # CA/GST Excel export center
│   │   ├── login/           # Authentication page
│   │   ├── sales/           # Module 2: Sales billing
│   │   ├── service/         # Module 3: Service billing
│   │   ├── settings/        # Business profile, FY, masters, backups
│   │   ├── setup-wizard/    # First-launch configuration wizard
│   │   └── suppliers/       # Supplier profiles and purchase history
│   ├── services/            # Client GST engine, PDF generator
│   └── types/               # TypeScript interfaces and DB models
├── tests/
│   └── unit/                # Automated Vitest test suites (Phases 1 - 4)
├── electron-builder.yml     # Windows packaging & NSIS configuration
├── package.json
└── vite.config.ts
```

---

## Running Locally

### Development Mode:
```bash
npm install
npm run dev
```

### Run Tests:
```bash
npm run test
```

### Build Production Bundle:
```bash
npm run build
```

### Generate Windows Setup / Executable:
```bash
npm run package
```
Outputs the standalone executable and distribution archive in `release/`:
- **One-Click Windows Installer**: `release/AGC-Billing-Setup-1.0.0.exe` (Self-contained NSIS installer with desktop & start menu shortcuts)
- **Unpacked Portable Executable**: `release/win-unpacked/AGC Billing.exe` (Ready to launch immediately without installation)
- **Portable Distribution Zip**: `release/AGC-Billing-Windows-x64-v1.0.0.zip` (141 MB standalone package)

---

## Installation & Deployment Guide

### On Any Client PC (Zero Prerequisites):
1. Copy or download `AGC-Billing-Setup-1.0.0.exe` onto any Windows 10/11 system.
2. Double-click the installer. It will automatically:
   - Install the application into standard program files.
   - Create Desktop and Start Menu shortcuts.
   - Initialize the local SQLite database in `%APPDATA%\agc-billing\AGC_Data\agc-billing.db` with automated migrations.
3. No Node.js, Python, or external database drivers are needed.

### Safe Future Updates (Zero Data Loss):
- **Code vs. Data Separation**: The software executable is stored in `AppData\Local\Programs\AGC Billing`, while all business records, invoices, and settings live in `AppData\Roaming\agc-billing\AGC_Data`.
- Running an updated installer (e.g. `v1.0.1`) only updates application binaries. Your database, customer ledgers, and generated PDFs remain completely untouched.
- Drizzle ORM runs schema migrations automatically on startup to cleanly upgrade database structures without data loss.

---

## License

Proprietary — Developed exclusively for **Anjaneya Gold Company**. All rights reserved.
