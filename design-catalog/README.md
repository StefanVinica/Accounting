# Design Catalog: Сметководствена Платформа МК

> Cloud-based accounting platform for Macedonia

## Overview

This catalog contains the system design artifacts for a web-based accounting platform that enables accountants to upload Excel/CSV files, merge data from multiple sources, and share reports with clients.

**Tech Stack:** Next.js + Supabase (Auth, Storage, PostgreSQL)

## Navigation

| Artifact | Description |
|----------|-------------|
| [requirements.md](requirements.md) | Business requirements and constraints |
| [big-picture.md](big-picture.md) | EventStorming overview |
| **Processes** | |
| [process-file-upload.md](processes/process-file-upload.md) | File upload & parse flow |
| [process-data-merge.md](processes/process-data-merge.md) | Data merge workflow |
| [process-client-invite.md](processes/process-client-invite.md) | Client invitation flow |
| **Data Models** | |
| [erd.md](data/erd.md) | Entity Relationship Diagram |
| [state-file.md](data/state-file.md) | File entity lifecycle |
| [state-client-relationship.md](data/state-client-relationship.md) | Client relationship lifecycle |
| **Sequence Flows** | |
| [sequence-file-upload.md](flows/sequence-file-upload.md) | Technical upload sequence |
| [sequence-merge.md](flows/sequence-merge.md) | Technical merge sequence |

---

## Big Picture (EventStorming)

```mermaid
flowchart TB
    classDef event fill:#ff9800,stroke:#e65100,color:#000
    classDef command fill:#2196f3,stroke:#0d47a1,color:#fff
    classDef actor fill:#ffeb3b,stroke:#f57f17,color:#000
    classDef system fill:#9c27b0,stroke:#4a148c,color:#fff
    classDef aggregate fill:#4caf50,stroke:#1b5e20,color:#fff
    classDef hotspot fill:#f44336,stroke:#b71c1c,color:#fff

    Accountant[👤 Accountant]:::actor
    Client[👤 Client]:::actor

    subgraph Onboarding["🔐 Onboarding"]
        Register[Register Account]:::command
        AccountCreated[Account Created]:::event
        InviteClient[Invite Client]:::command
        ClientInvited[Client Invited]:::event
        AcceptInvite[Accept Invitation]:::command
        ClientJoined[Client Joined]:::event
    end

    subgraph FileManagement["📁 File Management"]
        UploadFile[Upload File]:::command
        FileUploaded[File Uploaded]:::event
        FileAgg[(File)]:::aggregate
        ParseFile[Parse File]:::command
        FileParsed[File Parsed]:::event
        RecordsAgg[(Records)]:::aggregate
    end

    subgraph DataProcessing["⚙️ Data Processing"]
        MergeFiles[Merge Files]:::command
        MergeCreated[Merge Job Created]:::event
        MergeAgg[(Merge Job)]:::aggregate
        MergeCompleted[Merge Completed]:::event
        ExportData[Export Data]:::command
        DataExported[Data Exported]:::event
    end

    subgraph ClientPortal["👥 Client Portal"]
        ClientUpload[Upload Document]:::command
        DocUploaded[Document Uploaded]:::event
        ShareReport[Share with Client]:::command
        ReportShared[Report Shared]:::event
    end

    SupabaseAuth[🔌 Supabase Auth]:::system
    SupabaseStorage[🔌 Supabase Storage]:::system
    EmailService[🔌 Email Service]:::system

    Hot1[❓ Auto-detect file format?]:::hotspot

    Accountant --> Register
    Register --> AccountCreated
    AccountCreated --> SupabaseAuth
    Accountant --> InviteClient
    InviteClient --> ClientInvited
    ClientInvited --> EmailService
    Client --> AcceptInvite
    AcceptInvite --> ClientJoined

    Accountant --> UploadFile
    Client --> UploadFile
    UploadFile --> FileUploaded
    FileUploaded --> SupabaseStorage
    FileUploaded --> FileAgg
    FileUploaded --> ParseFile
    ParseFile --> FileParsed
    FileParsed --> RecordsAgg
    FileParsed -.-> Hot1

    Accountant --> MergeFiles
    MergeFiles --> MergeCreated
    MergeCreated --> MergeAgg
    MergeCreated --> MergeCompleted
    MergeCompleted --> ExportData
    ExportData --> DataExported

    Client --> ClientUpload
    ClientUpload --> DocUploaded
    Accountant --> ShareReport
    ShareReport --> ReportShared
    ReportShared --> EmailService
```

---

## Entity Relationship Diagram

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
    }

    CLIENT_RELATIONSHIP {
        uuid id PK
        uuid accountant_id FK
        uuid client_id FK
        enum status "pending | active | inactive | expired"
        text invite_token
    }

    FILE {
        uuid id PK
        uuid owner_id FK
        text file_name
        text storage_path
        enum file_type "xlsx | xls | csv | pdf"
        enum status "uploaded | processing | processed | error"
        text source_format
        int record_count
    }

    RECORD {
        uuid id PK
        uuid file_id FK
        text nalog
        date data
        decimal dolgуva
        decimal pobaruva
        text opis
    }

    MERGE_JOB {
        uuid id PK
        uuid owner_id FK
        enum status "pending | processing | completed | error"
        uuid output_file_id FK
        jsonb stats
    }

    MERGE_JOB_FILE {
        uuid merge_job_id FK
        uuid file_id FK
    }
```

---

## File State Chart

```mermaid
stateDiagram-v2
    [*] --> Uploaded: User uploads file

    Uploaded --> Processing: Parse triggered
    Uploaded --> Deleted: User deletes

    Processing --> Processed: Parse successful
    Processing --> Error: Parse failed

    Processed --> Deleted: User deletes
    Processed --> Processing: Re-parse requested

    Error --> Processing: Retry parse
    Error --> Deleted: User deletes

    Deleted --> [*]

    note right of Uploaded
        File stored in Supabase Storage
        Metadata created in database
    end note

    note right of Processed
        Records stored in database
        Ready for merge operations
    end note
```

---

## Client Relationship State Chart

```mermaid
stateDiagram-v2
    [*] --> Pending: Accountant invites client

    Pending --> Active: Client accepts invitation
    Pending --> Expired: 7 days passed
    Pending --> [*]: Accountant cancels

    Expired --> Pending: Accountant re-invites

    Active --> Inactive: Accountant deactivates
    Active --> [*]: Accountant removes client

    Inactive --> Active: Accountant reactivates
    Inactive --> [*]: Accountant removes client
```

---

## File Upload Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant Auth as Supabase Auth
    participant Store as Supabase Storage
    participant DB as PostgreSQL
    participant Parser as Excel Parser

    U->>FE: Select file to upload
    FE->>Auth: Verify session
    Auth-->>FE: Session valid

    FE->>FE: Validate file (type, size)
    FE->>Store: Upload file
    Store-->>FE: Storage path

    FE->>DB: Create file record (status: uploaded)
    DB-->>FE: File ID

    FE->>Parser: Trigger parse
    Parser->>Store: Download file
    Parser->>Parser: Extract & map data

    alt Parse successful
        Parser->>DB: Insert records
        Parser->>DB: Update file (status: processed)
        Parser-->>FE: Complete
        FE-->>U: Show success
    else Parse failed
        Parser->>DB: Update file (status: error)
        Parser-->>FE: Failed
        FE-->>U: Show error
    end
```

---

## Data Merge Sequence

```mermaid
sequenceDiagram
    autonumber
    participant A as Accountant
    participant FE as Frontend
    participant DB as PostgreSQL
    participant Merger as Merge Engine
    participant Store as Supabase Storage

    A->>FE: Select files to merge
    FE->>DB: Get processed files
    DB-->>FE: File list
    A->>FE: Confirm selection

    FE->>DB: Create merge_job
    DB-->>FE: merge_job_id

    FE->>Merger: Execute merge
    Merger->>DB: Load records
    DB-->>Merger: Records array

    Merger->>Merger: Combine + sort + calculate stats

    Note over Merger: Stats: totals, balance, overlaps

    Merger->>Store: Save HTML viewer
    Merger->>DB: Update merge_job (completed)
    Merger-->>FE: Done

    FE-->>A: Show interactive viewer

    A->>FE: Export to Excel
    FE->>Merger: Generate Excel
    Merger-->>FE: Download URL
    FE-->>A: Download file
```

---

## Process: File Upload & Parse

```mermaid
flowchart TD
    classDef event fill:#ff9800,stroke:#e65100,color:#000
    classDef command fill:#2196f3,stroke:#0d47a1,color:#fff
    classDef actor fill:#ffeb3b,stroke:#f57f17,color:#000
    classDef aggregate fill:#4caf50,stroke:#1b5e20,color:#fff
    classDef decision fill:#e1bee7,stroke:#7b1fa2,color:#000
    classDef hotspot fill:#f44336,stroke:#b71c1c,color:#fff

    User[👤 User]:::actor
    Upload[Upload File]:::command
    Validate{Valid?}:::decision
    Invalid[Upload Rejected]:::event
    Store[Store File]:::command
    FileUploaded[File Uploaded]:::event
    FileAgg[(File)]:::aggregate

    Detect{File type?}:::decision
    IsExcel[Excel/CSV]:::event
    IsPDF[PDF]:::event

    Parse[Parse Data]:::command
    FileParsed[File Parsed]:::event
    RecordsAgg[(Records)]:::aggregate
    ParseError[Parse Failed]:::event

    User --> Upload
    Upload --> Validate
    Validate -->|No| Invalid
    Validate -->|Yes| Store
    Store --> FileUploaded
    FileUploaded --> FileAgg
    FileUploaded --> Detect

    Detect -->|xlsx/csv| IsExcel
    Detect -->|pdf| IsPDF

    IsExcel --> Parse
    Parse --> FileParsed
    Parse --> ParseError
    FileParsed --> RecordsAgg
```

---

## Process: Data Merge

```mermaid
flowchart TD
    classDef event fill:#ff9800,stroke:#e65100,color:#000
    classDef command fill:#2196f3,stroke:#0d47a1,color:#fff
    classDef actor fill:#ffeb3b,stroke:#f57f17,color:#000
    classDef aggregate fill:#4caf50,stroke:#1b5e20,color:#fff

    Accountant[👤 Accountant]:::actor
    SelectFiles[Select Files]:::command
    FilesSelected[Files Selected]:::event
    CreateJob[Create Merge Job]:::command
    JobCreated[Job Created]:::event
    MergeAgg[(Merge Job)]:::aggregate

    LoadRecords[Load Records]:::command
    DetectOverlaps[Detect Overlaps]:::command
    AddSource[Add Source Column]:::command
    SortByDate[Sort by Date]:::command
    CalcStats[Calculate Stats]:::command
    StatsAgg[(Stats)]:::aggregate

    GenerateOutput[Generate Output]:::command
    MergeCompleted[Merge Completed]:::event

    ViewHTML[View HTML Report]:::command
    ExportExcel[Export Excel]:::command
    DataExported[Data Exported]:::event

    Accountant --> SelectFiles
    SelectFiles --> FilesSelected
    FilesSelected --> CreateJob
    CreateJob --> JobCreated
    JobCreated --> MergeAgg

    MergeAgg --> LoadRecords
    LoadRecords --> DetectOverlaps
    DetectOverlaps --> AddSource
    AddSource --> SortByDate
    SortByDate --> CalcStats
    CalcStats --> StatsAgg

    StatsAgg --> GenerateOutput
    GenerateOutput --> MergeCompleted

    MergeCompleted --> ViewHTML
    MergeCompleted --> ExportExcel
    ExportExcel --> DataExported
```

---

## Hotspots (Decisions Needed)

| ID | Question | Impact |
|----|----------|--------|
| H1 | How to auto-detect source file format (Hami stam vs Zubeks vs generic)? | Affects parsing logic |
| H2 | What validation rules for parsed records? | Data quality |
| H3 | Should PDFs have text extraction or store-only? | Scope creep risk |
| H4 | Share specific files or only merged reports with clients? | Client portal design |

---

## Next Steps

1. **Review design** - Does this capture the system correctly?
2. **Resolve hotspots** - Make decisions on open questions
3. **Implementation planning** - Break down into tasks
4. **Database setup** - Create Supabase schema from ERD
5. **Start Sprint 1** - Auth + basic dashboard
