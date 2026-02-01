# Requirements: Сметководствена Платформа МК

## Business Context

**Problem:** Accounting firms in Macedonia rely on outdated desktop software (2014-era) and paper documents. Data is siloed on individual PCs, no cloud access, no collaboration with clients.

**Solution:** Cloud-based platform where accountants manage client financial data, process Excel/CSV files, and share reports with clients.

## Actors

| Actor | Description |
|-------|-------------|
| **Accountant** | Primary user. Manages clients, uploads/processes files, creates reports |
| **Client** | Secondary user. Uploads documents, views financial status shared by accountant |
| **System** | Automated processing (file parsing, data merging) |

## Constraints

| Constraint | Value | Notes |
|------------|-------|-------|
| MVP Scale | 1 accountant | Single firm testing (your mom's company) |
| Post-MVP Scale | 50+ accountants | National rollout goal |
| Database | Supabase (PostgreSQL) | User specified |
| Auth | Supabase Auth | Email/Password for both roles |
| File Storage | Supabase Storage | Excel, CSV, PDF support |
| Languages | Macedonian + English | Bilingual interface |

## Functional Requirements

### F1: Authentication & Authorization
- Accountant registration and login
- Client accounts created/invited by accountant
- Role-based access (accountant sees all their clients, client sees only their data)

### F2: File Management
- Upload Excel (.xlsx, .xls), CSV, PDF files
- Store files in cloud with metadata
- List, download, delete files
- Track file processing status

### F3: Data Processing
- Parse Excel/CSV files into structured records
- Detect file format/source type automatically
- Merge multiple files with source tracking
- Handle overlapping records (same Налог codes)

### F4: Data Viewing
- Interactive table with sorting, filtering
- Financial summary statistics (totals, balances)
- Export merged data to Excel/CSV
- Color-coded source identification

### F5: Client Portal
- Accountant invites client via email
- Client can upload documents (invoices, receipts)
- Client views shared reports/summaries
- Client cannot see other clients' data

### F6: Notifications (Post-MVP)
- Email when client uploads new document
- Email when accountant shares report

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99% uptime |
| Response Time | < 2s for page loads |
| File Size Limit | 10MB per file (MVP) |
| Concurrent Users | 10 (MVP) |
| Data Retention | Indefinite (user-managed) |

## Success Criteria

**MVP Success:**
- 1 accountant (your mom's firm) actively using platform
- 5+ clients onboarded
- 50+ files processed successfully
- Replaces manual Excel merging workflow

**Post-MVP Success:**
- 10 paying accountants
- 100+ client accounts
- Positive feedback on usability vs old software

## Out of Scope (MVP)

- Mobile app
- OCR for PDF documents
- Integration with Macedonian tax authority (UJP)
- Automated invoice recognition
- Multi-accountant firms (single seat only)
- Billing/payments

## Hotspots (Need Decisions)

| Hotspot | Question |
|---------|----------|
| File Format Detection | How to auto-detect source type (Hami stam vs Zubeks vs generic)? |
| Data Validation | What validation rules for parsed records? |
| Sharing Model | Can accountant share specific files or only merged reports? |
| PDF Handling | Store only or attempt text extraction? |
