"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FullPageModal } from "@/components/FullPageModal";
import { DataTable, SortConfig } from "@/components/DataTable";
import { HostGroupedView } from "@/components/HostGroupedView";
import { TitleEater, V1Celebration } from "@/components/EasterEggs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { useTheme } from "@/hooks/useTheme";
import { PREFERENCE_KEYS, Theme } from "@/types/preferences";

const CLIENT_STORAGE_KEY = "selectedClient";
const SORT_PREFS_STORAGE_KEY = "sortPreferences";

// Default sorts for each table (user's preference overrides these)
const DEFAULT_SORTS: Record<string, SortConfig> = {
  coreInfra: { key: 'IP address', direction: 'asc' },
  workstationsUsers: { key: 'ipAddress', direction: 'asc' },
  externalInfo: { key: 'IntIP', direction: 'asc' },
  devices: { key: 'IP address', direction: 'asc' },
  emails: { key: 'Email', direction: 'asc' },
  servicesModal: { key: 'Service', direction: 'asc' },
  usersModal: { key: 'Login', direction: 'asc' },
  domainAD: { key: 'IP address', direction: 'asc' },
  workstations: { key: 'IP Address', direction: 'asc' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState<Array<{value: string, label: string, group?: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [externalInfo, setExternalInfo] = useState<any[]>([]);
  const [coreInfra, setCoreInfra] = useState<any[]>([]);
  const [workstationsUsers, setWorkstationsUsers] = useState<any[]>([]);
  const [managedInfo, setManagedInfo] = useState<any[]>([]);
  const [adminCredentials, setAdminCredentials] = useState<any>({
    adminEmails: [],
    mitelLogins: [],
    acronisBackups: [],
    cloudflareAdmins: []
  });
  const [loadingData, setLoadingData] = useState(false);
  const [guacamoleHosts, setGuacamoleHosts] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [vms, setVms] = useState<any[]>([]);
  const [daemons, setDaemons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [miscData, setMiscData] = useState<any[]>([]);
  const [reportsTab, setReportsTab] = useState<'inactive' | 'missingData' | 'mfaStatus' | 'firmware' | 'resources' | 'passwordAge' | 'win11'>('inactive');

  // Add record modal state
  const [addModalType, setAddModalType] = useState<string | null>(null);

  // Sort preferences state (user's saved sort preferences per table)
  const [sortPreferences, setSortPreferences] = useState<Record<string, SortConfig>>({});

  // Get sort config for a table (user preference > default)
  const getSortConfig = useCallback((tableId: string): SortConfig | undefined => {
    return sortPreferences[tableId] || DEFAULT_SORTS[tableId];
  }, [sortPreferences]);

  // Handle sort change - save to localStorage and server
  const handleSortChange = useCallback(async (tableId: string, sortConfig: SortConfig | null) => {
    const newPrefs = { ...sortPreferences };
    if (sortConfig) {
      newPrefs[tableId] = sortConfig;
    } else {
      delete newPrefs[tableId];
    }
    setSortPreferences(newPrefs);

    // Save to localStorage
    localStorage.setItem(SORT_PREFS_STORAGE_KEY, JSON.stringify(newPrefs));

    // Save to server if authenticated
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: SORT_PREFS_STORAGE_KEY,
            value: JSON.stringify(newPrefs),
          }),
        });
      } catch (error) {
        console.debug("Failed to save sort preferences to server:", error);
      }
    }
  }, [sortPreferences]);

  // Helper function to sort by IP address (handles IP comparison properly)
  const sortByIP = useCallback((data: any[], ipField: string) => {
    return [...data].sort((a, b) => {
      const ipA = a[ipField] || '';
      const ipB = b[ipField] || '';
      // Convert IP to numeric for proper sorting (e.g., 192.168.1.10 vs 192.168.1.2)
      const ipToNum = (ip: string) => {
        const parts = ip.split('.');
        if (parts.length !== 4) return 0;
        return parts.reduce((acc, part) => acc * 256 + parseInt(part, 10) || 0, 0);
      };
      return ipToNum(ipA) - ipToNum(ipB);
    });
  }, []);

  // Sorted data for dashboard panels
  const sortedCoreInfra = useMemo(() => sortByIP(coreInfra, 'IP address'), [coreInfra, sortByIP]);
  const sortedWorkstationsUsers = useMemo(() => sortByIP(workstationsUsers, 'ipAddress'), [workstationsUsers, sortByIP]);
  const sortedExternalInfo = useMemo(() => sortByIP(externalInfo, 'IntIP'), [externalInfo, sortByIP]);

  // Extract data fetching into reusable function - must be defined before handlers that use it
  const fetchClientData = useCallback(() => {
    if (!selectedClient) return;

    setLoadingData(true);

    // Add cache-busting timestamp to prevent stale data after edits
    const cacheBuster = `&_t=${Date.now()}`;

    // Fetch all data in parallel (no-store prevents caching)
    Promise.all([
      fetch(`/api/data/external-info?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/core?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/workstations-users?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/managed-info?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/admin-credentials?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/guacamole?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/devices?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/containers?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/vms?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/daemons?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/services?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/domains?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/cameras?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/emails?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/users?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/workstations?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/misc/${selectedClient}?${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/phone-numbers?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json())
    ])
      .then(([externalData, coreData, wsUsersData, managedData, adminData, guacData, devicesData, containersData, vmsData, daemonsData, servicesData, domainsData, camerasData, emailsData, usersData, workstationsData, miscResult, phoneData]) => {
        setExternalInfo(externalData.data || []);
        setCoreInfra(coreData.data || []);
        setWorkstationsUsers(wsUsersData.data || []);
        setManagedInfo(managedData.data || []);
        setAdminCredentials({
          adminEmails: adminData.adminEmails || [],
          mitelLogins: adminData.mitelLogins || [],
          acronisBackups: adminData.acronisBackups || [],
          cloudflareAdmins: adminData.cloudflareAdmins || []
        });
        setGuacamoleHosts(guacData.data || []);
        setDevices(devicesData.data || []);
        setContainers(containersData.data || []);
        setVms(vmsData.data || []);
        setDaemons(daemonsData.data || []);
        setServices(servicesData.data || []);
        setDomains(domainsData.data || []);
        setCameras(camerasData.data || []);
        setEmails(emailsData.data || []);
        setUsers(usersData.data || []);
        setWorkstations(workstationsData.data || []);
        setMiscData(miscResult.data || []);
        setPhoneNumbers(phoneData.data || []);
        setLoadingData(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setExternalInfo([]);
        setCoreInfra([]);
        setWorkstationsUsers([]);
        setManagedInfo([]);
        setAdminCredentials({
          adminEmails: [],
          mitelLogins: [],
          acronisBackups: [],
          cloudflareAdmins: []
        });
        setGuacamoleHosts([]);
        setDevices([]);
        setContainers([]);
        setVms([]);
        setDaemons([]);
        setServices([]);
        setDomains([]);
        setCameras([]);
        setEmails([]);
        setUsers([]);
        setWorkstations([]);
        setMiscData([]);
        setPhoneNumbers([]);
        setLoadingData(false);
      });
  }, [selectedClient]);

  // Handle inline cell edit - save to Excel via API
  const handleCellEdit = useCallback(async (
    fileKey: string,
    row: any,
    columnKey: string,
    newValue: any,
    identifierKeys: string[]
  ): Promise<boolean> => {
    const rowIdentifier: Record<string, any> = {};
    for (const key of identifierKeys) {
      if (row[key] !== undefined) {
        rowIdentifier[key] = row[key];
      }
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle workstationsUsers cell edit - routes to correct Excel file based on field
  const handleWorkstationsUsersEdit = useCallback(async (
    row: any,
    columnKey: string,
    newValue: any
  ): Promise<boolean> => {
    const workstationFields: Record<string, string> = {
      'computerName': 'Computer Name',
      'ipAddress': 'IP Address',
      'cpu': 'CPU',
      'serviceTag': 'Service Tag',
      'description': 'Description',
      'win11Capable': 'Win11 Capable',
    };

    const userFields: Record<string, string> = {
      'username': 'Login',
      'fullName': 'Name',
      'phone': 'Phone',
      'location': 'SubName',
    };

    let fileKey: string;
    let excelColumnKey: string;
    let rowIdentifier: Record<string, any>;

    if (workstationFields[columnKey]) {
      fileKey = 'workstations';
      excelColumnKey = workstationFields[columnKey];
      rowIdentifier = {
        'Client': row._wsClient,
        'Computer Name': row._wsComputerName,
      };
    } else if (userFields[columnKey]) {
      fileKey = 'users';
      excelColumnKey = userFields[columnKey];
      rowIdentifier = {
        'Client': row._userClient,
        'Login': row._userLogin,
      };

      if (!row._userLogin) {
        alert('Cannot edit user fields - no user is assigned to this workstation.');
        return false;
      }
    } else {
      console.warn(`Unknown column key for workstationsUsers: ${columnKey}`);
      return false;
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey: excelColumnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle externalInfo cell edit - routes IntIP to Core file
  const handleExternalInfoEdit = useCallback(async (
    row: any,
    columnKey: string,
    newValue: any
  ): Promise<boolean> => {
    let fileKey: string;
    let excelColumnKey: string;
    let rowIdentifier: Record<string, any>;

    if (columnKey === 'IntIP') {
      if (!row._coreName) {
        alert('Cannot edit Internal IP - no matching core infrastructure item found.');
        return false;
      }
      fileKey = 'core';
      excelColumnKey = 'IP address';
      rowIdentifier = {
        'Client': row._coreClient,
        'Name': row._coreName,
      };
    } else {
      fileKey = 'externalInfo';
      excelColumnKey = columnKey;
      rowIdentifier = {
        'Client': row.Client,
        'SubName': row.SubName,
        'Device Type': row['Device Type'],
      };
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey: excelColumnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle adding a new record
  const handleAddRecord = useCallback(async (
    fileKey: string,
    rowData: Record<string, any>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addRow',
          fileKey,
          rowData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        throw new Error(result.error || 'Failed to add record');
      }
    } catch (error: any) {
      console.error('Failed to add record:', error);
      throw error;
    }
  }, [fetchClientData]);

  // Handle marking a record as inactive (archive)
  const handleInactivate = useCallback(async (
    fileKey: string,
    row: any,
    identifierKeys: string[]
  ): Promise<boolean> => {
    const rowIdentifier: Record<string, any> = {};
    for (const key of identifierKeys) {
      if (row[key] !== undefined) {
        rowIdentifier[key] = row[key];
      }
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setInactive',
          fileKey,
          rowIdentifier,
          inactive: 1,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to archive: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to archive record:', error);
      alert('Failed to archive. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Save selected client to localStorage and server
  const saveClientPreference = useCallback(async (client: string) => {
    // Always save to localStorage for immediate access
    localStorage.setItem(CLIENT_STORAGE_KEY, client);

    // Save to server if authenticated
    const token = localStorage.getItem("token");
    if (token && client) {
      try {
        await fetch("/api/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: PREFERENCE_KEYS.SELECTED_CLIENT,
            value: client,
          }),
        });
      } catch (error) {
        console.debug("Failed to save client preference to server:", error);
      }
    }
  }, []);

  // Handle client selection change
  const handleClientChange = useCallback((client: string) => {
    setSelectedClient(client);
    if (client) {
      saveClientPreference(client);
    }
  }, [saveClientPreference]);

  useEffect(() => {
    // Check authentication via API (supports runtime DISABLE_AUTH)
    const checkAuthAndLoadClients = async () => {
      try {
        // Check if auth is disabled via server config
        const configRes = await fetch("/api/config");
        const config = await configRes.json();

        if (config.authDisabled) {
          // Auth disabled - use guest user
          setUser({ username: "guest", role: "admin" });
        } else {
          // Check session via /api/auth/me
          const meRes = await fetch("/api/auth/me");
          if (!meRes.ok) {
            router.push("/login");
            return;
          }
          const meData = await meRes.json();
          setUser(meData.user);
        }

        // Load clients
        const clientsRes = await fetch("/api/data/clients");
        const clientsData = await clientsRes.json();
        const clientList = clientsData.clients || [];
        setClients(clientList);
        setLoading(false);

        // Priority: 1. Server preference, 2. localStorage, 3. env default
        let savedClient = "";

        // Try to load from server first (skip if auth disabled)
        if (!config.authDisabled) {
          try {
            const prefRes = await fetch(`/api/preferences/${PREFERENCE_KEYS.SELECTED_CLIENT}`);
            if (prefRes.ok) {
              const prefData = await prefRes.json();
              if (prefData.data?.value) {
                savedClient = prefData.data.value;
              }
            }
          } catch (error) {
            console.debug("Failed to load client preference from server:", error);
          }
        }

        // Fall back to localStorage if no server preference
        if (!savedClient) {
          savedClient = localStorage.getItem(CLIENT_STORAGE_KEY) || "";
        }

        // Fall back to env default if still nothing
        if (!savedClient) {
          savedClient = process.env.NEXT_PUBLIC_DEFAULT_COMPANY || "";
        }

        // Validate that the saved client exists in the list
        if (savedClient && clientList.some((c: { value: string }) => c.value === savedClient)) {
          setSelectedClient(savedClient);
          localStorage.setItem(CLIENT_STORAGE_KEY, savedClient);
        }

        // Load sort preferences
        let sortPrefs: Record<string, SortConfig> = {};

        // Try to load from server first (skip if auth disabled)
        if (!config.authDisabled) {
          try {
            const sortPrefRes = await fetch(`/api/preferences/${SORT_PREFS_STORAGE_KEY}`);
            if (sortPrefRes.ok) {
              const sortPrefData = await sortPrefRes.json();
              if (sortPrefData.data?.value) {
                sortPrefs = JSON.parse(sortPrefData.data.value);
              }
            }
          } catch (error) {
            console.debug("Failed to load sort preferences from server:", error);
          }
        }

        // Fall back to localStorage if no server preference
        if (Object.keys(sortPrefs).length === 0) {
          const localSortPrefs = localStorage.getItem(SORT_PREFS_STORAGE_KEY);
          if (localSortPrefs) {
            try {
              sortPrefs = JSON.parse(localSortPrefs);
            } catch (e) {
              console.debug("Failed to parse local sort preferences:", e);
            }
          }
        }

        setSortPreferences(sortPrefs);
      } catch (err) {
        console.error("Failed to load:", err);
        setLoading(false);
      }
    };

    checkAuthAndLoadClients();
  }, [router]);

  // Fetch data when client is selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientData();
    } else {
      setExternalInfo([]);
      setCoreInfra([]);
      setWorkstationsUsers([]);
      setManagedInfo([]);
      setAdminCredentials({
        adminEmails: [],
        mitelLogins: [],
        acronisBackups: [],
        cloudflareAdmins: []
      });
      setGuacamoleHosts([]);
      setDevices([]);
      setContainers([]);
      setVms([]);
      setDaemons([]);
      setServices([]);
      setDomains([]);
      setCameras([]);
      setEmails([]);
      setUsers([]);
      setWorkstations([]);
      setMiscData([]);
      setPhoneNumbers([]);
    }
  }, [selectedClient, fetchClientData]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user"); // Clear any cached user data
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <V1Celebration />
      {/* Compact Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0 h-16">
        <div className="px-4 h-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-900 dark:text-gray-100 m-0 flex items-center leading-none">
              <TitleEater title="Infrastructure Dashboard" />
            </h1>
            {/* Client Selector in Header */}
            <select
              id="client-select"
              value={selectedClient}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={loading}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[180px]"
            >
              <option value="">
                {loading ? 'Loading clients...' : 'Select a client'}
              </option>
              {(() => {
                // Group clients - only show optgroup for groups with 2+ clients
                const groupCounts: Record<string, number> = {};
                clients.forEach(c => {
                  if (c.group) {
                    groupCounts[c.group] = (groupCounts[c.group] || 0) + 1;
                  }
                });

                const multiGroups = Object.keys(groupCounts).filter(g => groupCounts[g] >= 2).sort();
                const groupedClients = clients.filter(c => c.group && groupCounts[c.group] >= 2);
                const ungroupedClients = clients.filter(c => !c.group || groupCounts[c.group] < 2);

                return (
                  <>
                    {multiGroups.map(group => (
                      <optgroup key={group} label={`── ${group} ──`}>
                        {groupedClients
                          .filter(c => c.group === group)
                          .map(client => (
                            <option key={client.value} value={client.value}>
                              {client.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                    {ungroupedClients.length > 0 && multiGroups.length > 0 && (
                      <optgroup label="────────────">
                        {ungroupedClients.map(client => (
                          <option key={client.value} value={client.value}>
                            {client.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {ungroupedClients.length > 0 && multiGroups.length === 0 && (
                      ungroupedClients.map(client => (
                        <option key={client.value} value={client.value}>
                          {client.label}
                        </option>
                      ))
                    )}
                  </>
                );
              })()}
            </select>
            {/* Domain Display in Header - Clickable to open AD modal */}
            {selectedClient && domains.length > 0 && (
              <div
                onClick={() => setOpenModal('domainAD')}
                className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 rounded-md text-sm cursor-pointer transition-all hover:bg-cyan-100 dark:hover:bg-cyan-900/50 flex flex-col items-center"
              >
                <span className="text-cyan-600 dark:text-cyan-400 font-medium text-xs">Domain:</span>
                <span className="text-cyan-800 dark:text-cyan-200 font-semibold">{domains[0]['Domain Name'] || '-'}</span>
                {domains[0]['Alt Domain'] && (
                  <span className="text-cyan-600 dark:text-cyan-400 text-xs">({domains[0]['Alt Domain']})</span>
                )}
              </div>
            )}
            {/* Refresh Button */}
            <button
              onClick={fetchClientData}
              disabled={!selectedClient || loadingData}
              className={`px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-base leading-none transition-all ${
                selectedClient && !loadingData
                  ? 'bg-white dark:bg-gray-700 cursor-pointer opacity-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
              }`}
              title="Refresh data"
            >
              <span className="text-gray-700 dark:text-gray-300">↻</span>
            </button>

            {/* Client Phone Number */}
            {selectedClient && phoneNumbers.length > 0 && (
              <div className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md text-sm flex flex-col items-center">
                <span className="text-green-600 dark:text-green-400 font-medium text-xs">{phoneNumbers[0].Name || 'Phone'}:</span>
                <a href={`tel:${phoneNumbers[0].Number}`} className="text-green-800 dark:text-green-200 font-semibold hover:underline">{phoneNumbers[0].Number}</a>
              </div>
            )}
            {/* Navigation Buttons */}
            {selectedClient && (
              <div className="flex gap-1 ml-2 border-l border-gray-300 dark:border-gray-600 pl-2">
                {/* Guacamole Button - Opens URL from GuacamoleHosts */}
                {guacamoleHosts.length > 0 && guacamoleHosts[0]?.['Cloud Name'] && (
                  <button
                    onClick={() => window.open(guacamoleHosts[0]['Cloud Name'], '_blank')}
                    className="px-2 py-1 border border-blue-500 rounded-md bg-blue-500 text-white cursor-pointer text-xs font-medium transition-all hover:bg-blue-600"
                    title={`Open ${guacamoleHosts[0]['Cloud Name'] || 'Guacamole'}`}
                  >
                    Guac
                  </button>
                )}
                <button
                  onClick={() => window.open('http://192.168.203.241:6029/attendance', '_blank')}
                  className="px-2 py-1 border border-blue-500 rounded-md bg-blue-500 text-white cursor-pointer text-xs font-medium transition-all hover:bg-blue-600"
                  title="Open Attendance"
                >
                  Attend
                </button>
                <button
                  onClick={() => setOpenModal('misc')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Misc
                </button>
                <button
                  onClick={() => setOpenModal('devices')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Dev
                </button>
                <button
                  onClick={() => setOpenModal('vms')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  VMs
                </button>
                <button
                  onClick={() => setOpenModal('emails')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Email
                </button>
                <button
                  onClick={() => setOpenModal('servicesModal')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Svc
                </button>
                <button
                  onClick={() => setOpenModal('usersModal')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Users
                </button>
                <button
                  onClick={() => setOpenModal('workstationsRaw')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  WS
                </button>
                <button
                  onClick={() => setOpenModal('reports')}
                  className="px-2 py-1 border border-purple-500 dark:border-purple-500 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 cursor-pointer text-xs font-medium transition-all hover:bg-purple-100 dark:hover:bg-purple-900/50"
                >
                  Reports
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setOpenModal(openModal === 'userMenu' ? null : 'userMenu')}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <span className="font-medium">{user.username}</span>
              <span className="text-xs">▼</span>
            </button>
            {openModal === 'userMenu' && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpenModal(null)}
                />
                {/* Dropdown menu */}
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-1">
                  {/* Theme options */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
                    Theme
                  </div>
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'light' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>☀️</span> Light {theme === 'light' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>🌙</span> Dark {theme === 'dark' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'system' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>💻</span> System {theme === 'system' && '✓'}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  {/* Logout */}
                  <button
                    onClick={() => {
                      setOpenModal(null);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Full Width, No Scroll */}
      <main className="flex-1 overflow-hidden p-3 flex flex-col">
        {selectedClient ? (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">

            {/* Top Row: Core Infrastructure and Workstations + Users side by side - 70% height */}
            <div className="grid grid-cols-2 gap-3 h-[70%]">

              {/* Core Infrastructure - 50% width, 70% height */}
              <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm flex flex-col overflow-hidden">
                <h3
                  onClick={() => setOpenModal('coreInfra')}
                  className="text-[0.9375rem] font-semibold px-4 py-2.5 m-0 border-b-2 border-blue-500 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 cursor-pointer transition-all text-center hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  Servers/Switches (Core)
                </h3>
                {loadingData ? (
                  <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                ) : sortedCoreInfra.length > 0 ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Name</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP Address</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Machine Name/MAC</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCoreInfra.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Name || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                            <td className="p-1.5 text-[0.6875rem] text-gray-900 dark:text-gray-100">{item['Machine Name / MAC'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 p-4 italic text-sm">No core infrastructure</p>
                )}
              </div>

              {/* Workstations + Users - 50% width, 70% height */}
              <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm flex flex-col overflow-hidden">
                <h3
                  onClick={() => setOpenModal('workstationsUsers')}
                  className="text-[0.9375rem] font-semibold px-4 py-2.5 m-0 border-b-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 cursor-pointer transition-all text-center hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                >
                  Workstations + Users
                </h3>
                {loadingData ? (
                  <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                ) : sortedWorkstationsUsers.length > 0 ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP Address</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Computer Name</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedWorkstationsUsers.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.location || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item.ipAddress || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.computerName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">
                              {item.userCount === 0 ? (
                                <span className="text-gray-400 italic">No user</span>
                              ) : item.userCount === 1 ? (
                                <span>{item.username}</span>
                              ) : (
                                <span className="font-medium">{item.userCount} users</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 p-4 italic text-sm">No workstations</p>
                )}
              </div>
            </div>

            {/* Bottom Section - 30% height */}
            <div className="h-[calc(30%-0.75rem)]">

              {/* External Info, Managed WAN Info, Admin Credentials */}
              <div className="grid grid-cols-3 gap-3 h-full">

                {/* External Info */}
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm flex flex-col overflow-hidden">
                  <h3
                    onClick={() => setOpenModal('externalInfo')}
                    className="text-[0.9375rem] font-semibold px-4 py-2.5 m-0 border-b-2 border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 cursor-pointer transition-all text-center hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    Firewalls/Routers (External)
                  </h3>
                  {loadingData ? (
                    <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                  ) : sortedExternalInfo.length > 0 ? (
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Device Type</th>
                              <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Int IP Address</th>
                              <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Ext IP Address</th>
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Connection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedExternalInfo.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Device Type'] || '-'}</td>
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.IntIP || '-'}</td>
                              <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Connection Type'] || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 p-4 italic text-sm">No external info</p>
                  )}
                </div>

                {/* Managed WAN Info */}
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm flex flex-col overflow-hidden">
                  <h3
                    onClick={() => setOpenModal('managedInfo')}
                    className="text-[0.9375rem] font-semibold px-4 py-2.5 m-0 border-b-2 border-violet-500 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 cursor-pointer transition-all text-center hover:bg-violet-100 dark:hover:bg-violet-900/50"
                  >
                    Managed WAN Info (Special ISP notes)
                  </h3>
                  {loadingData ? (
                    <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                  ) : managedInfo.length > 0 ? (
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Provider</th>
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Type</th>
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP 1</th>
                            <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Account #</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedInfo.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Provider || '-'}</td>
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Type || '-'}</td>
                              <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP 1'] || '-'}</td>
                              <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Account #'] || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500 p-4 italic text-sm">No managed WAN info</p>
                  )}
                </div>

                {/* Admin Credentials Box (1x4 horizontal) */}
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-2 flex flex-col overflow-hidden">
                <h3
                  onClick={() => setOpenModal('adminCredentials')}
                  className="text-sm font-semibold px-3 py-2 m-0 mb-2 text-rose-700 dark:text-rose-300 border-b-2 border-rose-400 bg-rose-50 dark:bg-rose-900/30 cursor-pointer rounded-t transition-all text-center hover:bg-rose-100 dark:hover:bg-rose-900/50"
                >
                  Admin Credentials
                </h3>
                {loadingData ? (
                  <p className="text-gray-500 dark:text-gray-400 p-2 text-xs">Loading...</p>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">

                    {/* Admin Emails */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-1.5 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-semibold m-0 mb-1 text-yellow-800 dark:text-yellow-300">
                        Emails ({adminCredentials.adminEmails.length})
                      </h4>
                      {adminCredentials.adminEmails.length > 0 ? (
                        <div className="flex-1 overflow-y-auto text-[1rem]">
                          {adminCredentials.adminEmails.map((item: any, idx: number) => (
                            <div key={idx} className={`mb-1 pb-1 ${idx < adminCredentials.adminEmails.length - 1 ? 'border-b border-yellow-300 dark:border-yellow-700' : ''}`}>
                              <div className="font-medium text-yellow-800 dark:text-yellow-300 break-all leading-tight">{item.Email || item.Name || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[1rem] text-yellow-700 dark:text-yellow-400 italic m-0">No data</p>
                      )}
                    </div>

                    {/* Mitel Logins */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded p-1.5 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-semibold m-0 mb-1 text-blue-800 dark:text-blue-300">
                        Mitel ({adminCredentials.mitelLogins.length})
                      </h4>
                      {adminCredentials.mitelLogins.length > 0 ? (
                        <div className="flex-1 overflow-y-auto text-[1rem]">
                          {adminCredentials.mitelLogins.map((item: any, idx: number) => (
                            <div key={idx} className={`mb-1 pb-1 ${idx < adminCredentials.mitelLogins.length - 1 ? 'border-b border-blue-300 dark:border-blue-700' : ''}`}>
                              <div className="font-medium text-blue-800 dark:text-blue-300 break-all leading-tight">{item.Login || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[1rem] text-blue-900 dark:text-blue-400 italic m-0">No data</p>
                      )}
                    </div>

                    {/* Acronis Backups */}
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded p-1.5 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-semibold m-0 mb-1 text-green-800 dark:text-green-300">
                        Acronis ({adminCredentials.acronisBackups.length})
                      </h4>
                      {adminCredentials.acronisBackups.length > 0 ? (
                        <div className="flex-1 overflow-y-auto text-[1rem]">
                          {adminCredentials.acronisBackups.map((item: any, idx: number) => (
                            <div key={idx} className={`mb-1 pb-1 ${idx < adminCredentials.acronisBackups.length - 1 ? 'border-b border-green-300 dark:border-green-700' : ''}`}>
                              <div className="font-medium text-green-800 dark:text-green-300 break-all leading-tight">{item.UserName || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[1rem] text-green-700 dark:text-green-400 italic m-0">No data</p>
                      )}
                    </div>

                    {/* Cloudflare Admins */}
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-1.5 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-semibold m-0 mb-1 text-red-800 dark:text-red-300">
                        Cloudflare ({adminCredentials.cloudflareAdmins.length})
                      </h4>
                      {adminCredentials.cloudflareAdmins.length > 0 ? (
                        <div className="flex-1 overflow-y-auto text-[1rem]">
                          {adminCredentials.cloudflareAdmins.map((item: any, idx: number) => (
                            <div key={idx} className={`mb-1 pb-1 ${idx < adminCredentials.cloudflareAdmins.length - 1 ? 'border-b border-red-300 dark:border-red-700' : ''}`}>
                              <div className="font-medium text-red-800 dark:text-red-300 break-all leading-tight">{item.username || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[1rem] text-red-700 dark:text-red-400 italic m-0">No data</p>
                      )}
                    </div>

                  </div>
                )}
                </div>
              </div>
            </div>
            {/* End of bottom section */}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800 rounded-md">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">
                Select a client to view data
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Choose a client from the dropdown above
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Full Page Modals */}
      <FullPageModal
        isOpen={openModal === 'coreInfra'}
        onClose={() => setOpenModal(null)}
        title="Core Infrastructure (Servers/Routers/Switches)"
      >
        <DataTable
          data={coreInfra}
          columns={[
            { key: 'SubName', label: 'Location', sortable: true },
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'IP address', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'Machine Name / MAC', label: 'Machine Name/MAC', sortable: true },
            { key: 'Service Tag', label: 'Service Tag', sortable: true },
            { key: 'Description', label: 'Description', sortable: true },
            { key: 'Login', label: 'Login', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Alt Login', label: 'Alt Login', sortable: true },
            { key: 'Alt Passwd', label: 'Alt Password', type: 'password', sortable: false },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Notes 2', label: 'Notes 2', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Asset ID', label: 'Asset ID', sortable: true },
            { key: 'Cores', label: 'Cores', type: 'number', sortable: true },
            { key: 'Ram (GB)', label: 'RAM (GB)', type: 'number', sortable: true },
            { key: 'On Landing Page', label: 'Landing Page', type: 'checkbox', sortable: true },
            { key: 'RDP?', label: 'RDP', type: 'checkbox', sortable: true },
            { key: 'VNC?', label: 'VNC', type: 'checkbox', sortable: true },
            { key: 'SSH?', label: 'SSH', type: 'checkbox', sortable: true },
            { key: 'Web?', label: 'Web', type: 'checkbox', sortable: true },
            { key: 'AD Server', label: 'AD Server', type: 'checkbox', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="coreInfra"
          defaultSort={getSortConfig('coreInfra')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('core', row, columnKey, newValue, ['Client', 'Name'])}
          onAdd={() => setAddModalType('core')}
          onInactivate={(row) => handleInactivate('core', row, ['Client', 'Name'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'workstationsUsers'}
        onClose={() => setOpenModal(null)}
        title="Workstations + Users"
      >
        <DataTable
          data={workstationsUsers}
          columns={[
            { key: 'computerName', label: 'Computer Name', sortable: true },
            { key: 'location', label: 'Location', sortable: true },
            { key: 'userDisplay', label: 'Users', sortable: true, editable: false },
            { key: 'username', label: 'Primary User', sortable: true, editable: false },
            { key: 'ipAddress', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'serviceTag', label: 'Service Tag', sortable: true },
            { key: 'cpu', label: 'CPU', sortable: true },
            { key: 'description', label: 'Description', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="workstationsUsers"
          defaultSort={getSortConfig('workstationsUsers')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={handleWorkstationsUsersEdit}
          onInactivate={(row) => handleInactivate('workstations', { Client: row._wsClient, 'Computer Name': row._wsComputerName }, ['Client', 'Computer Name'])}
          expandable={true}
          expandedRowRenderer={(row) => (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Users assigned to {row.computerName} ({row.userCount})
              </h4>
              {row.users && row.users.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Login</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Cell</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.users.map((user: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.login}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.phone || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.cell || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.subName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-sm">No users assigned to this workstation</p>
              )}
            </div>
          )}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'externalInfo'}
        onClose={() => setOpenModal(null)}
        title="External Info (Firewalls/VPN)"
      >
        <DataTable
          data={externalInfo}
          columns={[
            { key: 'SubName', label: 'Location', sortable: true },
            { key: 'Connection Type', label: 'Connection Type', sortable: true },
            { key: 'Device Type', label: 'Device Type', sortable: true },
            { key: 'IntIP', label: 'Int IP Address', type: 'ip', sortable: true },
            { key: 'IP address', label: 'Ext IP Address', type: 'ip', sortable: true },
            { key: 'Port', label: 'Port', type: 'number', sortable: true },
            { key: 'Username', label: 'Username', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'VPN Port', label: 'VPN Port', type: 'number', sortable: true },
            { key: 'VPN Username', label: 'VPN Username', sortable: true },
            { key: 'VPN Password', label: 'VPN Password', type: 'password', sortable: false },
            { key: 'VPN Domain', label: 'VPN Domain', sortable: true },
            { key: 'Current Version', label: 'Firmware Version', sortable: true },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Notes 2', label: 'Notes 2', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Asset ID', label: 'Asset ID', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="externalInfo"
          defaultSort={getSortConfig('externalInfo')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={handleExternalInfoEdit}
          onAdd={() => setAddModalType('externalInfo')}
          onInactivate={(row) => handleInactivate('externalInfo', row, ['Client', 'SubName', 'Device Type'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'managedInfo'}
        onClose={() => setOpenModal(null)}
        title="Managed WAN Info (ISP)"
      >
        <DataTable
          data={managedInfo}
          columns={[
            { key: 'Provider', label: 'Provider', sortable: true },
            { key: 'Type', label: 'Connection Type', sortable: true },
            { key: 'IP 1', label: 'Primary IP', type: 'ip', sortable: true },
            { key: 'IP 2', label: 'Secondary IP', type: 'ip', sortable: true },
            { key: 'Account #', label: 'Account Number', sortable: true },
            { key: 'Phone 1', label: 'Support Phone 1', sortable: true },
            { key: 'Phone 2', label: 'Support Phone 2', sortable: true },
            { key: 'Phone 3', label: 'Support Phone 3', sortable: true },
            { key: 'Phone 4', label: 'Support Phone 4', sortable: true },
            { key: 'Note 1', label: 'Notes 1', sortable: true },
            { key: 'Note 2', label: 'Notes 2', sortable: true },
          ]}
          enablePasswordMasking={false}
          enableSearch={true}
          enableExport={true}
          onInactivate={(row) => handleInactivate('managedInfo', row, ['Client', 'Provider'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'adminCredentials'}
        onClose={() => setOpenModal(null)}
        title="Admin Credentials"
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Admin Emails */}
          <div className="flex-1 flex flex-col border-2 border-yellow-300 dark:border-yellow-700 rounded-lg overflow-hidden">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 px-4 py-3 font-semibold text-base text-yellow-800 dark:text-yellow-300">
              Admin Emails ({adminCredentials.adminEmails.length})
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <DataTable
                data={adminCredentials.adminEmails}
                columns={[
                  { key: 'Name', label: 'Name', sortable: true },
                  { key: 'Email', label: 'Email', type: 'email', sortable: true },
                  { key: 'Password', label: 'Password', type: 'password', sortable: false },
                  { key: 'Notes', label: 'Notes', sortable: true },
                ]}
                onAdd={() => setAddModalType('adminEmails')}
                rowsPerPageOptions={[25, 50]}
                onInactivate={(row) => handleInactivate('adminEmails', row, ['Client', 'Email'])}
                editable={true}
                onCellEdit={(row, columnKey, newValue) => handleCellEdit('adminEmails', row, columnKey, newValue, ['Client', 'Email'])}
              />
            </div>
          </div>

          {/* Row with Mitel, Acronis, Cloudflare */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {/* Mitel */}
            <div className="flex flex-col border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
              <div className="bg-blue-100 dark:bg-blue-900/50 px-4 py-3 font-semibold text-sm text-blue-800 dark:text-blue-300">
                Mitel Logins ({adminCredentials.mitelLogins.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.mitelLogins}
                  columns={[
                    { key: 'Login', label: 'Login', sortable: true },
                    { key: 'Password', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('adminMitelLogins')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('adminMitelLogins', row, ['Client', 'Login'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('adminMitelLogins', row, columnKey, newValue, ['Client', 'Login'])}
                />
              </div>
            </div>

            {/* Acronis */}
            <div className="flex flex-col border-2 border-green-300 dark:border-green-700 rounded-lg overflow-hidden">
              <div className="bg-green-100 dark:bg-green-900/50 px-4 py-3 font-semibold text-sm text-green-800 dark:text-green-300">
                Acronis Backups ({adminCredentials.acronisBackups.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.acronisBackups}
                  columns={[
                    { key: 'UserName', label: 'Username', sortable: true },
                    { key: 'PW', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('acronisBackups')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('acronisBackups', row, ['Client', 'UserName'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('acronisBackups', row, columnKey, newValue, ['Client', 'UserName'])}
                />
              </div>
            </div>

            {/* Cloudflare */}
            <div className="flex flex-col border-2 border-red-300 dark:border-red-700 rounded-lg overflow-hidden">
              <div className="bg-red-100 dark:bg-red-900/50 px-4 py-3 font-semibold text-sm text-red-800 dark:text-red-300">
                Cloudflare ({adminCredentials.cloudflareAdmins.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.cloudflareAdmins}
                  columns={[
                    { key: 'username', label: 'Username', sortable: true },
                    { key: 'pass', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('cloudflareAdmins')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('cloudflareAdmins', row, ['Client', 'username'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('cloudflareAdmins', row, columnKey, newValue, ['Client', 'username'])}
                />
              </div>
            </div>
          </div>
        </div>
      </FullPageModal>

      {/* Navigation Button Modals */}
      <FullPageModal
        isOpen={openModal === 'misc'}
        onClose={() => setOpenModal(null)}
        title="Miscellaneous"
      >
        <DataTable
          data={miscData}
          columns={[
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Notes 1', label: 'Notes 1', sortable: true },
            { key: 'Notes 2', label: 'Notes 2', sortable: true },
            { key: 'Notes 3', label: 'Notes 3', sortable: true },
            { key: 'Notes 4', label: 'Notes 4', sortable: true },
            { key: 'Notes 5', label: 'Notes 5', sortable: true },
            { key: 'Notes 6', label: 'Notes 6', sortable: true },
            { key: 'Notes 7', label: 'Notes 7', sortable: true },
            { key: 'Notes 8', label: 'Notes 8', sortable: true },
            { key: 'Notes 9', label: 'Notes 9', sortable: true },
          ]}
          enableSearch={true}
          enableExport={true}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'devices'}
        onClose={() => setOpenModal(null)}
        title="Devices (Printers, Scanners, etc.)"
      >
        <DataTable
          data={devices}
          columns={[
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'IP address', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'Machine Name / MAC', label: 'Machine Name/MAC', sortable: true },
            { key: 'Service Tag', label: 'Service Tag', sortable: true },
            { key: 'Login', label: 'Login', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Note', label: 'Note', sortable: true },
            { key: 'Note 1', label: 'Note 1', sortable: true },
            { key: 'Note 2', label: 'Note 2', sortable: true },
            { key: 'Note 3', label: 'Note 3', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Asset ID', label: 'Asset ID', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="devices"
          defaultSort={getSortConfig('devices')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('devices', row, columnKey, newValue, ['client', 'Name'])}
          onInactivate={(row) => handleInactivate('devices', row, ['client', 'Name'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'vms'}
        onClose={() => setOpenModal(null)}
        title="Virtual Machines, Containers & Daemons"
      >
        <HostGroupedView
          vms={vms}
          containers={containers}
          daemons={daemons}
          coreInfra={coreInfra}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'emails'}
        onClose={() => setOpenModal(null)}
        title="Email Accounts"
      >
        <DataTable
          data={emails}
          columns={[
            { key: 'Username', label: 'Username', sortable: true },
            { key: 'Email', label: 'Email', type: 'email', sortable: true },
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Active', label: 'Active', sortable: true },
            { key: 'MFA or Ignore', label: 'MFA', sortable: true },
            { key: 'OWA_override', label: 'OWA Override', sortable: true },
            { key: 'IMAP_override', label: 'IMAP Override', sortable: true },
            { key: 'POP_override', label: 'POP Override', sortable: true },
            { key: 'SMTP_override', label: 'SMTP Override', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="emails"
          defaultSort={getSortConfig('emails')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('emails', row, columnKey, newValue, ['Client', 'Email'])}
          onInactivate={(row) => handleInactivate('emails', row, ['Client', 'Email'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'servicesModal'}
        onClose={() => setOpenModal(null)}
        title="Services"
      >
        <DataTable
          data={services}
          columns={[
            { key: 'Service', label: 'Service', sortable: true },
            { key: 'Username', label: 'Username', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Host / URL', label: 'Host/URL', sortable: true },
            { key: 'Date of last known change', label: 'Last Changed', sortable: true },
            { key: 'Notes', label: 'Notes', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="servicesModal"
          defaultSort={getSortConfig('servicesModal')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('services', row, columnKey, newValue, ['Client', 'Service'])}
          onInactivate={(row) => handleInactivate('services', row, ['Client', 'Service'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'usersModal'}
        onClose={() => setOpenModal(null)}
        title="Users"
      >
        <DataTable
          data={users}
          columns={[
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'Login', label: 'Login', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Computer Name', label: 'Computer', sortable: true },
            { key: 'SubName', label: 'Location', sortable: true },
            { key: 'Phone', label: 'Phone', sortable: true },
            { key: 'Cell', label: 'Cell', sortable: true },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Notes 2', label: 'Notes 2', sortable: true },
            { key: 'Epicor Number', label: 'Epicor #', sortable: true },
            { key: 'Active', label: 'Active', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="usersModal"
          defaultSort={getSortConfig('usersModal')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('users', row, columnKey, newValue, ['Client', 'Login'])}
          onInactivate={(row) => handleInactivate('users', row, ['Client', 'Login'])}
          expandable={true}
          expandedRowRenderer={(row) => (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Workstations for {row.Name || row.Login} ({row._workstationCount || 0})
              </h4>
              {row._workstations && row._workstations.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Computer Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">IP Address</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Service Tag</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">CPU</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Win11</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row._workstations.map((ws: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{ws.computerName}</td>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-gray-100">{ws.ipAddress}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{ws.serviceTag}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{ws.cpu}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{ws.description}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{ws.win11Capable === 1 ? 'Yes' : ws.win11Capable === 0 ? 'No' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-sm">No workstation found for this user</p>
              )}
            </div>
          )}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'domainAD'}
        onClose={() => setOpenModal(null)}
        title="Domain / Active Directory"
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Domain Info Header */}
          {domains.length > 0 && (
            <div className="bg-cyan-50 dark:bg-cyan-900/30 border-2 border-cyan-300 dark:border-cyan-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium text-sm">Primary Domain:</span>
                  <span className="text-cyan-800 dark:text-cyan-200 ml-2 text-lg font-semibold">{domains[0]['Domain Name'] || '-'}</span>
                </div>
                {domains[0]['Alt Domain'] && (
                  <div>
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium text-sm">Alt Domain:</span>
                    <span className="text-cyan-800 dark:text-cyan-200 ml-2">{domains[0]['Alt Domain']}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AD Servers Table */}
          <div className="flex-1 overflow-hidden">
            <DataTable
              data={coreInfra.filter((item: any) => item['AD Server'] === 1 || item['AD Server'] === '1' || item['AD Server'] === true)}
              columns={[
                { key: 'Name', label: 'Server Name', sortable: true },
                { key: 'SubName', label: 'Location', sortable: true },
                { key: 'IP address', label: 'AD IP Address', type: 'ip', sortable: true },
                { key: 'Login', label: 'Administrator Login', sortable: true },
                { key: 'Password', label: 'Password', type: 'password', sortable: false },
                { key: 'Description', label: 'Description', sortable: true },
                { key: 'Notes', label: 'Notes', sortable: true },
              ]}
              enablePasswordMasking={true}
              enableSearch={true}
              enableExport={true}
              tableId="domainAD"
              defaultSort={getSortConfig('domainAD')}
              onSortChange={handleSortChange}
              onInactivate={(row) => handleInactivate('core', row, ['Client', 'Name'])}
            />
          </div>
        </div>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'workstationsRaw'}
        onClose={() => setOpenModal(null)}
        title="Workstations (Raw Data)"
      >
        <DataTable
          data={workstations}
          columns={[
            { key: 'Computer Name', label: 'Computer Name', sortable: true, editable: false },
            { key: 'IP Address', label: 'IP Address', type: 'ip', sortable: true },
            { key: '_userCount', label: 'Users', sortable: true, editable: false },
            { key: 'Service Tag', label: 'Service Tag', sortable: true },
            { key: 'CPU', label: 'CPU', sortable: true },
            { key: 'Description', label: 'Description', sortable: true },
            { key: 'Upstream', label: 'Upstream', sortable: true },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Notes 2', label: 'Notes 2', sortable: true },
            { key: 'Active', label: 'Active', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Asset ID', label: 'Asset ID', sortable: true },
            { key: 'Win11 Capable', label: 'Win11 Capable', sortable: true },
          ]}
          enablePasswordMasking={false}
          enableSearch={true}
          enableExport={true}
          tableId="workstations"
          defaultSort={getSortConfig('workstations')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) =>
            handleCellEdit('workstations', row, columnKey, newValue, ['Client', 'Computer Name'])
          }
          onInactivate={(row) => handleInactivate('workstations', row, ['Client', 'Computer Name'])}
          expandable={true}
          expandedRowRenderer={(row) => (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Users on {row["Computer Name"]} ({row._userCount || 0})
              </h4>
              {row._users && row._users.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Login</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Cell</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row._users.map((user: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.login}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.phone}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.cell}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.subName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-sm">No users assigned to this workstation</p>
              )}
            </div>
          )}
        />
      </FullPageModal>

      {/* Reports Modal */}
      <FullPageModal
        isOpen={openModal === 'reports'}
        onClose={() => setOpenModal(null)}
        title="Reports"
      >
        <div className="flex flex-col h-full">
          {/* Report Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-3">
            {[
              { id: 'inactive', label: 'Inactive Assets', icon: '🔴' },
              { id: 'missingData', label: 'Missing Data', icon: '⚠️' },
              { id: 'mfaStatus', label: 'MFA Status', icon: '🔐' },
              { id: 'firmware', label: 'Firmware Versions', icon: '📦' },
              { id: 'resources', label: 'Host Resources', icon: '💾' },
              { id: 'passwordAge', label: 'Password Age', icon: '🔑' },
              { id: 'win11', label: 'Windows 11 Ready', icon: '💻' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportsTab(tab.id as typeof reportsTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  reportsTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Report Content */}
          <div className="flex-1 overflow-auto">
            {/* Inactive Assets Report */}
            {reportsTab === 'inactive' && (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Inactive Assets Summary</h3>
                  <p className="text-sm text-red-600 dark:text-red-400">Items marked as inactive across the infrastructure.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive VMs ({vms.filter(v => v.Active === 0 || v.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {vms.filter(v => v.Active === 0 || v.Active === '0').map((vm, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{vm.Name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({vm.Host})</span>
                        </div>
                      ))}
                      {vms.filter(v => v.Active === 0 || v.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Users ({users.filter(u => u.Active === 0 || u.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {users.filter(u => u.Active === 0 || u.Active === '0').map((user, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{user.Name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({user.Login})</span>
                        </div>
                      ))}
                      {users.filter(u => u.Active === 0 || u.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Emails ({emails.filter(e => e.Active === 0 || e.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {emails.filter(e => e.Active === 0 || e.Active === '0').map((email, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{email.Email}</span>
                        </div>
                      ))}
                      {emails.filter(e => e.Active === 0 || e.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Daemons ({daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').map((daemon, i) => (
                      <div key={i} className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-900 dark:text-gray-100">{daemon.Name}</span>
                      </div>
                    ))}
                    {daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').length === 0 && (
                      <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Missing Data Report */}
            {reportsTab === 'missingData' && (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Missing Data Report</h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Items missing critical information that should be filled in.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Servers Missing IP ({coreInfra.filter(c => !c['IP address']).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {coreInfra.filter(c => !c['IP address']).map((item, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {item.Name || 'Unnamed'}
                        </div>
                      ))}
                      {coreInfra.filter(c => !c['IP address']).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All servers have IP addresses</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Servers Missing Passwords ({coreInfra.filter(c => !c.Password).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {coreInfra.filter(c => !c.Password).map((item, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {item.Name || 'Unnamed'} <span className="text-gray-400">({item['IP address'] || 'No IP'})</span>
                        </div>
                      ))}
                      {coreInfra.filter(c => !c.Password).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All servers have passwords</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">VMs Missing IP ({vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).map((vm, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {vm.Name} <span className="text-gray-400">({vm.Host})</span>
                        </div>
                      ))}
                      {vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All active VMs have IP addresses</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Services Missing Passwords ({services.filter(s => !s.Password).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {services.filter(s => !s.Password).map((svc, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {svc.Service}
                        </div>
                      ))}
                      {services.filter(s => !s.Password).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All services have passwords</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MFA Status Report */}
            {reportsTab === 'mfaStatus' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">MFA Status Report</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Email accounts grouped by MFA enrollment status.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                      ✓ MFA Enabled ({emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).length})
                    </h4>
                    <div className="max-h-64 overflow-auto text-sm">
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).map((email, i) => (
                        <div key={i} className="py-1 border-b border-green-100 dark:border-green-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {email.Email}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      ✗ MFA Not Enabled ({emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).length})
                    </h4>
                    <div className="max-h-64 overflow-auto text-sm">
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).map((email, i) => (
                        <div key={i} className="py-1 border-b border-red-100 dark:border-red-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {email.Email}
                        </div>
                      ))}
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All active accounts have MFA</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {emails.length > 0 ? Math.round((emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).length / emails.filter(e => e.Active === 1 || e.Active === '1' || e.Active === undefined).length) * 100) : 0}%
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">of active email accounts have MFA enabled</div>
                  </div>
                </div>
              </div>
            )}

            {/* Firmware Versions Report */}
            {reportsTab === 'firmware' && (
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Firmware Versions Report</h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">Firewall and router firmware versions for update planning.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Location</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Device Type</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">IP Address</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Firmware Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalInfo.filter(e => e['Current Version']).map((item, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item['Device Type'] || '-'}</td>
                          <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
                              {item['Current Version']}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {externalInfo.filter(e => e['Current Version']).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                            No firmware version data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Devices Without Version Info ({externalInfo.filter(e => !e['Current Version']).length})</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {externalInfo.filter(e => !e['Current Version']).map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                        {item['Device Type']} @ {item.SubName}
                      </span>
                    ))}
                    {externalInfo.filter(e => !e['Current Version']).length === 0 && (
                      <p className="text-green-600 dark:text-green-400">✓ All devices have firmware versions recorded</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Host Resources Report */}
            {reportsTab === 'resources' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Host Resource Allocation</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">CPU and RAM allocation across hypervisor hosts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    // Group VMs by host and calculate resources
                    const hostResources: Record<string, { vms: number; cores: number; ram: number; hostCores?: number; hostRam?: number }> = {};
                    vms.filter(v => v.Active === 1 || v.Active === '1' || v.Active === undefined).forEach(vm => {
                      const host = vm.Host || 'Unknown';
                      if (!hostResources[host]) {
                        const hostInfo = coreInfra.find(c => c.Name === host);
                        hostResources[host] = {
                          vms: 0,
                          cores: 0,
                          ram: 0,
                          hostCores: hostInfo?.Cores,
                          hostRam: hostInfo?.['Ram (GB)']
                        };
                      }
                      hostResources[host].vms++;
                      hostResources[host].cores += parseInt(String(vm['Assigned cores'] || 0), 10);
                      hostResources[host].ram += vm['Startup memory (GB)'] || 0;
                    });
                    return Object.entries(hostResources).map(([host, data]) => (
                      <div key={host} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">{host}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">VMs:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{data.vms}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Allocated Cores:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {data.cores}{data.hostCores ? ` / ${data.hostCores}` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Allocated RAM:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {data.ram} GB{data.hostRam ? ` / ${data.hostRam} GB` : ''}
                            </span>
                          </div>
                          {data.hostCores && (
                            <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${data.cores / data.hostCores > 0.9 ? 'bg-red-500' : data.cores / data.hostCores > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (data.cores / data.hostCores) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                  {vms.length === 0 && (
                    <p className="text-gray-400 dark:text-gray-500 italic col-span-full text-center py-8">No VM data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Password Age Report */}
            {reportsTab === 'passwordAge' && (
              <div className="space-y-6">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">Password Age Report</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Services with tracked password change dates.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Service</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Username</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Last Changed</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter(s => s['Date of last known change']).map((svc, i) => {
                        const lastChanged = new Date(svc['Date of last known change']);
                        const today = new Date();
                        const diffDays = Math.floor((today.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{svc.Service}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{svc.Username || '-'}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                              {lastChanged.toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                diffDays > 365 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                                diffDays > 180 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                                'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              }`}>
                                {diffDays} days
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {services.filter(s => s['Date of last known change']).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                            No password change dates recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Windows 11 Ready Report */}
            {reportsTab === 'win11' && (
              <div className="space-y-6">
                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-cyan-800 dark:text-cyan-300 mb-2">Windows 11 Readiness Report</h3>
                  <p className="text-sm text-cyan-600 dark:text-cyan-400">Workstations and VMs grouped by Windows 11 compatibility.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                      ✓ Windows 11 Capable ({workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').length} workstations)
                    </h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').map((ws, i) => (
                        <div key={i} className="py-1 border-b border-green-100 dark:border-green-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {ws.computerName} <span className="text-gray-400">({ws.cpu || 'Unknown CPU'})</span>
                        </div>
                      ))}
                      {workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">No data</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      ✗ Not Windows 11 Capable ({workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').length} workstations)
                    </h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').map((ws, i) => (
                        <div key={i} className="py-1 border-b border-red-100 dark:border-red-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {ws.computerName} <span className="text-gray-400">({ws.cpu || 'Unknown CPU'})</span>
                        </div>
                      ))}
                      {workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All workstations are Win11 capable</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">
                    VMs with Windows 11 Issues ({vms.filter(v => v['Windows 11 Issue?']).length})
                  </h4>
                  <div className="max-h-32 overflow-auto text-sm">
                    {vms.filter(v => v['Windows 11 Issue?']).map((vm, i) => (
                      <div key={i} className="py-1 border-b border-amber-100 dark:border-amber-800 last:border-0">
                        <span className="text-gray-900 dark:text-gray-100">{vm.Name}</span>
                        <span className="text-amber-600 dark:text-amber-400 text-xs ml-2">Issue: {vm['Windows 11 Issue?']}</span>
                      </div>
                    ))}
                    {vms.filter(v => v['Windows 11 Issue?']).length === 0 && (
                      <p className="text-green-600 dark:text-green-400">✓ No Windows 11 issues flagged for VMs</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </FullPageModal>

      {/* Add Record Modals */}
      <AddRecordModal
        isOpen={addModalType === 'externalInfo'}
        onClose={() => setAddModalType(null)}
        title="Add Firewall/Router"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'SubName', label: 'Location', required: true },
          { key: 'Device Type', label: 'Device Type', required: true },
          { key: 'Connection Type', label: 'Connection Type' },
          { key: 'IP address', label: 'External IP', type: 'ip' },
          { key: 'Port', label: 'Port', type: 'number' },
          { key: 'Username', label: 'Username' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'VPN Port', label: 'VPN Port', type: 'number' },
          { key: 'VPN Username', label: 'VPN Username' },
          { key: 'VPN Password', label: 'VPN Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
        ]}
        onSave={(data) => handleAddRecord('externalInfo', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'core'}
        onClose={() => setAddModalType(null)}
        title="Add Server/Switch"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'SubName', label: 'Location' },
          { key: 'IP address', label: 'IP Address', type: 'ip' },
          { key: 'Machine Name / MAC', label: 'Machine Name/MAC' },
          { key: 'Service Tag', label: 'Service Tag' },
          { key: 'Description', label: 'Description' },
          { key: 'Login', label: 'Login' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
          { key: 'Cores', label: 'Cores', type: 'number' },
          { key: 'Ram (GB)', label: 'RAM (GB)', type: 'number' },
          { key: 'On Landing Page', label: 'Landing Page', type: 'checkbox' },
          { key: 'RDP?', label: 'RDP', type: 'checkbox' },
          { key: 'VNC?', label: 'VNC', type: 'checkbox' },
          { key: 'SSH?', label: 'SSH', type: 'checkbox' },
          { key: 'Web?', label: 'Web', type: 'checkbox' },
          { key: 'AD Server', label: 'AD Server', type: 'checkbox' },
        ]}
        onSave={(data) => handleAddRecord('core', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'adminEmails'}
        onClose={() => setAddModalType(null)}
        title="Add Admin Email"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'Email', label: 'Email', type: 'email', required: true },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
        ]}
        onSave={(data) => handleAddRecord('adminEmails', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'adminMitelLogins'}
        onClose={() => setAddModalType(null)}
        title="Add Mitel Login"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Login', label: 'Login', required: true },
          { key: 'Password', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('adminMitelLogins', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'acronisBackups'}
        onClose={() => setAddModalType(null)}
        title="Add Acronis Backup"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'UserName', label: 'Username', required: true },
          { key: 'PW', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('acronisBackups', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'cloudflareAdmins'}
        onClose={() => setAddModalType(null)}
        title="Add Cloudflare Admin"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'username', label: 'Username', required: true },
          { key: 'pass', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('cloudflareAdmins', data)}
      />
    </div>
  );
}
