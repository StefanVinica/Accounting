# Entity Relationship Diagram

This diagram shows all data entities in the system and their relationships.

## Overview

The platform has **6 main entities**:
- **Profile** - Users (accountants and clients)
- **Client Relationship** - Links accountants to their clients
- **File** - Uploaded Excel/CSV/PDF files
- **Record** - Parsed data rows from Excel/CSV files
- **Merge Job** - A job that combines multiple files
- **Merge Job File** - Links files to merge jobs (many-to-many)

## Entity Relationships

```mermaid
erDiagram
    PROFILE ||--o{ FILE : uploads
    PROFILE ||--o{ CLIENT_RELATIONSHIP : "as accountant"
    PROFILE ||--o{ CLIENT_RELATIONSHIP : "as client"
    PROFILE ||--o{ MERGE_JOB : creates

    FILE ||--o{ RECORD : contains
    FILE ||--o{ MERGE_JOB_FILE : "included in"

    MERGE_JOB ||--o{ MERGE_JOB_FILE : includes
    MERGE_JOB ||--o| FILE : "produces output"

    PROFILE {
        uuid id PK
        text email UK
        text full_name
        text company_name
        enum role "accountant | client"
        text language "mk | en"
        timestamp created_at
        timestamp updated_at
    }

    CLIENT_RELATIONSHIP {
        uuid id PK
        uuid accountant_id FK
        uuid client_id FK
        enum status "pending | active | inactive | expired"
        text invite_token
        timestamp invited_at
        timestamp accepted_at
        timestamp expires_at
    }

    FILE {
        uuid id PK
        uuid owner_id FK
        text file_name
        text storage_path
        bigint file_size
        enum file_type "xlsx | xls | csv | pdf"
        enum status "uploaded | processing | processed | error"
        text source_format "hami_stam | zubeks | generic"
        int record_count
        jsonb parse_errors
        timestamp created_at
        timestamp processed_at
    }

    RECORD {
        uuid id PK
        uuid file_id FK
        uuid owner_id FK
        text nalog "document number"
        date data "date"
        int valuta "currency"
        int m_ddv "VAT month"
        text opis "description"
        text zatvoranje "closing ref"
        text zabeleska "note"
        decimal dolgува "debit"
        decimal pobaruva "credit"
        text edin "unit"
        int row_number
        jsonb raw_data
    }

    MERGE_JOB {
        uuid id PK
        uuid owner_id FK
        text name
        enum status "pending | processing | completed | error"
        uuid output_file_id FK
        jsonb settings "sort_by filters etc"
        jsonb stats "totals overlaps etc"
        timestamp created_at
        timestamp completed_at
    }

    MERGE_JOB_FILE {
        uuid id PK
        uuid merge_job_id FK
        uuid file_id FK
        int order_index
    }
```

## Entity Details

### PROFILE
Extends Supabase `auth.users`. Stores additional user information.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (from auth.users) |
| email | TEXT | User's email (unique) |
| full_name | TEXT | Display name |
| company_name | TEXT | Business name |
| role | ENUM | `accountant` or `client` |
| language | TEXT | `mk` or `en` |

### CLIENT_RELATIONSHIP
Links accountants to their clients. An accountant can have many clients.

| Field | Type | Description |
|-------|------|-------------|
| accountant_id | UUID | The accountant |
| client_id | UUID | The client |
| status | ENUM | `pending`, `active`, `inactive`, `expired` |
| invite_token | TEXT | Token sent in invitation email |

### FILE
Represents an uploaded file (Excel, CSV, or PDF).

| Field | Type | Description |
|-------|------|-------------|
| owner_id | UUID | Who uploaded it |
| file_name | TEXT | Original filename |
| storage_path | TEXT | Path in Supabase Storage |
| file_type | ENUM | `xlsx`, `xls`, `csv`, `pdf` |
| status | ENUM | `uploaded`, `processing`, `processed`, `error` |
| source_format | TEXT | Detected format (e.g., `hami_stam`) |
| record_count | INT | Number of records extracted |

### RECORD
A single row of data parsed from an Excel/CSV file. Matches the accounting ledger format.

| Field | Type | Description (Macedonian) |
|-------|------|-------------|
| nalog | TEXT | Налог - Document number |
| data | DATE | Дата - Date |
| valuta | INT | Вал. - Currency code |
| m_ddv | INT | м.ддв - VAT month |
| opis | TEXT | Опис - Description |
| zatvoranje | TEXT | Затворање - Closing reference |
| zabeleska | TEXT | Забелешка - Note |
| dolgува | DECIMAL | Долгува - Debit amount |
| pobaruva | DECIMAL | Побарува - Credit amount |
| edin | TEXT | Един - Unit |

### MERGE_JOB
Represents a merge operation combining multiple files.

| Field | Type | Description |
|-------|------|-------------|
| owner_id | UUID | Accountant who created it |
| status | ENUM | `pending`, `processing`, `completed`, `error` |
| output_file_id | UUID | Generated output file |
| stats | JSONB | Calculated statistics (totals, overlaps) |

## Relationship Summary

| From | To | Type | Description |
|------|----|------|-------------|
| Profile | File | 1:N | User uploads many files |
| Profile | Client Relationship | 1:N | Accountant has many client links |
| Profile | Merge Job | 1:N | Accountant creates many merge jobs |
| File | Record | 1:N | File contains many records |
| Merge Job | File | N:M | Merge job includes many files (via MERGE_JOB_FILE) |
| Merge Job | File | 1:1 | Merge job produces one output file |
