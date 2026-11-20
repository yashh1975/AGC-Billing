# AGC Billing & Management System — Backup & Disaster Recovery Guide
### Anjaneya Gold Company (AGC)

Data safety, transaction permanence, and business continuity are foundational requirements for Anjaneya Gold Company. This document outlines the local backup architecture, recommended backup frequencies, checksum verification, and step-by-step restoration procedures.

---

## 1. What Is Included in a Full Backup

Every AGC backup archive is a self-contained, timestamped `.zip` file containing:

1. **`billing.db`**:
   - The complete SQLite database snapshot taken using SQLite's live atomic online backup API (`db.backup`).
   - Guarantees 100% data integrity without file corruption, even if bills are being processed when the backup is triggered.
   - Contains all Customers, Suppliers, Sales Invoices, Dealer Purchases, Service Bills, Payments, Tax Rates, Financial Years, and Audit Logs.
2. **`Documents/`**:
   - The entire local PDF vault containing organized A4 sales invoices, dealer purchase internal summaries, and service bills organized by `[FinancialYear]/[Category]/[Month]/`.
3. **`Attachments/`**:
   - Scanned dealer invoices and supplier bill uploads under `Supplier_Invoices/[FinancialYear]/`.
4. **`manifest.json`**:
   - Metadata file containing application version, exact ISO creation timestamp, backup type, and system identity.
5. **SHA-256 Checksum**:
   - A cryptographic hash calculated immediately upon file creation to verify that the archive has not been corrupted or tampered with.

---

## 2. Default Backup Storage Locations

By default, backups are saved locally to:
```
C:\Users\<User>\Documents\AGC_Billing\Backups\
```

Naming convention:
```
AGC_Backup_YYYY-MM-DDTHH-MM-SS.zip
```
*(Example: `AGC_Backup_2026-11-18T16-30-00.zip`)*

---

## 3. Recommended Backup Schedule

To ensure zero transaction loss:

| Frequency | Action | Recommended Media |
|---|---|---|
| **Daily (End of Day)** | Trigger 1-click **Backup Now** from Settings | Local PC (`AGC_Billing/Backups`) |
| **Weekly (Saturday Evening)** | Copy latest `.zip` archive to an external USB drive | Encrypted USB Flash Drive |
| **Monthly (Post-CA GST Reconciliation)** | Copy the monthly `.zip` and all exported GST Excel registers | Off-site external hard drive or secure cloud vault |

---

## 4. How to Create an Instant Backup

1. Open the AGC Billing desktop application.
2. In the left navigation sidebar, click on **Settings**.
3. Select the **Local Storage & Backup** tab.
4. Click the golden button: **`Backup Now (.zip)`**.
5. The application takes a safe snapshot of the database, packages documents, computes the SHA-256 hash, and displays a success notification with the file size and filename.
6. The new backup immediately appears in the **Available Local Backups** list.

---

## 5. How to Restore from a Backup

> [!CAUTION]
> **Automatic Pre-Restore Safety Snapshot**: Before restoring any previous backup, the application automatically takes a safety backup of your current database and files. This guarantees that you can never accidentally overwrite or lose recent data.

### Restoration Steps:
1. In the application, navigate to **Settings > Local Storage & Backup**.
2. Locate the desired backup file in the **Available Local Backups** list, or locate an external backup `.zip` file on your USB drive.
3. Click the **Restore** button next to the desired archive.
4. A confirmation dialog will prompt:
   *"Are you sure you want to restore from this backup? A safety snapshot of the current state will be created automatically before restoring."*
5. Click **Confirm**.
6. The application safely closes database locks, replaces `billing.db`, synchronizes document vaults, re-indexes sequences, and reloads the application.
7. Verify your transactions in the **All Bills** and **Dashboard** screens.

---

## 6. Manual Emergency Recovery (Cold System Recovery)

If the computer fails or needs complete reinstallation:

1. Install the AGC Billing application on the new Windows 10/11 computer.
2. Run the application once so it creates the default directory structure.
3. Take your latest backup file `AGC_Backup_YYYY-MM-DD.zip`.
4. Right-click and extract the `.zip` archive.
5. Copy `billing.db` into:
   ```
   C:\Users\<User>\AppData\Roaming\agc-billing\AGC_Data\agc-billing.db
   ```
6. Copy the `Documents` and `Attachments` folders into:
   ```
   C:\Users\<User>\Documents\AGC_Billing\
   ```
7. Launch AGC Billing. All transactions, parties, settings, and documents are 100% restored.

---

## 7. Support & Assistance

For technical assistance or disaster recovery verification:
- **Application**: AGC Billing & Management System v1.0
- **Organization**: Anjaneya Gold Company
