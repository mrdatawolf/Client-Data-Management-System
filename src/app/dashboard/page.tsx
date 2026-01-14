"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FullPageModal } from "@/components/FullPageModal";
import { DataTable } from "@/components/DataTable";

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
      fetch(`/api/data/services?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/domains?client=${selectedClient}`).then(res => res.json()),
      fetch(`/api/data/cameras?client=${selectedClient}`).then(res => res.json())
    ])
      .then(([externalData, coreData, wsUsersData, managedData, adminData, guacData, devicesData, containersData, vmsData, servicesData, domainsData, camerasData]) => {
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
        setServices([]);
        setDomains([]);
        setCameras([]);
        setLoadingData(false);
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));

    // Load clients
    fetch("/api/data/clients")
      .then(res => res.json())
      .then(data => {
        const clientList = data.clients || [];
        setClients(clientList);
        setLoading(false);

        // Set default company if specified in env and not already selected
        const defaultCompany = process.env.NEXT_PUBLIC_DEFAULT_COMPANY;
        if (defaultCompany && !selectedClient) {
          // Check if the default company exists in the client list
          const companyExists = clientList.some((c: any) => c.value === defaultCompany);
          if (companyExists) {
            setSelectedClient(defaultCompany);
          }
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
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' }}>
      {/* Compact Header */}
      <header style={{ backgroundColor: 'white', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', flexShrink: 0 }}>
        <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              Infrastructure Dashboard
            </h1>
            {/* Client Selector in Header */}
            <select
              id="client-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={loading}
              style={{
                padding: '0.375rem 0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                backgroundColor: 'white',
                minWidth: '250px'
              }}
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
              style={{
                padding: '0.375rem 0.625rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: selectedClient && !loadingData ? 'white' : '#f3f4f6',
                cursor: selectedClient && !loadingData ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                lineHeight: '1',
                opacity: selectedClient && !loadingData ? 1 : 0.5,
                transition: 'all 0.15s'
              }}
              title="Refresh data"
            >
              ↻
            </button>

            {/* Navigation Buttons */}
            {selectedClient && (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', borderLeft: '1px solid #d1d5db', paddingLeft: '1rem' }}>
                {/* Guacamole Button - Opens URL from GuacamoleHosts */}
                {guacamoleHosts.length > 0 && guacamoleHosts[0]?.['Cloud Name'] && (
                  <button
                    onClick={() => window.open(guacamoleHosts[0]['Cloud Name'], '_blank')}
                    style={{
                      padding: '0.375rem 0.75rem',
                      border: '1px solid #3b82f6',
                      borderRadius: '0.375rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    title={`Open ${guacamoleHosts[0]['Cloud Name'] || 'Guacamole'}`}
                  >
                    Guacamole
                  </button>
                )}
                <button
                  onClick={() => setOpenModal('misc')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Misc
                </button>
                <button
                  onClick={() => setOpenModal('devices')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Devices
                </button>
                <button
                  onClick={() => setOpenModal('containers')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Containers
                </button>
                <button
                  onClick={() => setOpenModal('vms')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  VMs
                </button>
                <button
                  onClick={() => setOpenModal('billing')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Billing
                </button>
                <button
                  onClick={() => setOpenModal('sonicwall')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Sonicwall
                </button>
                <button
                  onClick={() => setOpenModal('slgEmail')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #6b7280',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  SLG Email Issues
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '0.8125rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width, No Scroll */}
      <main style={{ flex: 1, overflow: 'hidden', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
        {selectedClient ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>

            {/* Top Row: Core Infrastructure and Workstations + Users side by side - 70% height */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', height: '70%' }}>

              {/* Core Infrastructure - 50% width, 70% height */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3
                  onClick={() => setOpenModal('coreInfra')}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    padding: '0.625rem 1rem',
                    margin: 0,
                    borderBottom: '2px solid #3b82f6',
                    color: '#1e40af',
                    backgroundColor: '#eff6ff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dbeafe';
                    e.currentTarget.style.borderBottomColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.borderBottomColor = '#3b82f6';
                  }}
                >
                  Core Infrastructure (Servers/Routers/Switches)
                </h3>
                {loadingData ? (
                  <p style={{ color: '#6b7280', padding: '1rem', fontSize: '0.8125rem' }}>Loading...</p>
                ) : coreInfra.length > 0 ? (
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Location</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Name</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>IP Address</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Machine Name/MAC</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Description</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coreInfra.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.SubName || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Name || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>{item['IP address'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem' }}>{item['Machine Name / MAC'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Description || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Login || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', padding: '1rem', fontStyle: 'italic', fontSize: '0.8125rem' }}>No core infrastructure</p>
                )}
              </div>

              {/* Workstations + Users - 50% width, 70% height */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3
                  onClick={() => setOpenModal('workstationsUsers')}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    padding: '0.625rem 1rem',
                    margin: 0,
                    borderBottom: '2px solid #10b981',
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#d1fae5';
                    e.currentTarget.style.borderBottomColor = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ecfdf5';
                    e.currentTarget.style.borderBottomColor = '#10b981';
                  }}
                >
                  Workstations + Users
                </h3>
                {loadingData ? (
                  <p style={{ color: '#6b7280', padding: '1rem', fontSize: '0.8125rem' }}>Loading...</p>
                ) : workstationsUsers.length > 0 ? (
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Computer</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Location</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Username</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Full Name</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Email</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>OS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workstationsUsers.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.computerName || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.location || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.username || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.fullName || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.email || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.os || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', padding: '1rem', fontStyle: 'italic', fontSize: '0.8125rem' }}>No workstations</p>
                )}
              </div>
            </div>

            {/* Bottom Row: External Info, Managed WAN, and Admin Credentials - 30% height */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', height: 'calc(30% - 0.75rem)' }}>

              {/* External Info */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3
                  onClick={() => setOpenModal('externalInfo')}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    padding: '0.625rem 1rem',
                    margin: 0,
                    borderBottom: '2px solid #f59e0b',
                    color: '#b45309',
                    backgroundColor: '#fffbeb',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef3c7';
                    e.currentTarget.style.borderBottomColor = '#d97706';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fffbeb';
                    e.currentTarget.style.borderBottomColor = '#f59e0b';
                  }}
                >
                  External Info (Firewalls/VPN)
                </h3>
                {loadingData ? (
                  <p style={{ color: '#6b7280', padding: '1rem', fontSize: '0.8125rem' }}>Loading...</p>
                ) : externalInfo.length > 0 ? (
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Location</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Device Type</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>IP Address</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Connection</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Username</th>
                        </tr>
                      </thead>
                      <tbody>
                        {externalInfo.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.SubName || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item['Device Type'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>{item['IP address'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item['Connection Type'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Username || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', padding: '1rem', fontStyle: 'italic', fontSize: '0.8125rem' }}>No external info</p>
                )}
              </div>

              {/* Managed WAN Info */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3
                  onClick={() => setOpenModal('managedInfo')}
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    padding: '0.625rem 1rem',
                    margin: 0,
                    borderBottom: '2px solid #8b5cf6',
                    color: '#6d28d9',
                    backgroundColor: '#f5f3ff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ede9fe';
                    e.currentTarget.style.borderBottomColor = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f3ff';
                    e.currentTarget.style.borderBottomColor = '#8b5cf6';
                  }}
                >
                  Managed WAN Info (ISP)
                </h3>
                {loadingData ? (
                  <p style={{ color: '#6b7280', padding: '1rem', fontSize: '0.8125rem' }}>Loading...</p>
                ) : managedInfo.length > 0 ? (
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Provider</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Type</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>IP 1</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>IP 2</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Account #</th>
                          <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.6875rem' }}>Phone 1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managedInfo.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Provider || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item.Type || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>{item['IP 1'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}>{item['IP 2'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item['Account #'] || '-'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{item['Phone 1'] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', padding: '1rem', fontStyle: 'italic', fontSize: '0.8125rem' }}>No managed WAN info</p>
                )}
              </div>

              {/* Admin Credentials Box (1x4 horizontal) */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', padding: '0.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3
                  onClick={() => setOpenModal('adminCredentials')}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    padding: '0.5rem 0.75rem',
                    margin: 0,
                    marginBottom: '0.5rem',
                    color: '#be123c',
                    borderBottom: '2px solid #fb7185',
                    backgroundColor: '#fff1f2',
                    cursor: 'pointer',
                    borderRadius: '0.25rem 0.25rem 0 0',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffe4e6';
                    e.currentTarget.style.borderBottomColor = '#f43f5e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff1f2';
                    e.currentTarget.style.borderBottomColor = '#fb7185';
                  }}
                >
                  Admin Credentials
                </h3>
                {loadingData ? (
                  <p style={{ color: '#6b7280', padding: '0.5rem', fontSize: '0.75rem' }}>Loading...</p>
                ) : (
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr', gap: '0.5rem', overflow: 'hidden' }}>

                    {/* Admin Emails - Compact Horizontal */}
                    <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '0.25rem', padding: '0.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '600', margin: 0, marginBottom: '0.125rem', color: '#854d0e' }}>
                        Emails ({adminCredentials.adminEmails.length})
                      </h4>
                      {adminCredentials.adminEmails.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.5625rem' }}>
                          {adminCredentials.adminEmails.map((item: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0.125rem', paddingBottom: '0.125rem', borderBottom: idx < adminCredentials.adminEmails.length - 1 ? '1px solid #fde047' : 'none' }}>
                              <div style={{ fontWeight: '500', color: '#854d0e', wordBreak: 'break-all', lineHeight: '1.1' }}>{item.Email || item.Name || '-'}</div>
                              <div style={{ fontSize: '0.5rem', color: '#a16207' }}>Pwd: {item.Password || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.5625rem', color: '#a16207', fontStyle: 'italic', margin: 0 }}>No data</p>
                      )}
                    </div>

                    {/* Mitel Logins - Compact Horizontal */}
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '0.25rem', padding: '0.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '600', margin: 0, marginBottom: '0.125rem', color: '#1e40af' }}>
                        Mitel ({adminCredentials.mitelLogins.length})
                      </h4>
                      {adminCredentials.mitelLogins.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.5625rem' }}>
                          {adminCredentials.mitelLogins.map((item: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0.125rem', paddingBottom: '0.125rem', borderBottom: idx < adminCredentials.mitelLogins.length - 1 ? '1px solid #93c5fd' : 'none' }}>
                              <div style={{ fontWeight: '500', color: '#1e40af', wordBreak: 'break-all', lineHeight: '1.1' }}>{item.Login || '-'}</div>
                              <div style={{ fontSize: '0.5rem', color: '#1e3a8a' }}>Pwd: {item.Password || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.5625rem', color: '#1e3a8a', fontStyle: 'italic', margin: 0 }}>No data</p>
                      )}
                    </div>

                    {/* Acronis Backups - Compact Horizontal */}
                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.25rem', padding: '0.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '600', margin: 0, marginBottom: '0.125rem', color: '#166534' }}>
                        Acronis ({adminCredentials.acronisBackups.length})
                      </h4>
                      {adminCredentials.acronisBackups.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.5625rem' }}>
                          {adminCredentials.acronisBackups.map((item: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0.125rem', paddingBottom: '0.125rem', borderBottom: idx < adminCredentials.acronisBackups.length - 1 ? '1px solid #86efac' : 'none' }}>
                              <div style={{ fontWeight: '500', color: '#166534', wordBreak: 'break-all', lineHeight: '1.1' }}>{item.UserName || '-'}</div>
                              <div style={{ fontSize: '0.5rem', color: '#15803d' }}>Pwd: {item.PW || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.5625rem', color: '#15803d', fontStyle: 'italic', margin: 0 }}>No data</p>
                      )}
                    </div>

                    {/* Cloudflare Admins - Compact Horizontal */}
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.25rem', padding: '0.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.625rem', fontWeight: '600', margin: 0, marginBottom: '0.125rem', color: '#991b1b' }}>
                        Cloudflare ({adminCredentials.cloudflareAdmins.length})
                      </h4>
                      {adminCredentials.cloudflareAdmins.length > 0 ? (
                        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.5625rem' }}>
                          {adminCredentials.cloudflareAdmins.map((item: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '0.125rem', paddingBottom: '0.125rem', borderBottom: idx < adminCredentials.cloudflareAdmins.length - 1 ? '1px solid #fca5a5' : 'none' }}>
                              <div style={{ fontWeight: '500', color: '#991b1b', wordBreak: 'break-all', lineHeight: '1.1' }}>{item.username || '-'}</div>
                              <div style={{ fontSize: '0.5rem', color: '#b91c1c' }}>Pwd: {item.pass || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.5625rem', color: '#b91c1c', fontStyle: 'italic', margin: 0 }}>No data</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '0.375rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#6b7280' }}>
                Select a client to view data
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
          {/* Admin Emails */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '2px solid #fde047', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem 1rem', fontWeight: '600', fontSize: '1rem', color: '#854d0e' }}>
              Admin Emails ({adminCredentials.adminEmails.length})
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: '1rem' }}>
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
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {/* Mitel */}
            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #93c5fd', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#dbeafe', padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', color: '#1e40af' }}>
                Mitel Logins ({adminCredentials.mitelLogins.length})
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #86efac', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#d1fae5', padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', color: '#166534' }}>
                Acronis Backups ({adminCredentials.acronisBackups.length})
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #fca5a5', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#fecaca', padding: '0.75rem 1rem', fontWeight: '600', fontSize: '0.875rem', color: '#991b1b' }}>
                Cloudflare ({adminCredentials.cloudflareAdmins.length})
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1rem' }}>
            <button
              onClick={() => setMiscTab('services')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderBottom: miscTab === 'services' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: miscTab === 'services' ? '#eff6ff' : 'transparent',
                color: miscTab === 'services' ? '#1e40af' : '#6b7280',
                cursor: 'pointer',
                fontWeight: miscTab === 'services' ? '600' : '400',
                fontSize: '0.9375rem',
                transition: 'all 0.15s'
              }}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setMiscTab('domains')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderBottom: miscTab === 'domains' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: miscTab === 'domains' ? '#eff6ff' : 'transparent',
                color: miscTab === 'domains' ? '#1e40af' : '#6b7280',
                cursor: 'pointer',
                fontWeight: miscTab === 'domains' ? '600' : '400',
                fontSize: '0.9375rem',
                transition: 'all 0.15s'
              }}
            >
              Domains ({domains.length})
            </button>
            <button
              onClick={() => setMiscTab('cameras')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderBottom: miscTab === 'cameras' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: miscTab === 'cameras' ? '#eff6ff' : 'transparent',
                color: miscTab === 'cameras' ? '#1e40af' : '#6b7280',
                cursor: 'pointer',
                fontWeight: miscTab === 'cameras' ? '600' : '400',
                fontSize: '0.9375rem',
                transition: 'all 0.15s'
              }}
            >
              Cameras ({cameras.length})
            </button>
            <button
              onClick={() => setMiscTab('documents')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderBottom: miscTab === 'documents' ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: miscTab === 'documents' ? '#eff6ff' : 'transparent',
                color: miscTab === 'documents' ? '#1e40af' : '#6b7280',
                cursor: 'pointer',
                fontWeight: miscTab === 'documents' ? '600' : '400',
                fontSize: '0.9375rem',
                transition: 'all 0.15s'
              }}
            >
              Documents
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
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
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
                    Client-Specific Document
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: '#6b7280', marginBottom: '1.5rem' }}>
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
                  style={{
                    padding: '0.75rem 2rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  📥 Download {selectedClient}.xlsx
                </button>

                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  maxWidth: '500px'
                }}>
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
        isOpen={openModal === 'containers'}
        onClose={() => setOpenModal(null)}
        title="Containers"
      >
        <DataTable
          data={containers}
          columns={[
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'IP', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'Port', label: 'Port', type: 'number', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
          ]}
          onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row.Name)}
          onDelete={(row) => confirm(`Delete ${row.Name}? (mockup)`) && alert('Deleted (mockup)')}
          onAdd={() => alert('Add New Container (mockup)')}
          enablePasswordMasking={false}
          enableSearch={true}
          enableExport={true}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'vms'}
        onClose={() => setOpenModal(null)}
        title="Virtual Machines"
      >
        <DataTable
          data={vms}
          columns={[
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'Location', label: 'Location', sortable: true },
            { key: 'IP', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'Type', label: 'Type', sortable: true },
            { key: 'Host', label: 'Host', sortable: true },
            { key: 'Startup memory (GB)', label: 'Memory (GB)', type: 'number', sortable: true },
            { key: 'Assigned cores', label: 'CPU Cores', sortable: true },
            { key: 'Assigned To', label: 'Assigned To', sortable: true },
            { key: 'Notes', label: 'Notes', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Active', label: 'Active', sortable: true },
            { key: 'Windows 11 Issue?', label: 'W11 Issue?', sortable: true },
            { key: 'Needs W11', label: 'Needs W11', sortable: true },
          ]}
          onEdit={(row) => alert('Edit functionality (mockup)\nEditing: ' + row.Name)}
          onDelete={(row) => confirm(`Delete ${row.Name}? (mockup)`) && alert('Deleted (mockup)')}
          onAdd={() => alert('Add New VM (mockup)')}
          enablePasswordMasking={false}
          enableSearch={true}
          enableExport={true}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'billing'}
        onClose={() => setOpenModal(null)}
        title="Billing"
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#6b7280', marginBottom: '1rem' }}>
            Billing Information
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Content coming soon...
          </p>
        </div>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'sonicwall'}
        onClose={() => setOpenModal(null)}
        title="Sonicwall"
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#6b7280', marginBottom: '1rem' }}>
            Sonicwall Information
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Content coming soon...
          </p>
        </div>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'slgEmail'}
        onClose={() => setOpenModal(null)}
        title="SLG Email Issues"
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#6b7280', marginBottom: '1rem' }}>
            SLG Email Issues
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Content coming soon...
          </p>
        </div>
      </FullPageModal>
    </div>
  );
}
