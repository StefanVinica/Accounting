# Сметководствена Платформа МК (Accounting Platform MK)

Cloud-based accounting platform for Macedonia. Enables accountants to upload Excel files, parse financial records, merge data from multiple sources, and share reports with clients.

## Features

### Authentication & User Management
- Email/password authentication via Supabase Auth
- Two user roles: **Accountant** (full access) and **Client** (limited access)
- User profile management
- Secure session handling

### File Management
- Upload Excel (.xlsx, .xls), CSV, and PDF files
- Automatic document type detection:
  - Analytical Card (simple)
  - Analytical Card (detailed)
  - Balance Sheet
- File processing extracts records to database
- View, download, and delete files
- File status tracking (uploaded, processing, processed, error)

### Records Management
- View all accounting records with pagination
- Filter records by file, date range, and search terms
- Sortable columns (document number, date)
- Automatic invoice number extraction from description fields
- Export records to CSV
- Summary statistics (total debit, credit, balance)

### Invoice Matching (Merge Jobs)
- Merge records from multiple files
- Automatic invoice matching based on extracted invoice numbers
- Match status tracking:
  - **Paid** - invoice fully paid (balance = 0)
  - **Partial** - invoice partially paid
  - **Outstanding** - invoice unpaid
  - **Overpaid** - payments exceed invoice amount
- Expandable invoice groups showing linked records
- Filter by match status
- Overlap detection for duplicate document numbers
- Export merged results to CSV

### Client Management (Accountants only)
- Invite clients via email
- Manage client relationships
- Share files and reports with clients

### Internationalization
- Bilingual interface: Macedonian (primary) and English
- Language switcher in header

### UI/UX
- Responsive design with Tailwind CSS
- Dark mode support
- Toast notifications
- Loading states and empty states
- Confirmation modals for destructive actions

## Tech Stack

- **Frontend**: Vue 3 + Vite + Tailwind CSS 4 + Pinia + vue-i18n + vue-router
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Deployment**: Supabase hosted

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Add your Supabase credentials
npm run dev
```

### Environment Variables
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── api/          # Supabase client wrappers
│   │   ├── components/   # Reusable Vue components
│   │   ├── i18n/         # Translations (mk.json, en.json)
│   │   ├── stores/       # Pinia stores (auth, ui)
│   │   └── views/        # Page components
│   └── ...
├── prototype/            # Python scripts for Excel processing
├── design-catalog/       # System design artifacts
└── supabase/
    └── functions/        # Edge Functions
```

## Database Schema

- **profiles** - User profiles (name, company, role)
- **files** - Uploaded files with metadata and document type
- **records** - Parsed accounting records with invoice numbers
- **client_relationships** - Accountant-client connections
- **merge_jobs** - Merge job metadata
- **match_groups** - Invoice match groups per merge job

## License

Private - All rights reserved
