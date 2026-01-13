// Master data types

export interface Company {
  "Company Name": string;
  Abbrv: string;
  Group: string;
  Status: number;
}

// Core infrastructure
export interface CoreInfrastructure {
  Client: string;
  SubName: string;
  Name: string;
  "IP address": string;
  "Machine Name / MAC": string;
  "Service Tag": string;
  Description: string;
  Login: string;
  Password: string;
  "Alt Login": string;
  "Alt Passwd": string;
  Notes: string;
  "Notes 2": string;
  "On Landing Page": number;
  Grouping: string;
  "Asset ID": string;
}

// User accounts
export interface User {
  Client: string;
  SubName: string;
  "Computer Name": string;
  Name: string;
  Login: string;
  Password: string;
  Phone: string;
  Cell: string;
  Notes: string;
  "Notes 2": string;
  "Epicor Number": string;
  Active: number;
  Grouping: string;
}

// Workstations
export interface Workstation {
  Client: string;
  "Computer Name": string;
  "IP Address": string;
  "Service Tag": string;
  Description: string;
  Upstream: string;
  Notes: string;
  "Notes 2": string;
  "On Landing Page": number;
  Active: number;
  Grouping: string;
  "Asset ID": string;
  CPU: string;
  "Win11 Capable": number;
}

// Phone numbers
export interface PhoneNumber {
  Client: string;
  Name: string;
  Number: string;
  Other: string;
}

// Email accounts
export interface Email {
  Client: string;
  Username: string;
  Email: string;
  Name: string;
  Password: string;
  Notes: string;
  "MFA or Ignore": number;
  Active: number;
  OWA_override: string;
  IMAP_override: string;
  POP_override: string;
  SMTP_override: string;
}

// External connections
export interface ExternalInfo {
  Client: string;
  SubName: string;
  "Connection Type": string;
  "Device Type": string;
  "IP address": string;
  Port: number;
  Username: string;
  Password: string;
  Notes: string;
  "VPN Port": number;
  "VPN Username": string;
  "VPN Password": string;
  "VPN Domain": string;
  DHCP: number;
  "On Landing Page": number;
  "Notes 2": string;
  "Current Version": string;
  "Last Reached Out To For Frimware Upgrade": string;
  Order: number;
  Grouping: string;
  "Asset ID": string;
}

// Managed WAN info
export interface ManagedInfo {
  Client: string;
  Provider: string;
  "IP 1": string;
  "IP 2": string;
  Managed: number;
  "Phone 1": string;
  "Phone 2": string;
  "Phone 3": string;
  "Phone 4": string;
  "Account #": string;
  Type: string;
  "Note 1": string;
  "Note 2": string;
  Active: number;
}

// Admin credentials
export interface AdminEmail {
  Client: string;
  Name: string;
  Email: string;
  Password: string;
  Notes: string;
  Automate: number;
}

export interface AdminMitelLogin {
  Client: string;
  Login: string;
  Password: string;
}

export interface AcronisBackup {
  "Acronis Cyber Cloud ": string; // Note: field has trailing space in Excel
  Client: string;
  UserName: string;
  PW: string;
  "Encrypt PW": string;
  "Encrypt PW2": string;
  "Encrypt PW3": string;
  "Encrypt PW4": string;
  "Encrypt PW 5": string;
  "Encrypt PW 6": string;
  "Encrypt PW 7": string;
}

export interface CloudflareAdmin {
  Client: string;
  username: string;
  pass: string;
}

export interface GuacamoleHost {
  Client: string;
  "Cloud Name": string;
  IP?: string;
  "Hard Coded IP"?: string;
  "Admin username"?: string;
  Password?: string;
  Notes?: string;
}

// Combined data types for views
export interface WorkstationUserFusion extends Workstation {
  UserName?: string;
  UserLogin?: string;
  UserPhone?: string;
  UserCell?: string;
}

// API response types
export interface DataResponse<T> {
  data: T[];
  error?: string;
}

// Filter types
export interface DataFilters {
  client?: string;
  active?: boolean;
  search?: string;
  grouping?: string;
  subName?: string;
}

// Excel file configuration
export interface ExcelFileConfig {
  fileName: string;
  sheetName: string;
  path?: string;
}

export const EXCEL_FILES: Record<string, ExcelFileConfig> = {
  companies: {
    fileName: "companies.xlsx",
    sheetName: "Companies",
    path: process.env.COMPANIES_FILE_PATH,
  },
  core: {
    fileName: "Core.xlsx",
    sheetName: "Infrastructure",
  },
  users: {
    fileName: "Users.xlsx",
    sheetName: "Users",
  },
  workstations: {
    fileName: "Workstations.xlsx",
    sheetName: "Workstations",
  },
  phoneNumbers: {
    fileName: "Phone Numbers.xlsx",
    sheetName: "Sheet1",
  },
  emails: {
    fileName: "Emails.xlsx",
    sheetName: "Email Addresses",
  },
  externalInfo: {
    fileName: "External_Info.xlsx",
    sheetName: "External Info",
  },
  managedInfo: {
    fileName: "Managed_Info.xlsx",
    sheetName: "Sheet1",
  },
  adminEmails: {
    fileName: "Admin Emails.xlsx",
    sheetName: "Admin Emails",
  },
  adminMitelLogins: {
    fileName: "Admin Mitel Logins.xlsx",
    sheetName: "Mitel Admins",
  },
  acronisBackups: {
    fileName: "Acronis Backups.xlsx",
    sheetName: "Sheet1",
  },
  cloudflareAdmins: {
    fileName: "Cloudflare_Admins.xlsx",
    sheetName: "CF Admins",
  },
  guacamoleHosts: {
    fileName: "GuacamoleHosts.xlsx",
    sheetName: "Sheet1",
  },
};
