"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FullPageModal } from "@/components/FullPageModal";
import { DataTable } from "@/components/DataTable";
import { HostGroupedView } from "@/components/HostGroupedView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PREFERENCE_KEYS } from "@/types/preferences";

const CLIENT_STORAGE_KEY = "selectedClient";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState<Array<{value: string, label: string}>>([]);
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

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [miscTab, setMiscTab] = useState<'services' | 'domains' | 'cameras' | 'documents'>('services');

  // Extract data fetching into reusable function
  const fetchClientData = () => {
    if (!selectedClient) return;

    setLoadingData(true);

    // Fetch all data in parallel
    Promise.all([
      fetch(`/api/data/external-info?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/core?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/workstations-users?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/managed-info?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/admin-credentials?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/guacamole?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/devices?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/containers?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/vms?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/daemons?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/services?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/domains?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/cameras?client=${selectedClient}`).then(res => res.json())
    ])
      .then(([externalData, coreData, wsUsersData, managedData, adminData, guacData, devicesData, containersData, vmsData, daemonsData, servicesData, domainsData, camerasData]) => {
        console.log("Admin credentials response:", adminData); // Debug log
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
        setLoadingData(false);
      });
  };

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
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));

    // Load clients and restore saved selection
    fetch("/api/data/clients")
      .then(res => res.json())
      .then(async (data) => {
        const clientList = data.clients || [];
        setClients(clientList);
        setLoading(false);

        // Priority: 1. Server preference, 2. localStorage, 3. env default
        let savedClient = "";

        // Try to load from server first
        try {
          const response = await fetch(`/api/preferences/${PREFERENCE_KEYS.SELECTED_CLIENT}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const prefData = await response.json();
            if (prefData.data?.value) {
              savedClient = prefData.data.value;
            }
          }
        } catch (error) {
          console.debug("Failed to load client preference from server:", error);
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
        if (savedClient && clientList.some((c: any) => c.value === savedClient)) {
          setSelectedClient(savedClient);
          // Sync localStorage if we got value from server
          localStorage.setItem(CLIENT_STORAGE_KEY, savedClient);
        }
      })
      .catch(err => {
        console.error("Failed to load clients:", err);
        setLoading(false);
      });
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
      setDevices([]);
      setContainers([]);
      setVms([]);
      setServices([]);
      setDomains([]);
      setCameras([]);
    }
  }, [selectedClient]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
      {/* Compact Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
        <div className="px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0">
              Infrastructure Dashboard
            </h1>
            {/* Client Selector in Header */}
            <select
              id="client-select"
              value={selectedClient}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={loading}
              className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[250px]"
            >
              <option value="">
                {loading ? 'Loading clients...' : 'Select a client'}
              </option>
              {clients.map((client) => (
                <option key={client.value} value={client.value}>
                  {client.label}
                </option>
              ))}
            </select>
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

            {/* Navigation Buttons */}
            {selectedClient && (
              <div className="flex gap-2 ml-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                {/* Guacamole Button - Opens URL from GuacamoleHosts */}
                {guacamoleHosts.length > 0 && guacamoleHosts[0]?.['Cloud Name'] && (
                  <button
                    onClick={() => window.open(guacamoleHosts[0]['Cloud Name'], '_blank')}
                    className="px-3 py-1.5 border border-blue-500 rounded-md bg-blue-500 text-white cursor-pointer text-sm font-medium transition-all hover:bg-blue-600"
                    title={`Open ${guacamoleHosts[0]['Cloud Name'] || 'Guacamole'}`}
                  >
                    Guacamole
                  </button>
                )}
                <button
                  onClick={() => setOpenModal('misc')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Misc
                </button>
                <button
                  onClick={() => setOpenModal('devices')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Devices
                </button>
                <button
                  onClick={() => setOpenModal('vms')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  VMs/Containers
                </button>
                <button
                  onClick={() => setOpenModal('billing')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Billing
                </button>
                <button
                  onClick={() => setOpenModal('sonicwall')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Sonicwall
                </button>
                <button
                  onClick={() => setOpenModal('slgEmail')}
                  className="px-3 py-1.5 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  SLG Email Issues
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              Logout
            </button>
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
                  Core Infrastructure (Servers/Routers/Switches)
                </h3>
                {loadingData ? (
                  <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                ) : coreInfra.length > 0 ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Name</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP Address</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Machine Name/MAC</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Description</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coreInfra.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Name || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                            <td className="p-1.5 text-[0.6875rem] text-gray-900 dark:text-gray-100">{item['Machine Name / MAC'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Description || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Login || '-'}</td>
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
                ) : workstationsUsers.length > 0 ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Computer</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Username</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Full Name</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Email</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">OS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workstationsUsers.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.computerName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.location || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.username || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.fullName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.email || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.os || '-'}</td>
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

            {/* Bottom Row: External Info, Managed WAN, and Admin Credentials - 30% height */}
            <div className="grid grid-cols-3 gap-3 h-[calc(30%-0.75rem)]">

              {/* External Info */}
              <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm flex flex-col overflow-hidden">
                <h3
                  onClick={() => setOpenModal('externalInfo')}
                  className="text-[0.9375rem] font-semibold px-4 py-2.5 m-0 border-b-2 border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 cursor-pointer transition-all text-center hover:bg-amber-100 dark:hover:bg-amber-900/50"
                >
                  External Info (Firewalls/VPN)
                </h3>
                {loadingData ? (
                  <p className="text-gray-500 dark:text-gray-400 p-4 text-sm">Loading...</p>
                ) : externalInfo.length > 0 ? (
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[1]">
                        <tr className="border-b border-gray-200 dark:border-gray-600">
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Location</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Device Type</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP Address</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Connection</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Username</th>
                        </tr>
                      </thead>
                      <tbody>
                        {externalInfo.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Device Type'] || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Connection Type'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Username || '-'}</td>
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
                  Managed WAN Info (ISP)
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
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">IP 2</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Account #</th>
                          <th className="p-1.5 text-left font-semibold text-[0.6875rem] text-gray-700 dark:text-gray-300">Phone 1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managedInfo.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Provider || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item.Type || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP 1'] || '-'}</td>
                            <td className="p-1.5 font-mono text-gray-900 dark:text-gray-100">{item['IP 2'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Account #'] || '-'}</td>
                            <td className="p-1.5 text-gray-900 dark:text-gray-100">{item['Phone 1'] || '-'}</td>
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
                              <div className="text-[0.5625rem] text-yellow-700 dark:text-yellow-400">Pwd: {item.Password || '-'}</div>
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
                              <div className="text-[0.5625rem] text-blue-900 dark:text-blue-400">Pwd: {item.Password || '-'}</div>
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
                              <div className="text-[0.5625rem] text-green-700 dark:text-green-400">Pwd: {item.PW || '-'}</div>
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
                              <div className="text-[0.5625rem] text-red-700 dark:text-red-400">Pwd: {item.pass || '-'}</div>
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
          ]}
          onEdit={(row) => {
            alert('Edit functionality (mockup)\nEditing: ' + row.Name);
          }}
          onDelete={(row) => {
            if (confirm(`Delete ${row.Name}?\n\nThis is a mockup - no actual deletion will occur.`)) {
              alert('Delete confirmed (mockup only)');
            }
          }}
          onAdd={() => {
            alert('Add New functionality (mockup)\nThis will open a form to add a new infrastructure item.');
          }}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
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
            { key: 'username', label: 'Username', sortable: true },
            { key: 'fullName', label: 'Full Name', sortable: true },
            { key: 'email', label: 'Email', type: 'email', sortable: true },
            { key: 'os', label: 'Operating System', sortable: true },
            { key: 'ipAddress', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'serviceTag', label: 'Service Tag', sortable: true },
            { key: 'cpu', label: 'CPU', sortable: true },
            { key: 'description', label: 'Description', sortable: true },
          ]}
          onEdit={(row) => {
            alert('Edit functionality (mockup)\nEditing: ' + (row.computerName || row.fullName));
          }}
          onDelete={(row) => {
            if (confirm(`Delete ${row.computerName || row.fullName}?\n\nThis is a mockup - no actual deletion will occur.`)) {
              alert('Delete confirmed (mockup only)');
            }
          }}
          onAdd={() => {
            alert('Add New functionality (mockup)\nThis will open a form to add a new workstation/user.');
          }}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
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
            { key: 'IP address', label: 'IP Address', type: 'ip', sortable: true },
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
          onEdit={(row) => {
            alert('Edit functionality (mockup)\nEditing: ' + (row['Device Type'] || 'device'));
          }}
          onDelete={(row) => {
            if (confirm(`Delete ${row['Device Type'] || 'this device'}?\n\nThis is a mockup - no actual deletion will occur.`)) {
              alert('Delete confirmed (mockup only)');
            }
          }}
          onAdd={() => {
            alert('Add New functionality (mockup)\nThis will open a form to add a new firewall/VPN connection.');
          }}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
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
          onEdit={(row) => {
            alert('Edit functionality (mockup)\nEditing: ' + (row.Provider || 'ISP connection'));
          }}
          onDelete={(row) => {
            if (confirm(`Delete ${row.Provider || 'this connection'}?\n\nThis is a mockup - no actual deletion will occur.`)) {
              alert('Delete confirmed (mockup only)');
            }
          }}
          onAdd={() => {
            alert('Add New functionality (mockup)\nThis will open a form to add a new ISP/WAN connection.');
          }}
          enablePasswordMasking={false}
          enableSearch={true}
          enableExport={true}
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
                onEdit={(row) => alert('Edit Admin Email (mockup)\n' + row.Email)}
                onDelete={(row) => confirm(`Delete ${row.Email}? (mockup)`) && alert('Deleted (mockup)')}
                onAdd={() => alert('Add Admin Email (mockup)')}
                rowsPerPageOptions={[25, 50]}
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
                  onEdit={(row) => alert('Edit Mitel (mockup)\n' + row.Login)}
                  onDelete={(row) => confirm(`Delete ${row.Login}? (mockup)`) && alert('Deleted (mockup)')}
                  onAdd={() => alert('Add Mitel Login (mockup)')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
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
                  onEdit={(row) => alert('Edit Acronis (mockup)\n' + row.UserName)}
                  onDelete={(row) => confirm(`Delete ${row.UserName}? (mockup)`) && alert('Deleted (mockup)')}
                  onAdd={() => alert('Add Acronis Backup (mockup)')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
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
                  onEdit={(row) => alert('Edit Cloudflare (mockup)\n' + row.username)}
                  onDelete={(row) => confirm(`Delete ${row.username}? (mockup)`) && alert('Deleted (mockup)')}
                  onAdd={() => alert('Add Cloudflare Admin (mockup)')}
                  rowsPerPageOptions={[10, 25]}
                  enableExport={false}
                />
              </div>
            </div>
          </div>
        </div>
      </FullPageModal>

      {/* Navigation Button Modals */}
      <FullPageModal
        isOpen={openModal === 'misc'}
        onClose={() => {
          setOpenModal(null);
          setMiscTab('services');
        }}
        title="Miscellaneous"
      >
        <div className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setMiscTab('services')}
              className={`px-6 py-3 border-b-[3px] text-[0.9375rem] transition-all ${
                miscTab === 'services'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 font-normal hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setMiscTab('domains')}
              className={`px-6 py-3 border-b-[3px] text-[0.9375rem] transition-all ${
                miscTab === 'domains'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 font-normal hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Domains ({domains.length})
            </button>
            <button
              onClick={() => setMiscTab('cameras')}
              className={`px-6 py-3 border-b-[3px] text-[0.9375rem] transition-all ${
                miscTab === 'cameras'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 font-normal hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Cameras ({cameras.length})
            </button>
            <button
              onClick={() => setMiscTab('documents')}
              className={`px-6 py-3 border-b-[3px] text-[0.9375rem] transition-all ${
                miscTab === 'documents'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 font-normal hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Documents
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {miscTab === 'services' && (
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
                onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row.Service)}
                onDelete={(row) => confirm(`Delete ${row.Service}? (mockup)`) && alert('Deleted (mockup)')}
                onAdd={() => alert('Add New Service (mockup)')}
                enablePasswordMasking={true}
                enableSearch={true}
                enableExport={true}
              />
            )}

            {miscTab === 'domains' && (
              <DataTable
                data={domains}
                columns={[
                  { key: 'Domain Name', label: 'Domain Name', sortable: true },
                  { key: 'Alt Domain', label: 'Alternative Domain', sortable: true },
                ]}
                onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row['Domain Name'])}
                onDelete={(row) => confirm(`Delete ${row['Domain Name']}? (mockup)`) && alert('Deleted (mockup)')}
                onAdd={() => alert('Add New Domain (mockup)')}
                enablePasswordMasking={false}
                enableSearch={true}
                enableExport={true}
              />
            )}

            {miscTab === 'cameras' && (
              <DataTable
                data={cameras}
                columns={[
                  { key: 'Name', label: 'Name', sortable: true },
                  { key: 'Vendor', label: 'Vendor', sortable: true },
                  { key: 'Model', label: 'Model', sortable: true },
                  { key: 'IP', label: 'IP Address', type: 'ip', sortable: true },
                  { key: 'Howto Connect', label: 'Connection Method', sortable: true },
                  { key: 'Login', label: 'Login', sortable: true },
                  { key: 'Password', label: 'Password', type: 'password', sortable: false },
                  { key: 'Host NVR', label: 'Host NVR', sortable: true },
                  { key: 'Notes', label: 'Notes', sortable: true },
                  { key: 'Notes 2', label: 'Notes 2', sortable: true },
                ]}
                onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row.Name)}
                onDelete={(row) => confirm(`Delete ${row.Name}? (mockup)`) && alert('Deleted (mockup)')}
                onAdd={() => alert('Add New Camera (mockup)')}
                enablePasswordMasking={true}
                enableSearch={true}
                enableExport={true}
              />
            )}

            {miscTab === 'documents' && (
              <div className="p-8 flex flex-col items-center gap-6">
                <div className="text-center max-w-[600px]">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Client-Specific Document
                  </h3>
                  <p className="text-[0.9375rem] text-gray-500 dark:text-gray-400 mb-6">
                    Download the miscellaneous Excel file for {selectedClient}. This file contains additional client-specific data and documentation.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const downloadUrl = `/api/data/misc/${selectedClient}`;
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = `${selectedClient}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-8 py-3 border-none rounded-lg bg-blue-500 text-white cursor-pointer text-base font-semibold transition-all shadow-sm hover:bg-blue-600"
                >
                  Download {selectedClient}.xlsx
                </button>

                <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400 max-w-[500px]">
                  <strong>Note:</strong> This file is stored as a BLOB in the database and contains miscellaneous information specific to this client.
                </div>
              </div>
            )}
          </div>
        </div>
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
          onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row.Name)}
          onDelete={(row) => confirm(`Delete ${row.Name}? (mockup)`) && alert('Deleted (mockup)')}
          onAdd={() => alert('Add New Device (mockup)')}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
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
        isOpen={openModal === 'billing'}
        onClose={() => setOpenModal(null)}
        title="Billing"
      >
        <div className="text-center p-12">
          <h3 className="text-2xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
            Billing Information
          </h3>
          <p className="text-gray-400 dark:text-gray-500 text-base">
            Content coming soon...
          </p>
        </div>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'sonicwall'}
        onClose={() => setOpenModal(null)}
        title="Sonicwall"
      >
        <div className="text-center p-12">
          <h3 className="text-2xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
            Sonicwall Information
          </h3>
          <p className="text-gray-400 dark:text-gray-500 text-base">
            Content coming soon...
          </p>
        </div>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'slgEmail'}
        onClose={() => setOpenModal(null)}
        title="SLG Email Issues"
      >
        <div className="text-center p-12">
          <h3 className="text-2xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
            SLG Email Issues
          </h3>
          <p className="text-gray-400 dark:text-gray-500 text-base">
            Content coming soon...
          </p>
        </div>
      </FullPageModal>
    </div>
  );
}
