# Big Picture: EventStorming Overview

This diagram shows the entire system at a glance using **EventStorming** methodology.

## Color Legend

| Color | Element | Description |
|-------|---------|-------------|
| 🟡 Yellow | **Actor** | Who initiates actions (Accountant, Client) |
| 🔵 Blue | **Command** | Actions users take (Upload File, Merge Files) |
| 🟠 Orange | **Event** | Things that happen (File Uploaded, Merge Completed) |
| 🟢 Green | **Aggregate** | Data entities that change (File, Records, Merge Job) |
| 🟣 Purple | **External System** | Third-party services (Supabase, Email) |
| 🔴 Red | **Hotspot** | Open questions needing decisions |

## System Overview

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
        ParseFailed[Parse Failed]:::event
        RecordsAgg[(Records)]:::aggregate
        DeleteFile[Delete File]:::command
        FileDeleted[File Deleted]:::event
    end

    subgraph DataProcessing["⚙️ Data Processing"]
        SelectFiles[Select Files to Merge]:::command
        MergeFiles[Merge Files]:::command
        MergeCreated[Merge Job Created]:::event
        MergeAgg[(Merge Job)]:::aggregate
        MergeCompleted[Merge Completed]:::event
        MergeFailed[Merge Failed]:::event
        ExportData[Export Data]:::command
        DataExported[Data Exported]:::event
    end

    subgraph ClientPortal["👥 Client Portal"]
        ClientUpload[Upload Document]:::command
        DocUploaded[Document Uploaded]:::event
        ViewReport[View Report]:::command
        ReportViewed[Report Viewed]:::event
        ShareReport[Share with Client]:::command
        ReportShared[Report Shared]:::event
    end

    SupabaseAuth[🔌 Supabase Auth]:::system
    SupabaseStorage[🔌 Supabase Storage]:::system
    EmailService[🔌 Email Service]:::system

    Hot1[❓ Auto-detect file format?]:::hotspot
    Hot2[❓ Validation rules for records?]:::hotspot
    Hot3[❓ PDF text extraction?]:::hotspot

    Accountant --> Register
    Register --> AccountCreated
    AccountCreated --> SupabaseAuth
    Accountant --> InviteClient
    InviteClient --> ClientInvited
    ClientInvited --> EmailService
    Client --> AcceptInvite
    AcceptInvite --> ClientJoined
    ClientJoined --> SupabaseAuth

    Accountant --> UploadFile
    Client --> UploadFile
    UploadFile --> FileUploaded
    FileUploaded --> SupabaseStorage
    FileUploaded --> FileAgg
    FileUploaded --> ParseFile
    ParseFile --> FileParsed
    ParseFile --> ParseFailed
    FileParsed --> RecordsAgg
    Accountant --> DeleteFile
    DeleteFile --> FileDeleted

    Accountant --> SelectFiles
    SelectFiles --> MergeFiles
    MergeFiles --> MergeCreated
    MergeCreated --> MergeAgg
    MergeCreated --> MergeCompleted
    MergeCreated --> MergeFailed
    MergeCompleted --> ExportData
    ExportData --> DataExported
    DataExported --> SupabaseStorage

    Client --> ClientUpload
    ClientUpload --> DocUploaded
    DocUploaded --> FileAgg
    Client --> ViewReport
    ViewReport --> ReportViewed
    Accountant --> ShareReport
    ShareReport --> ReportShared
    ReportShared --> EmailService

    FileParsed -.-> Hot1
    FileParsed -.-> Hot2
    DocUploaded -.-> Hot3
```

## Key Flows

### 1. Onboarding Flow
1. Accountant registers → Account created in Supabase Auth
2. Accountant invites client → Email sent
3. Client accepts invitation → Joins platform

### 2. File Management Flow
1. User (accountant or client) uploads file → Stored in Supabase Storage
2. System parses Excel/CSV → Records extracted to database
3. If parse fails → Error recorded, user notified

### 3. Data Processing Flow
1. Accountant selects multiple files → Creates merge job
2. System merges data → Detects overlaps, calculates stats
3. Accountant exports → Downloads Excel/CSV or views HTML report

### 4. Client Portal Flow
1. Client uploads documents → Stored for accountant review
2. Accountant shares reports → Client notified via email
3. Client views shared reports → Read-only access

## Hotspots (Decisions Needed)

| Hotspot | Question | Recommendation |
|---------|----------|----------------|
| H1 | How to auto-detect file format? | Check header patterns (Hami stam vs Zubeks) |
| H2 | What validation rules for records? | Required: Налог, Дата; Numeric: Долгува, Побарува |
| H3 | Should PDFs have text extraction? | MVP: Store only, Post-MVP: OCR |
