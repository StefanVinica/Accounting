# Invoice Number Detection

This document explains how invoice numbers are extracted from Macedonian accounting documents.

## Overview

Invoice numbers are extracted from accounting records to enable matching between invoices (credit entries) and payments (debit entries). The system identifies invoice references in the description fields and normalizes them for consistent matching.

---

## Document Types

The system handles three types of accounting documents:

### 1. Analytical Card - Per Account (Аналитичка картица по конто)
- **Structure**: Records for a single account (konto) across multiple companies/partners
- **Header position**: Row 3 (0-indexed)
- **Konto info**: Stored in row 0 (e.g., "2210" = Suppliers account)
- **Invoice sources**: Found in `Опис` and `Затворање` columns

### 2. Analytical Card - Per Company (Аналитичка картица по фирма)
- **Structure**: Records for a single company across multiple accounts
- **Header position**: Row 2 (0-indexed) - one row higher than per-account
- **Columns**: Includes additional `Конто` and `Име на контото` columns
- **Invoice sources**: Found in `Опис` and `Затворање` columns

### 3. Balance Sheet (Заклучна листа)
- **Structure**: Summary balances per account
- **Columns**: Includes `Почетно салдо` and `Крајно салдо` (opening/closing balance)
- **Invoice extraction**: Not applicable (summary data only)

---

## Invoice Number Formats

Macedonian accounting uses several invoice number formats:

### Format 1: Number/Year (most common)
| Example | Extracted |
|---------|-----------|
| `145/2025` | `145/2025` |
| `211/25` | `211/2025` (short year normalized) |
| `101/2025` | `101/2025` |

This is the standard format: invoice number followed by slash and year.

### Format 2: F-Prefixed
| Example | Extracted |
|---------|-----------|
| `F.145/2025` | `145/2025` |
| `f.210/2025` | `210/2025` |
| `F.223/25` | `223/2025` |

The "F." prefix (Фактура = Invoice) is stripped. Case insensitive.

### Format 3: Фактура Prefix (Cyrillic)
| Example | Extracted |
|---------|-----------|
| `Фактура 101/2025` | `101/2025` |
| `Фактура 121/2025 T 187` | `121/2025 T 187` |

Explicit invoice label in Macedonian. The "T" suffix is preserved for disambiguation.

### Format 4: Dash-Suffix Codes
| Example | Extracted |
|---------|-----------|
| `509231-RK` | `509231 RK` |
| `526851-PK` | `526851 PK` |
| `536167-РК` | `536167 РК` |

Numeric ID with suffix code. Common suffixes:
- **RK/РК**: Possibly "Rачун Купец" (Customer Invoice)
- **PK/ПК**: Possibly "Плаќање Купец" (Customer Payment)

### Format 5: With PR Reference
| Example | Extracted |
|---------|-----------|
| `F.536167-PK PR.79` | `536167 PK` |

The "PR.XX" part (Приём = Receipt) is ignored; main invoice number is kept.

---

## Source Field Priority

Invoice numbers are extracted from three fields, in priority order:

1. **Затворање** (Closing Reference) - Most reliable
2. **Опис** (Description) - Secondary source
3. **Забелешка** (Note) - Fallback

### Why Затворање First?

The `Затворање` column is specifically designed for cross-referencing. When a payment is made, this field contains the invoice number being paid. It's more structured and less likely to contain irrelevant text.

### Опис Exceptions

The `Опис` field is skipped when it contains **bank statement** references:

| Опис | Затворање | Extracted From |
|------|-----------|----------------|
| `Извод 221` | `F.210/2025` | Затворање → `210/2025` |
| `Извод 221` | `211/25` | Затворање → `211/2025` |
| `Фактура 101/2025` | `101/2025` | Either (same result) |

**"Извод"** (Bank Extract/Statement) indicates this is a bank transaction, not an invoice. The description just names the bank statement number, while the actual invoice being paid is in `Затворање`.

---

## Normalization Rules

All extracted invoice numbers undergo normalization:

### Year Normalization
Short years are expanded to full years:
- `25` → `2025`
- `24` → `2024`

### Prefix Stripping
These prefixes are removed:
- `F.` / `f.`
- `Фактура ` (with space)

### Suffix Handling
Suffixes are preserved but formatted consistently:
- Dash removed: `509231-RK` → `509231 RK`
- Space added if needed
- Uppercase: `pk` → `PK`

### T Suffix (Disambiguation)
The "T XXX" pattern is kept when present:
- `Фактура 101/2025 T 147` → `101/2025 T 147`

This handles cases where the same invoice number exists with different transaction references.

---

## Matching Logic

After extraction, records are grouped by normalized invoice number:

1. **Credit entries** (`Побарува` > 0): Original invoice amount
2. **Debit entries** (`Долгува` > 0): Payments against invoice

### Match Status Calculation

| Status | Condition |
|--------|-----------|
| **Paid** | Total Debit = Total Credit (balance = 0) |
| **Partial** | Total Debit > 0 but < Total Credit |
| **Outstanding** | Total Debit = 0 (no payments) |
| **Overpaid** | Total Debit > Total Credit (balance < 0) |

---

## Examples

### Example 1: Simple Invoice Payment
```
Record 1: Опис="Фактура 145/2025", Побарува=10000  → Invoice: 145/2025
Record 2: Опис="Извод 45", Затворање="F.145/2025", Долгува=10000 → Invoice: 145/2025
```
Result: Match group "145/2025" with balance 0 (Paid)

### Example 2: Partial Payment
```
Record 1: Затворање="509231-RK", Побарува=50000 → Invoice: 509231 RK
Record 2: Затворање="509231-RK", Долгува=20000 → Invoice: 509231 RK
```
Result: Match group "509231 RK" with balance 30000 (Partial)

### Example 3: Bank Statement Entry
```
Record: Опис="Извод 221", Затворање="211/25", Долгува=15000
```
- Опис contains "Извод" → Skip Опис
- Extract from Затворање: `211/25` → `211/2025`
- Result: Payment linked to invoice 211/2025

---

## Non-Extractable Records

Some records don't have extractable invoice numbers:

- Opening/closing balance entries (`Салдо`)
- General journal entries without invoice reference
- Correction entries
- Records with only numeric descriptions that don't match patterns

These records are stored with `invoice_number = null` and won't participate in matching.
