# AGC Billing & Management System — Offline GST Billing, Financial Services & Dealer Purchases

### The complete, offline-first desktop GST billing, loan takeover & dealer purchase software for Anjaneya Gold Company.

<p align="center">
  <a href="https://github.com/yashh1975/AGC-Billing/releases/tag/v2.0.0"><img src="https://img.shields.io/badge/Release-v2.0.0-gold.svg?style=for-the-badge&logo=windows" alt="Latest Release v2.0.0" /></a>
  <a href="https://github.com/yashh1975/AGC-Billing/releases"><img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6.svg?style=for-the-badge&logo=windows11" alt="Platform" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Proprietary%20%2F%20AGC-red.svg?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/Database-SQLite%203%20(Local%20%26%20WAL)-003B57.svg?style=for-the-badge&logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/GST-HSN%207113%20%7C%20SAC%209971-success.svg?style=for-the-badge" alt="GST Compliance" />
  <img src="https://img.shields.io/badge/Tests-60%2F60%20Passed-brightgreen.svg?style=for-the-badge" alt="Tests" />
</p>

---

**Tax invoices, dealer purchases, gold loan takeovers & releases, audit-ready CA Excel registers, automated PDF vault, WhatsApp sharing, and multi-year bookkeeping — 100% offline, on your own computer.**

**Works offline. No cloud leaks. No tracking. No ads. No subscription fees. Zero internet required for daily billing.**

A specialized desktop billing software tailored for gold jewellery and financial services: generate statutory sales tax invoices, record dealer purchase bills with attachment scans, issue takeover/re-pledging service receipts, and export complete audit-ready 5-tab Excel workbooks for your Chartered Accountant in seconds.

<p align="center">
  <a href="https://github.com/yashh1975/AGC-Billing/releases/download/v2.0.0/AGC-Billing-Setup-1.0.0.exe">
    <img src="https://img.shields.io/badge/%E2%AC%87%20WINDOWS%20SETUP%20(.EXE)-97.3%20MB-blue?style=for-the-badge&logo=windows" alt="Download for Windows" />
  </a>
  &nbsp;&nbsp;
  <a href="#what-it-does">
    <img src="https://img.shields.io/badge/%F0%9F%93%8B%20SEE%20WHAT%20IT%20DOES-black?style=for-the-badge" alt="What It Does" />
  </a>
  &nbsp;&nbsp;
  <a href="#frequently-asked-questions-faq">
    <img src="https://img.shields.io/badge/%E2%9D%93%20FAQ%20%26%20GST%20RULES-orange?style=for-the-badge" alt="FAQ" />
  </a>
</p>

> **Quick Download (v2.0.0)**: [AGC-Billing-Setup-1.0.0.exe (97.3 MB)](https://github.com/yashh1975/AGC-Billing/releases/download/v2.0.0/AGC-Billing-Setup-1.0.0.exe) · Self-contained Windows installer · Desktop & Start Menu shortcuts · Zero dependencies.

---

## What It Does

* **Sales Billing (Gold Jewellery & Articles)**:
  * Full GST tax invoice generation under **HSN 7113** (3% GST).
  * Line-item breakdown: **Gross Weight**, **Net Weight**, **VA / Wastage (%)** (editable, default 9%), **Rate per Gram**, **Making Charges**, and **Discounts**.
  * Automatically calculates **Intra-State (1.5% CGST + 1.5% SGST)** vs. **Inter-State (3% IGST)** based on place of supply.
  * Built-in mathematical engine calculating in exact integer paise to eliminate rounding discrepancies.
  * Real-time side-by-side **A4 Live Invoice Preview** (`100% Full View` & `Fit Screen`) synchronized 1:1 with the generated vector PDF.
  * Direct **WhatsApp Web Sharing** with pre-filled professional customer greeting and invoice details.

* **Financial Services (Gold Loan Takeover, Release & Settlement)**:
  * Statutory service tax invoices under **SAC 9971** (18% GST).
  * **Strict Separation of Principal vs Service Fee**:
    * **Principal Amount (Disbursed)**: Loan disbursement or takeover amount paid to release gold (e.g. ₹1,00,000) — displayed for customer reference and reconciliation with **0% GST**.
    * **Service Amount / Fee**: Facilitation charge (e.g. ₹500) — subject to statutory **18% GST** (9% CGST + 9% SGST = ₹90).
    * **Total Payable**: ₹590 (service fee + GST), protecting your business from erroneously taxing the ₹1,00,000+ loan principal.
  * Purpose-built presets for **Gold Loan Takeover & Release**, **Re-pledging & Documentation**, **Loan Settlement & Equity Payout**, and **Gold Valuation**.

* **Dedicated Draft Bills Section (Estimates / Quotations)**:
  * Accessible directly from the left navigation bar under **Draft Bill**.
  * Complete 3-in-1 estimation capability aligned with Tax formats: **Sales Draft**, **Service Draft**, and **Dealer Purchase Draft** (with Gross Weight & VA / Wastage % support).
  * **Pure Non-Statutory Estimates**: Draft bills carry **no GST calculation or GST tax columns** — displaying only clean estimation totals, party phone, and address.
  * **Zero Statutory Impact**: Draft bills **never consume GST invoice numbers** (`EST-XXXX` series) and remain completely isolated from CA reports, supplier totals, search revenue, and dashboard GST metrics.
  * Watermarked as **`ESTIMATE / DRAFT BILL (FOR REFERENCE & ESTIMATION ONLY — NOT A TAX INVOICE)`**.
  * Full management suite: **View / Print A4**, **Share on WhatsApp**, and **Delete Draft** with confirmation.

* **Dealer Purchase Recording**:
  * Record inward dealer bills with supplier invoice number (`DEALER BILL #`), dealer invoice date, supplier GSTIN, Gross/Net weights, and **VA / Wastage (%)**.
  * Drag-and-drop supplier invoice bill scan/PDF preservation.
  * Generates internal AGC audit slips stamped with:  
    `"INTERNAL PURCHASE RECORD – NOT A TAX INVOICE – FOR GSTR-2B VERIFICATION ONLY"`.

* **Pledge Details & Excel Register**:
  * Dedicated **Pledge Details** section with separate **Input Details** and **Pledged Records List** views.
  * Tracks Date, Customer Name, **Pledged Name**, Address, Phone, Principal Amount, Interest (%), Pledge Date, Pledged Item, Pledge Place, Pledge Amount, Pledge Interest (%), and Active/Released status.
  * **Strict Ledger Isolation**: Pledge records stay strictly inside **Pledge Details** (only the active pledge count is shown on the Dashboard) and are **never included** in CA Filing, GST Reports, or Billing Registers.
  * Supports one-click **Excel Export (`.xlsx`)** and **View in Folder**.

* **Complete Light & Dark Theme**:
  * Header theme toggle lets you switch cleanly between the warm cream Light Theme and the high-contrast obsidian-and-gold Dark Theme across all 12 sections, while keeping A4 invoice previews crisp white-paper / black-ink for print fidelity.

* **Audit-Ready Excel Reports for CA Filing**:
  * One-click master Excel workbook generation (`.xlsx`) containing 5 dedicated registers:
    1. **Sales Register**: Complete outward sales with taxable values, CGST, SGST, IGST, and invoice numbers.
    2. **Dealer Purchase Register**: Inward supply details with supplier invoice references for GSTR-2B ITC reconciliation.
    3. **Financial Services Register**: SAC 9971 service invoices at 18% GST.
    4. **GST Tax Summary**: Month-by-month Outward Tax Liability vs. Inward ITC Net Payable calculation.
    5. **Tariff-wise HSN / SAC Summary**: Statutory summary table formatted for direct GSTR-1 Table 12 filing.

* **Party Directory (Customers & Suppliers)**:
  * Direct on-the-fly registration during billing without leaving the form.
  * Permanent identifiers: `AGC-CUS-XXXX` for customers and `AGC-SUP-XXXX` for suppliers.
  * Duplicate detection preventing accidental double entries by GSTIN, Mobile, or Name.

* **Automated Local Storage Vault**:
  * Invoices and documents are systematically organized into an automated folder hierarchy:  
    `AGC_Billing/Documents/[FinancialYear]/[Category]/[Month]/`
  * Supplier invoice scans preserved under:  
    `AGC_Billing/Attachments/Supplier_Invoices/[FinancialYear]/`

* **Strict Gold Purity Exclusion**:
  * Per company policy and statutory compliance guidelines, gold purity markings (e.g. 22K, 24K, 916) are **strictly omitted** across all sales invoices, dealer purchase internal slips, database fields, search dialogs, and CA reports.

---

## Download and Install

### Windows 10 / 11 (64-bit)

1. **[Download AGC-Billing-Setup-1.0.0.exe (v2.0.0)](https://github.com/yashh1975/AGC-Billing/releases/download/v2.0.0/AGC-Billing-Setup-1.0.0.exe)** (about 97.3 MB).
2. **Double-click** the installer in your `Downloads` folder.  
   *(If Windows SmartScreen prompts "Windows protected your PC", click **More info** $\rightarrow$ **Run anyway**)*.
3. The installer automatically configures program files, creates **Desktop** and **Start Menu** shortcuts, and launches the application.
4. On first launch, the local SQLite database and document vault are automatically created in your user directory.

> **Zero Prerequisites**: You do **not** need Node.js, Python, Git, SQLite, or any external drivers. The setup is 100% self-contained.

---

## Is It Safe? (Data Privacy & Integrity)

* **Your data never leaves your computer**: All business records, customer contact information, invoice numbers, and accounting figures are stored exclusively on your local machine in an SQLite database.
* **No cloud servers, no tracking, no analytics**: The application runs completely disconnected from third-party cloud servers.
* **OS-Level Separation of Code and Data**:
  * **Application Binaries**: `C:\Users\<User>\AppData\Local\Programs\AGC Billing\`
  * **Business Database & Invoices**: `C:\Users\<User>\AppData\Roaming\agc-billing\AGC_Data\`
* **Zero-Data-Loss Updates**: When installing future updates (e.g. `v1.0.1`), the installer only replaces application code in `Local\Programs`. It **never touches or deletes your database or documents** in `AppData\Roaming`.
* **Automated & Manual Backups**: Go to **Settings $\rightarrow$ Backup & Restore** to generate a timestamped, atomic SQLite database snapshot packaged into a verified `.zip` archive.

---

## Your First Invoice in 2 Minutes

### Creating a Sales Invoice:
1. Open **AGC Billing** from your desktop shortcut.
2. Click **Sales Billing** on the sidebar.
3. Type the customer's name and mobile number (the system auto-registers returning customers).
4. Enter line items: Description (e.g. *Gold Jewellery Article*), Gross Weight, Net Weight, and Rate per Gram.
5. Review the live side-by-side A4 preview.
6. Click **Finalize Invoice** $\rightarrow$ Click **Print A4** or **Share on WhatsApp**.

### Creating a Gold Loan Takeover Service Receipt:
1. Click **Service Billing** on the sidebar.
2. Select or enter the customer's details.
3. Click the quick preset button **`+ Gold Loan Takeover`** (automatically fills SAC `9971` at `18%` GST).
4. In the **Rate (₹)** column, enter your service facilitation fee (e.g. `500`).
5. The system automatically computes ₹45 CGST (9%) + ₹45 SGST (9%) = **₹590 Total**.
6. Click **Finalize Invoice**.

---

## Filing GST Returns with Your CA

1. In the sidebar, navigate to **GST Reports**.
2. Select the **Financial Year** (e.g. `2026-27`) and the **Reporting Period** (Monthly, Quarterly, or Full Financial Year).
3. Review the live register tables on-screen across 5 tabs:
   * **Sales (Outward)**
   * **Dealer Purchases (Inward)**
   * **Financial Services (SAC 9971)**
   * **GST Tax Summary**
   * **HSN / SAC Summary**
4. Click **Export Master Workbook (.xlsx)**.
5. Email or share the generated Excel workbook directly with your Chartered Accountant for GSTR-1 and GSTR-3B monthly filing.

---

## Frequently Asked Questions (FAQ)

<details>
<summary><strong>Does 18% GST apply to the ₹1,00,000 takeover loan amount or only the service fee?</strong></summary>

<br>

**Only to the service fee (e.g. ₹500).**  
Under Sections 2(52) and 2(102) of the CGST Act, 2017, pure money transactions (loans, repayments, debt settlements, disbursements) are legally excluded from GST. When you disburse ₹1,00,000 to release gold from a pawn shop or bank, that ₹1,00,000 is principal debt settlement, not taxable income. Under **SAC 9971**, GST is levied strictly on the consideration you earn for facilitating the transaction (your ₹500 service fee), generating a compliant tax invoice of **₹590 (₹500 fee + ₹90 GST)**.
</details>

<details>
<summary><strong>What happens to my invoices and data when I update the software?</strong></summary>

<br>

**Your data is 100% safe and will never be lost.**  
The software strictly separates code from data. The executable program lives in `AppData\Local\Programs\AGC Billing`, while your database (`agc-billing.db`), customer files, and invoices live in `AppData\Roaming\agc-billing\AGC_Data`. Running an update installer (e.g. `AGC-Billing-Setup-1.0.1.exe`) only updates the program binaries and leaves your entire business database untouched. In addition, automated Drizzle ORM migrations update the database schema seamlessly on startup.
</details>

<details>
<summary><strong>Does this software require an internet connection?</strong></summary>

<br>

**No, it is 100% offline.**  
All calculations, database transactions, invoice rendering, and Excel exports execute locally on your computer's CPU and disk. An internet connection is only needed if you choose to click the WhatsApp share button to open WhatsApp Web.
</details>

<details>
<summary><strong>Why are gold purity markings omitted from invoices?</strong></summary>

<br>

Per explicit AGC company policy and statutory compliance guidelines, purity markings (such as 22K, 24K, 916) are omitted to protect trade confidentiality and ensure billing uniformity across all sales and financial services.
</details>

<details>
<summary><strong>How do I move my billing data to a new computer?</strong></summary>

<br>

1. On your old computer, open **Settings $\rightarrow$ Backup & Restore** and click **Create Backup**.
2. Copy the generated `.zip` backup file to a pen drive.
3. On the new computer, install `AGC-Billing-Setup-1.0.0.exe`.
4. Open the app, go to **Settings $\rightarrow$ Backup & Restore**, and click **Restore from Backup**. Your entire billing history, customers, and settings are restored in seconds.
</details>

---

## Technology Stack & Architecture

Developed with a modern, high-performance desktop architecture:

* **Desktop Framework**: Electron 32 (Context Isolation, Sandboxed Preload, Single-Instance Lock, GPU Optimization)
* **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS
* **UI Components**: Radix UI Primitives, Lucide Icons, Custom Gold Medallion Design System
* **Local Database**: SQLite 3 via `better-sqlite3` (WAL Mode enabled for atomic, crash-proof transactions)
* **ORM & Migrations**: Drizzle ORM with automated startup migrations
* **Vector PDF Engine**: `jspdf` vector A4 engine with automatic multi-page overflow pagination and word-wrapping
* **Spreadsheet Generator**: `exceljs` styled multi-sheet workbooks with statutory GST formulas
* **Packaging**: `electron-builder` with multi-resolution `.ico` mipmaps and NSIS Windows installer

### Automated Test Suite (60/60 Tests):
The project includes complete end-to-end unit tests verifying:
* Mathematical GST precision in integer paise (CGST, SGST, IGST)
* Gold jewellery valuation (`weight × rate per gram + making charges - discount`)
* Financial service facilitation fee 18% tax calculation and 0% tax on disbursed principal
* Indian currency formatting and number-to-words engine
* Multi-page PDF pagination and strict purity exclusion
* 5-register CA Excel workbook generation
* SQLite schema migrations, foreign key enforcement, and backup integrity

Run the test suite locally:
```bash
npm run test
```

---

## Local Development

### Prerequisites:
* Windows 10/11
* Node.js v20+
* Git

### Setup & Run:
```bash
# Clone the repository
git clone https://github.com/yashh1975/AGC-Billing.git
cd AGC-Billing

# Install dependencies
npm install

# Run Vite + Electron in development mode
npm run dev

# Run automated tests
npm test

# Build production bundle
npm run build

# Package standalone Windows installer (.exe)
npm run package
```

The compiled setup installer will be output to:  
`release/AGC-Billing-Setup-1.0.0.exe`

---

## Author & Credits

* **Business**: Developed exclusively for **Anjaneya Gold Company (AGC)**, Bengaluru, Karnataka.
* **Developer**: **Yashwanth Kumar** ([@yashh1975](https://github.com/yashh1975))
* **GitHub Repository**: [https://github.com/yashh1975/AGC-Billing](https://github.com/yashh1975/AGC-Billing)

---

## License

Proprietary Software — Developed for **Anjaneya Gold Company**. All rights reserved.
