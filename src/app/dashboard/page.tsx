"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      fetch(`/api/data/admin-credentials?client=${selectedClient}`).then(res => res.json())
    ])
      .then(([externalData, coreData, wsUsersData, managedData, adminData]) => {
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
        setClients(data.clients || []);
        setLoading(false);
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', padding: '0.75rem 1rem', margin: 0, borderBottom: '1px solid #e5e7eb', color: '#111827', backgroundColor: '#f9fafb' }}>
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', padding: '0.75rem 1rem', margin: 0, borderBottom: '1px solid #e5e7eb', color: '#111827', backgroundColor: '#f9fafb' }}>
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', padding: '0.75rem 1rem', margin: 0, borderBottom: '1px solid #e5e7eb', color: '#111827', backgroundColor: '#f9fafb' }}>
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', padding: '0.75rem 1rem', margin: 0, borderBottom: '1px solid #e5e7eb', color: '#111827', backgroundColor: '#f9fafb' }}>
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
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem 0.5rem', margin: 0, color: '#111827' }}>
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
    </div>
  );
}
