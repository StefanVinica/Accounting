# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloud-based accounting platform for Macedonia ("Сметководствена Платформа МК"). Enables accountants to upload Excel files, parse financial records, merge data from multiple sources, and share reports with clients.

**Tech Stack:**
- Frontend: Vue 3 + Vite + Tailwind CSS 4 + Pinia + vue-i18n + vue-router
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Prototype: Python (pandas, openpyxl) for Excel merging

## Commands

### Frontend Development
```bash
cd frontend
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run preview  # Preview production build
```

### Environment Setup
Frontend requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`

## Architecture

### Frontend (`/frontend/src/`)
- **views/**: Page components - DashboardView, FilesView, RecordsView, ClientsView, MergeJobsView, ProfileView, auth views
- **components/**: Reusable components - `common/` (Toast, EmptyState, StatusBadge, LoadingSpinner, ConfirmModal), `files/` (FileUploadZone), `layout/` (Header, Sidebar)
- **stores/**: Pinia stores - `auth.js` (user session, profile), `ui.js` (sidebar state, dark mode)
- **api/**: Supabase client wrappers - auth.js, files.js, records.js, merge.js, clients.js
- **i18n/**: Translations in mk.json and en.json

### Backend (Supabase)
- **Database tables**: profiles, files, records, client_relationships, merge_jobs
- **Storage bucket**: `uploads` for Excel/CSV/PDF files
- **Edge Functions**: `process-file` - parses Excel files and extracts records to database
- **RLS**: Row-level security policies for data isolation between users

### User Roles
- `accountant`: Full access to clients, files, merge operations
- `client`: Limited access to their own files and shared reports

### Route Protection
Router guards in `/frontend/src/router/index.js` handle:
- `requiresAuth`: Redirects to login if unauthenticated
- `requiresRole`: Restricts routes by role (e.g., clients cannot access merge)
- `guest`: Auth pages redirect to dashboard if logged in

## Excel Parsing Logic

Macedonian accounting files have specific structure:
- **Row 0-2**: Header info (account code, company name)
- **Row 3**: Column headers
- **Row 4+**: Data rows

Column mapping (Macedonian → database):
```
Налог → nalog (document number)
Дата → data (date)
Вал. → valuta (currency)
м.ддв → m_ddv (VAT month)
Опис → opis (description)
Затворање → zatvoranje (closing reference)
Забелешка → zabeleska (note)
Долгува → dolguja (debit)
Побарува → pobaruva (credit)
Един → edin (unit)
```

## Design Documentation

- `/design-catalog/`: System design artifacts including ERD, process flows, state diagrams
- `/prototype/docs/MVP_PLAN.md`: Original MVP specification
- `/prototype/merge_excel.py`: Reference implementation for Excel parsing/merging logic

## Conventions

- Use python3 for any Python scripts
- Update Daily updates section when making significant changes
- Track dependencies in requirements documentation
- UI components use Tailwind CSS utility classes with dark mode support (`.dark` class on html)
- Bilingual interface: Macedonian (mk) is primary, English (en) secondary
