# Data Dictionary

This document describes all fields in the Excel-based data model.

## Table of Contents
- [companies.xlsx](#companiesxlsx)
- [Core.xlsx](#corexlsx)
- [Users.xlsx](#usersxlsx)
- [Workstations.xlsx](#workstationsxlsx)
- [Phone Numbers.xlsx](#phone-numbersxlsx)
- [Emails.xlsx](#emailsxlsx)
- [External_Info.xlsx](#external_infoxlsx)
- [Managed_Info.xlsx](#managed_infoxlsx)
- [Admin Emails.xlsx](#admin-emailsxlsx)
- [Admin Mitel Logins.xlsx](#admin-mitel-loginsxlsx)
- [Acronis Backups.xlsx](#acronis-backupsxlsx)
- [Cloudflare_Admins.xlsx](#cloudflare_adminsxlsx)

---

## companies.xlsx

**Location:** `S:\PBIData\Biztech\companies.xlsx`
**Sheet Name:** `Companies`
**Purpose:** Master list of all clients

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Company Name | String | Full company name | Biztech | Yes | Primary display name |
| Abbrv | String | Company abbreviation code | BT | Yes | **Primary Key** - Used as foreign key in all other files |
| Group | String | Company grouping/category | CLOUD | No | Used for filtering |
| Status | Integer | Active status | 1 | Yes | 1 = Active, 0 = Inactive |

**Relationships:**
- `Abbrv` is referenced by `Client` field in all other tables

**Sample Data:**
```csv
Company Name, Abbrv, Group, Status
Biztech, BT, CLOUD, 1
Ace Engineering, AE, ONSITE, 1
```

---

## Core.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Core.xlsx`
**Sheet Name:** `Infrastructure`
**Purpose:** Core IT infrastructure (servers, routers, switches, firewalls)

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| SubName | String | Sub-location or category | Office | No | e.g., "Office", "Warehouse", "Remote" |
| Name | String | Device name/description | H St. Sonicwall SOHO | Yes | Human-readable identifier |
| IP address | String | IP address or range | 192.168.103.254 | No | IPv4 format |
| Machine Name / MAC | String | Hostname or MAC address | VM HOST SERVER | No | Can be hostname, MAC, or both |
| Service Tag | String | Service tag or serial number | ABCD1234 | No | Vendor service tag |
| Description | String | Additional details | H St. office router | No | Purpose or notes |
| Login | String | Admin username | Administrator | No | Administrative login |
| Password | String | Admin password | ●●●●●● | No | **SENSITIVE** - Encrypted in production |
| Alt Login | String | Alternate username | root | No | Secondary/backup login |
| Alt Passwd | String | Alternate password | ●●●●●● | No | **SENSITIVE** |
| Notes | String | General notes | VM on TrueNAS | No | Free-form text |
| Notes 2 | String | Additional notes | Backup configured | No | Free-form text |
| On Landing Page | Integer | Show on landing page | 1 | No | 1 = Show, 0 = Hide, featured items |
| Grouping | String | Custom grouping | Network | No | For filtering/organization |
| Asset ID | String | Internal asset tracking ID | BT-SVR-001 | No | Company asset number |

**Relationships:**
- `Client` → companies.Abbrv

**Common SubName Values:**
- Office
- Warehouse
- Remote Site
- Data Center

**Device Types (inferred from Name/Description):**
- Servers (Hyper-V, Domain Controllers, File Servers)
- Routers (Sonicwall, Fortinet, etc.)
- Switches (HP, Aruba, etc.)
- Firewalls
- Access Points

---

## Users.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Users.xlsx`
**Sheet Name:** `Users`
**Purpose:** User accounts and workstation assignments

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| SubName | String | Department or location | Office | No | e.g., "Office", "Sales", "IT" |
| Computer Name | String | Assigned workstation | QBTrainer | No | Links to Workstations table |
| Name | String | User's full name | Jordan Smith | Yes | Display name |
| Login | String | Username | jordan | No | Login credential |
| Password | String | Password | ●●●●●● | No | **SENSITIVE** |
| Phone | String | Office phone | (707) 442-8393 | No | Phone number |
| Notes | String | Additional info | RDP: 192.168.201.148 | No | Free-form text |
| Active | Integer | Active status | 1 | No | 1 = Active, 0 = Inactive |
| Cell | String | Mobile phone | (707) 555-1234 | No | Cell number |
| Notes 2 | String | More notes | VPN access required | No | Free-form text |
| Epicor Number | String | Epicor system ID | E12345 | No | External system reference |
| Grouping | String | Custom grouping | IT Staff | No | For filtering |

**Relationships:**
- `Client` → companies.Abbrv
- `Computer Name` → Workstations.Computer Name (soft reference)

---

## Workstations.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Workstations.xlsx`
**Sheet Name:** `Workstations`
**Purpose:** PC, laptop, and workstation inventory

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| Computer Name | String | Machine hostname | QBTrainer | Yes | **Unique per client** |
| IP Address | String | IP address | 192.168.201.239 | No | Static or DHCP |
| Upstream | String | Gateway/switch IP | 192.168.203.254 | No | Network upstream device |
| Notes | String | General notes | RDP: 192.168.201.148 | No | Free-form text |
| Active | Integer | Active status | 1 | No | 1 = Active, 0 = Decommissioned |
| Service Tag | String | Dell/HP service tag | ABCD123 | No | Vendor service identifier |
| Description | String | Machine description | Accounting PC | No | Purpose or location |
| Notes 2 | String | Additional notes | Needs RAM upgrade | No | Free-form text |
| On Landing Page | Integer | Featured item | 1 | No | 1 = Show, 0 = Hide |
| Grouping | String | Custom grouping | Desktops | No | e.g., "Laptops", "Desktops" |
| Asset ID | String | Asset tracking ID | BT-PC-042 | No | Internal asset number |
| CPU | String | Processor type | Intel i7-10700 | No | CPU model |
| Win11 Capable | Integer | Windows 11 compatible | 1 | No | 1 = Yes, 0 = No |

**Relationships:**
- `Client` → companies.Abbrv
- Referenced by Users.Computer Name

---

## Phone Numbers.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Phone Numbers.xlsx`
**Sheet Name:** `Sheet1`
**Purpose:** Main company phone numbers

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| Name | String | Phone line name | _Main | Yes | e.g., "_Main", "Sales", "Support" |
| Number | String | Phone number | (707) 442-8393 | Yes | Formatted phone number |
| Other | String | Additional numbers | (707) 555-0123 | No | Alternate or fax numbers |

**Common Name Values:**
- _Main (primary company number)
- Sales
- Support
- Fax
- Direct Line

---

## Emails.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Emails.xlsx`
**Sheet Name:** `Email Addresses`
**Purpose:** Email account configurations

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| Username | String | Email login username | patrick@trustbiztech.com | Yes | May differ from email |
| Email | String | Email address | patrick@trustbiztech.com | Yes | Full email address |
| Name | String | User's full name | Patrick Moon | No | Display name |
| Password | String | Email password | ●●●●●● | No | **SENSITIVE** |
| Notes | String | Additional info | Outlook configured | No | Free-form text |
| MFA or Ignore | Integer | MFA status | 1 | No | 1 = MFA enabled, 0 = No MFA |
| Active | Integer | Active account | 1 | Yes | 1 = Active, 0 = Disabled |
| OWA_override | String | Outlook Web Access URL override | https://... | No | Custom OWA URL |
| IMAP_override | String | IMAP server override | imap.custom.com | No | Custom IMAP server |
| POP_override | String | POP3 server override | pop.custom.com | No | Custom POP server |
| SMTP_override | String | SMTP server override | smtp.custom.com | No | Custom SMTP server |

**Relationships:**
- `Client` → companies.Abbrv

**Email Server Overrides:**
Used when client has custom email hosting (not standard Office 365/Google Workspace)

---

## External_Info.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\External_Info.xlsx`
**Sheet Name:** `External Info`
**Purpose:** External connections, firewalls, VPN access

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| SubName | String | Location or site name | Office | No | Branch office name |
| Connection Type | String | ISP or connection type | Optimum | No | e.g., "Comcast", "AT&T", "Fiber" |
| Device Type | String | Firewall/router model | TZ400 | No | Hardware model |
| IP address | String | Public WAN IP | 24.121.212.204 | No | External IP address |
| Port | Integer | Management port | 444 | No | HTTPS admin port |
| Username | String | Admin username | admin | No | Login credential |
| Password | String | Admin password | ●●●●●● | No | **SENSITIVE** |
| Notes | String | General notes | Main Office | No | Free-form text |
| VPN Port | Integer | VPN connection port | 9513 | No | VPN service port |
| VPN Username | String | VPN username | vpnuser | No | VPN credential |
| VPN Password | String | VPN password | ●●●●●● | No | **SENSITIVE** |
| VPN Domain | String | VPN domain | LocalDomain | No | AD domain for VPN |
| DHCP | Integer | DHCP enabled | 0 | No | 1 = DHCP, 0 = Static |
| On Landing Page | Integer | Featured item | 1 | No | 1 = Show, 0 = Hide |
| Notes 2 | String | Additional notes | Firmware updated | No | Free-form text |
| Current Version | String | Firmware version | 6.5.4.13-105n | No | Current firmware |
| Last Reached Out To For Frimware Upgrade | Date | Last upgrade contact | 7/10/23 | No | Maintenance tracking |
| Order | Integer | Display order | 30 | No | Sort order |
| Grouping | String | Custom grouping | Primary Sites | No | For filtering |
| Asset ID | String | Asset tracking ID | BT-FW-001 | No | Internal asset number |

**Relationships:**
- `Client` → companies.Abbrv

**Common Device Types:**
- TZ400, TZ500 (SonicWall)
- SOHOW (SonicWall SOHO)
- FortiGate
- Cisco ASA

---

## Managed_Info.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Managed_Info.xlsx`
**Sheet Name:** `Sheet1`
**Purpose:** Managed WAN connections and ISP provider information

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | GLC | Yes | **Foreign Key** → companies.Abbrv |
| Provider | String | ISP/Carrier name | TDS | No | Internet service provider or carrier |
| IP 1 | String | Primary IP address | 12.105.215.67 | No | Primary public IP |
| IP 2 | String | Secondary IP address | 12.42.125.249 | No | Secondary/backup IP or gateway |
| Managed | Integer | Managed service flag | 1 | No | 1 = Managed by provider, 0 = Self-managed |
| Phone 1 | String | Primary support phone | 256 292 3479 | No | Main support contact |
| Phone 2 | String | Secondary support phone | 888-857-8823 | No | Additional contact number |
| Phone 3 | String | Tertiary support phone | 888 850 5915 | No | Additional contact number |
| Phone 4 | String | Quaternary support phone | 888-837-3050 | No | Additional contact number |
| Account # | String | Account number | 116313 | No | Provider account identifier |
| Type | String | Connection type | Fiber | No | e.g., "Fiber", "Cable", "DSL", "T1" |
| Note 1 | String | General notes | PIN 1168 | No | Free-form text, often contains PINs or account info |
| Note 2 | String | Additional notes | /29 | No | Network details, subnet masks, etc. |
| Active | Integer | Active status | 1 | Yes | 1 = Active, 0 = Inactive/Cancelled |

**Relationships:**
- `Client` → companies.Abbrv

**Purpose:**
Tracks managed WAN connections including ISP provider details, contact information, IP addressing, and account numbers. Used for managing internet circuits and provider support contacts.

**Common Connection Types:**
- Fiber
- Cable
- DSL
- T1/T3
- Metro Ethernet
- MPLS

**Note on Phone Fields:**
Multiple phone fields allow storage of various support numbers:
- General support lines
- Emergency/24x7 support
- Billing department
- Sales/account management
- Specific circuit support

---

## Admin Emails.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Admin Emails.xlsx`
**Sheet Name:** `Admin Emails`
**Purpose:** Administrative email accounts for system management

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| Name | String | Account name | admin | Yes | Display name |
| Email | String | Admin email address | admin@trustbiztech.com | Yes | Full email address |
| Password | String | Email password | ●●●●●● | No | **SENSITIVE** |
| Notes | String | Additional info | Used for alerts | No | Free-form text |
| Automate | Integer | Automated account | 1 | No | 1 = Automation, 0 = Human user |

**Relationships:**
- `Client` → companies.Abbrv

**Purpose:**
Administrative accounts used for system notifications, alerts, and automated processes.

---

## Admin Mitel Logins.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Admin Mitel Logins.xlsx`
**Sheet Name:** `Mitel Admins`
**Purpose:** Mitel phone system administrative logins

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| Login | String | Admin username | admin@trustbiztech.com | Yes | Mitel admin login |
| Password | String | Admin password | ●●●●●● | No | **SENSITIVE** |

**Relationships:**
- `Client` → companies.Abbrv

**Purpose:**
Login credentials for Mitel phone system management portals.

---

## Acronis Backups.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Acronis Backups.xlsx`
**Sheet Name:** `Sheet1`
**Purpose:** Acronis backup system credentials and encryption passwords

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Acronis Cyber Cloud | String | Account or service name | Biztech | No | Acronis cloud account identifier |
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| UserName | String | Acronis username | AdminBiztech | No | Login credential |
| PW | String | Account password | ●●●●●● | No | **SENSITIVE** - Main account password |
| Encrypt PW | String | Primary encryption password | ●●●●●● | No | **SENSITIVE** - Backup encryption key |
| Encrypt PW2 | String | Secondary encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |
| Encrypt PW3 | String | Tertiary encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |
| Encrypt PW4 | String | Quaternary encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |
| Encrypt PW 5 | String | Fifth encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |
| Encrypt PW 6 | String | Sixth encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |
| Encrypt PW 7 | String | Seventh encryption password | ●●●●●● | No | **SENSITIVE** - Additional encryption key |

**Relationships:**
- `Client` → companies.Abbrv

**Purpose:**
Stores Acronis Cyber Cloud backup system credentials including the main account password and multiple encryption passwords used for different backup sets or clients.

**Note on Multiple Encryption Passwords:**
Some clients may have multiple backup sets with different encryption keys. The multiple Encrypt PW fields allow storage of all encryption passwords for disaster recovery purposes. Format may include notes like "Duane: AmN" or "O365: Welcome77Intro99Port" indicating which user or service the encryption password protects.

---

## Cloudflare_Admins.xlsx

**Location:** `S:\PBIData\NetDoc\Manual\Cloudflare_Admins.xlsx`
**Sheet Name:** `CF Admins`
**Purpose:** Cloudflare account credentials

| Field | Type | Description | Example | Required | Notes |
|-------|------|-------------|---------|----------|-------|
| Client | String | Company abbreviation | BT | Yes | **Foreign Key** → companies.Abbrv |
| username | String | Cloudflare username | support@trustbiztech.com | Yes | Login email |
| pass | String | Account password | ●●●●●● | No | **SENSITIVE** |

**Relationships:**
- `Client` → companies.Abbrv

**Purpose:**
Credentials for Cloudflare DNS, CDN, and security services management.

---

## Field Type Reference

### Data Types

| Type | Description | Format Example |
|------|-------------|----------------|
| String | Text data | "Biztech", "192.168.1.1" |
| Integer | Whole numbers | 1, 0, 9513 |
| Date | Date values | "7/10/23", "2023-07-10" |

### Common Field Patterns

#### Status Fields
- **Active:** 1 = Active, 0 = Inactive/Disabled
- **Status:** 1 = Active, 0 = Inactive
- **On Landing Page:** 1 = Show, 0 = Hide
- **MFA or Ignore:** 1 = MFA Enabled, 0 = No MFA
- **Automate:** 1 = Automated, 0 = Manual/Human
- **DHCP:** 1 = DHCP, 0 = Static IP
- **Win11 Capable:** 1 = Yes, 0 = No

#### Sensitive Fields
All password fields contain sensitive data and should be:
- Encrypted at rest
- Masked in UI
- Logged only in audit trails (never in plain text)
- Transmitted over HTTPS only

Sensitive field names:
- Password, passwd, pass
- Alt Passwd
- VPN Password

#### Notes Fields
Most tables have "Notes" and "Notes 2" fields:
- Free-form text
- No character limit (within Excel limits)
- Used for additional context
- Not indexed or searchable (typically)

---

## Data Validation Rules

### IP Addresses
- Format: IPv4 (e.g., 192.168.1.1)
- Validation: Optional regex pattern `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`
- May be empty/null

### Phone Numbers
- Format: Various (e.g., "(707) 442-8393", "707-442-8393")
- No strict validation required
- Store as formatted strings

### Email Addresses
- Format: Standard email (e.g., "user@domain.com")
- Validation: RFC 5322 compliant
- Required where specified

### Client Abbreviations
- Must exist in companies.xlsx Abbrv column
- Case-sensitive
- Typically 2-5 uppercase characters

### Service Tags
- Vendor-specific format
- Usually alphanumeric
- No strict validation

---

## Indexes and Keys

### Primary Keys
- **companies.xlsx:** Abbrv (unique)
- **Users.xlsx:** Client + Computer Name (composite, semi-unique)
- **Workstations.xlsx:** Client + Computer Name (composite, unique)
- Other files: No strict primary key (row-based identification)

### Foreign Keys
All tables (except companies.xlsx) have:
- **Client** → companies.Abbrv

### Recommended Indexes (if migrating to database)
- companies.Abbrv
- All Client fields
- Active/Status fields
- Computer Name fields
- Email addresses

---

## Data Statistics (Based on Sample Data)

### Field Usage Frequency

| Field Type | Frequency | Notes |
|------------|-----------|-------|
| Client | 100% | Required in all tables |
| Name/Computer Name | ~95% | Core identifier |
| Password fields | ~60% | Not all accounts have passwords stored |
| Notes | ~40% | Optional additional info |
| Active/Status | ~90% | Most tables track active status |
| IP address | ~70% | Network-related entities |

### Null/Empty Values
Many fields allow null/empty values. Handle gracefully in application:
- Display as "-" or "N/A"
- Allow filtering by "Has value" / "Empty"
- Validate required fields on data entry

---

## Migration Considerations

### Moving to Relational Database

When migrating from Excel to SQL database:

1. **Normalize Data**
   - Extract companies as separate table (already done)
   - Create junction tables for many-to-many relationships
   - Add auto-increment ID fields

2. **Add Constraints**
   - Foreign key constraints on Client fields
   - NOT NULL constraints on required fields
   - UNIQUE constraints where applicable
   - CHECK constraints for status values (0/1)

3. **Data Type Refinement**
   - IP addresses: VARCHAR or specific IP type
   - Passwords: VARCHAR (encrypted)
   - Status fields: BOOLEAN or TINYINT
   - Dates: DATE or DATETIME type

4. **Indexes**
   - Index all foreign keys
   - Index frequently queried fields (Active, Status)
   - Composite indexes for common filter combinations

---

## Security Notes

### Sensitive Data Fields

The following fields contain **highly sensitive** data and require special handling:

#### Credential Fields
- All Password, passwd, pass fields
- Alt Passwd
- VPN Password
- Login, Username fields (when paired with passwords)

#### Security Requirements
1. **Encryption:**
   - Encrypt at rest (AES-256)
   - Encrypt in transit (TLS 1.3)
   - Consider using secrets management system (e.g., Azure Key Vault)

2. **Access Control:**
   - Role-based access (admin vs. technician)
   - Audit all access to sensitive fields
   - Never log passwords in plain text

3. **Display:**
   - Mask passwords in UI (●●●●●●)
   - "Copy to clipboard" functionality instead of showing
   - Require confirmation before revealing

4. **Data Entry:**
   - Password strength requirements
   - Confirmation field for password entry
   - Optional password generator

---

## Change Log

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-12 | Initial documentation based on sample Excel files |

---

## Quick Reference

### All Foreign Key Relationships
```
companies.Abbrv (PRIMARY KEY)
  ├── Core.Client
  ├── Users.Client
  ├── Workstations.Client
  ├── Phone Numbers.Client
  ├── Emails.Client
  ├── External_Info.Client
  ├── Managed_Info.Client
  ├── Admin Emails.Client
  ├── Admin Mitel Logins.Client
  ├── Acronis Backups.Client
  └── Cloudflare_Admins.Client
```

### Tables Sorted by Size (Typical)
1. Core.xlsx (Infrastructure) - Most records
2. Users.xlsx
3. Workstations.xlsx
4. Emails.xlsx
5. External_Info.xlsx
6. Managed_Info.xlsx
7. Phone Numbers.xlsx
8. Admin Emails.xlsx
9. Admin Mitel Logins.xlsx
10. Acronis Backups.xlsx
11. Cloudflare_Admins.xlsx
12. companies.xlsx (Master - fewest records)

### Required Fields Summary
- **All tables:** Client (except companies.xlsx)
- **companies.xlsx:** Company Name, Abbrv, Status
- **Core.xlsx:** Client, Name
- **Users.xlsx:** Client, Name
- **Workstations.xlsx:** Client, Computer Name
- **Phone Numbers.xlsx:** Client, Name, Number
- **Emails.xlsx:** Client, Username, Email, Active

---

For implementation details, see [PROJECT_PLAN.md](./PROJECT_PLAN.md).
