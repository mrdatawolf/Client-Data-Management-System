"use client";

import { useState, useMemo } from "react";

interface VM {
  Name: string;
  Location: string;
  IP: string;
  Type: string;
  Host: string;
  "Startup memory (GB)": number;
  "Assigned cores": string;
  "Assigned To": string;
  Notes: string;
  Grouping: string;
  Active: number;
  "Startup Notes"?: string;
}

interface Container {
  Name: string;
  IP: string;
  Port: number;
  Grouping: string;
  Host?: string;
  "Startup Notes"?: string;
}

interface Daemon {
  Name: string;
  Location: string;
  IP: string;
  Host: string;
  User: string;
  Notes: string;
  Inactive: number;
  "Startup Notes"?: string;
}

interface CoreInfrastructure {
  Name: string;
  "IP address": string;
  Login: string;
  Password: string;
  "Alt Login": string;
  "Alt Passwd": string;
  Description: string;
  Notes: string;
  Cores?: number;
  "Ram (GB)"?: number;
  Inactive?: number;
  "RDP?"?: number;
  "VNC?"?: number;
  "SSH?"?: number;
  "Web?"?: number;
}

// Resource defaults (can be overridden via environment variables)
const CONTAINER_DEFAULT_CORES = parseInt(process.env.NEXT_PUBLIC_CONTAINER_DEFAULT_CORES || "0", 10);
const CONTAINER_DEFAULT_RAM = parseInt(process.env.NEXT_PUBLIC_CONTAINER_DEFAULT_RAM || "1", 10);
const DAEMON_DEFAULT_CORES = parseInt(process.env.NEXT_PUBLIC_DAEMON_DEFAULT_CORES || "1", 10);
const DAEMON_DEFAULT_RAM = parseInt(process.env.NEXT_PUBLIC_DAEMON_DEFAULT_RAM || "2", 10);

// OS overhead for host RAM (Windows uses more than Linux/other)
const WINDOWS_OS_RAM = parseInt(process.env.NEXT_PUBLIC_WINDOWS_OS_RAM || "4", 10);
const OTHER_OS_RAM = parseInt(process.env.NEXT_PUBLIC_OTHER_OS_RAM || "1", 10);

// Helper to detect if a host is running Windows
const isWindowsHost = (hostInfo: CoreInfrastructure | null): boolean => {
  if (!hostInfo) return false;
  const desc = (hostInfo.Description || "").toLowerCase();
  const name = (hostInfo.Name || "").toLowerCase();
  const notes = (hostInfo.Notes || "").toLowerCase();
  return desc.includes("windows") || name.includes("windows") || notes.includes("hyper-v") || notes.includes("hyperv");
};

interface HostGroupedViewProps {
  vms: VM[];
  containers: Container[];
  daemons: Daemon[];
  coreInfra: CoreInfrastructure[];
  onSearch?: (term: string) => void;
}

export function HostGroupedView({ vms, containers, daemons, coreInfra }: HostGroupedViewProps) {
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHost, setSelectedHost] = useState<CoreInfrastructure | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  // Helper to get IP prefix (first 3 octets)
  const getIpPrefix = (ip: string): string => {
    if (!ip) return "";
    const parts = ip.split(".");
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return ip;
  };

  // Group type with resource calculations
  interface HostGroup {
    vms: VM[];
    containers: Container[];
    daemons: Daemon[];
    hostInfo: CoreInfrastructure | null;
    allocatedCores: number;
    allocatedRam: number;
    osOverheadRam: number; // RAM used by host OS
  }

  // Group VMs, Containers, and Daemons by host
  const groupedData = useMemo(() => {
    const groups: Record<string, HostGroup> = {};

    // Filter by search term
    const filteredVMs = vms.filter(vm =>
      !searchTerm ||
      vm.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vm.Host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vm.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContainers = containers.filter(c =>
      !searchTerm ||
      c.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDaemons = daemons.filter(d =>
      !searchTerm ||
      d.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.Host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Build a map of host IPs to host names for matching
    const hostIpToName: Record<string, string> = {};
    const hostPrefixToName: Record<string, string> = {};

    // Helper to create a new group
    const createGroup = (hostName: string): HostGroup => {
      const hostInfo = coreInfra.find(h =>
        h.Name?.toLowerCase() === hostName.toLowerCase() ||
        h["IP address"] === hostName
      ) || null;
      // Calculate OS overhead based on host type
      const osOverheadRam = isWindowsHost(hostInfo) ? WINDOWS_OS_RAM : OTHER_OS_RAM;
      return { vms: [], containers: [], daemons: [], hostInfo, allocatedCores: 0, allocatedRam: 0, osOverheadRam };
    };

    // Group VMs by host and build host IP mappings
    filteredVMs.forEach(vm => {
      const hostName = vm.Host || "Unknown Host";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
        const hostInfo = groups[hostName].hostInfo;

        // Map host IP to host name for container/daemon matching
        if (hostInfo?.["IP address"]) {
          hostIpToName[hostInfo["IP address"]] = hostName;
          hostPrefixToName[getIpPrefix(hostInfo["IP address"])] = hostName;
        }
        // Also map if host name itself looks like an IP
        if (hostName.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          hostIpToName[hostName] = hostName;
          hostPrefixToName[getIpPrefix(hostName)] = hostName;
        }
      }
      groups[hostName].vms.push(vm);
    });

    // Also check coreInfra for additional hosts that might not have VMs
    coreInfra.forEach(host => {
      if (host["IP address"]) {
        const ip = host["IP address"];
        if (!hostIpToName[ip]) {
          hostIpToName[ip] = host.Name || ip;
          hostPrefixToName[getIpPrefix(ip)] = host.Name || ip;
        }
      }
    });

    // Group containers - match to hosts by IP or IP prefix
    filteredContainers.forEach(container => {
      let matchedHost: string | null = null;

      // 1. Check if container has explicit Host field
      if (container.Host) {
        matchedHost = container.Host;
      }
      // 2. Check if container IP directly matches a host IP
      else if (container.IP && hostIpToName[container.IP]) {
        matchedHost = hostIpToName[container.IP];
      }
      // 3. Check if container IP prefix matches a host IP prefix (same subnet)
      else if (container.IP) {
        const containerPrefix = getIpPrefix(container.IP);
        if (hostPrefixToName[containerPrefix]) {
          matchedHost = hostPrefixToName[containerPrefix];
        }
      }
      // 4. Check Grouping field - it might contain host info
      else if (container.Grouping) {
        const groupingLower = container.Grouping.toLowerCase();
        for (const hostName of Object.keys(groups)) {
          if (hostName.toLowerCase().includes(groupingLower) ||
              groupingLower.includes(hostName.toLowerCase())) {
            matchedHost = hostName;
            break;
          }
        }
      }

      const hostName = matchedHost || "Unassigned Containers";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
      }
      groups[hostName].containers.push(container);
    });

    // Group daemons by host
    filteredDaemons.forEach(daemon => {
      let matchedHost: string | null = null;

      // 1. Check if daemon has explicit Host field
      if (daemon.Host) {
        matchedHost = daemon.Host;
      }
      // 2. Check if daemon IP directly matches a host IP
      else if (daemon.IP && hostIpToName[daemon.IP]) {
        matchedHost = hostIpToName[daemon.IP];
      }
      // 3. Check if daemon IP prefix matches a host IP prefix
      else if (daemon.IP) {
        const daemonPrefix = getIpPrefix(daemon.IP);
        if (hostPrefixToName[daemonPrefix]) {
          matchedHost = hostPrefixToName[daemonPrefix];
        }
      }

      const hostName = matchedHost || "Unassigned Daemons";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
      }
      groups[hostName].daemons.push(daemon);
    });

    // Calculate allocated resources for each host
    Object.values(groups).forEach(group => {
      // VMs: use actual values
      group.vms.forEach(vm => {
        const cores = parseInt(String(vm["Assigned cores"] || 0), 10);
        const ram = vm["Startup memory (GB)"] || 0;
        group.allocatedCores += cores;
        group.allocatedRam += ram;
      });

      // Containers: use defaults
      group.allocatedCores += group.containers.length * CONTAINER_DEFAULT_CORES;
      group.allocatedRam += group.containers.length * CONTAINER_DEFAULT_RAM;

      // Daemons: use defaults
      group.allocatedCores += group.daemons.length * DAEMON_DEFAULT_CORES;
      group.allocatedRam += group.daemons.length * DAEMON_DEFAULT_RAM;
    });

    return groups;
  }, [vms, containers, daemons, coreInfra, searchTerm]);

  const toggleHost = (hostName: string) => {
    const newExpanded = new Set(expandedHosts);
    if (newExpanded.has(hostName)) {
      newExpanded.delete(hostName);
    } else {
      newExpanded.add(hostName);
    }
    setExpandedHosts(newExpanded);
  };

  const expandAll = () => {
    setExpandedHosts(new Set(Object.keys(groupedData)));
  };

  const collapseAll = () => {
    setExpandedHosts(new Set());
  };

  const togglePassword = (key: string) => {
    const newShow = new Set(showPasswords);
    if (newShow.has(key)) {
      newShow.delete(key);
    } else {
      newShow.add(key);
    }
    setShowPasswords(newShow);
  };

  // Connection handlers
  const openRDP = (ip: string) => {
    // Create RDP file content and download it
    const rdpContent = `full address:s:${ip}\nprompt for credentials:i:1`;
    const blob = new Blob([rdpContent], { type: "application/x-rdp" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ip}.rdp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openVNC = (ip: string) => {
    // VNC typically uses vnc:// protocol
    window.open(`vnc://${ip}:5900`, "_blank");
  };

  const openSSH = (ip: string, username?: string) => {
    // SSH uses ssh:// protocol or can open terminal
    const sshUrl = username ? `ssh://${username}@${ip}` : `ssh://${ip}`;
    window.open(sshUrl, "_blank");
  };

  const openWebUI = (ip: string, port?: number) => {
    const url = port ? `http://${ip}:${port}` : `http://${ip}`;
    window.open(url, "_blank");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sortedHosts = Object.keys(groupedData).sort((a, b) => {
    // Put "Unknown Host" and "Unassigned Containers" at the end
    if (a.includes("Unknown") || a.includes("Unassigned")) return 1;
    if (b.includes("Unknown") || b.includes("Unassigned")) return -1;
    return a.localeCompare(b);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "1rem" }}>
      {/* Search and Controls */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search VMs, containers, daemons, or hosts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: "250px",
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
          }}
        />
        <button
          onClick={expandAll}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "0.8125rem",
          }}
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "0.8125rem",
          }}
        >
          Collapse All
        </button>
        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          {Object.keys(groupedData).length} hosts | {vms.length} VMs | {containers.length} containers | {daemons.length} daemons
        </div>
      </div>

      {/* Grouped List */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {sortedHosts.map((hostName) => {
          const group = groupedData[hostName];
          const isExpanded = expandedHosts.has(hostName);
          const hostInfo = group.hostInfo;
          const totalItems = group.vms.length + group.containers.length + group.daemons.length;

          // Resource info - calculate available RAM after OS overhead
          const hostCores = hostInfo?.Cores;
          const hostRam = hostInfo?.["Ram (GB)"];
          const availableRam = hostRam !== undefined ? hostRam - group.osOverheadRam : undefined;
          const hasResourceInfo = hostCores !== undefined || hostRam !== undefined;

          return (
            <div
              key={hostName}
              style={{
                marginBottom: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              {/* Host Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  backgroundColor: "#f9fafb",
                  borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                  cursor: "pointer",
                }}
                onClick={() => toggleHost(hostName)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1rem", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    ▶
                  </span>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>
                      {hostName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {hostInfo?.["IP address"] && `IP: ${hostInfo["IP address"]} | `}
                      {group.vms.length} VMs, {group.containers.length} containers{group.daemons.length > 0 && `, ${group.daemons.length} daemons`}
                    </div>
                  </div>

                  {/* Resource allocation display */}
                  {(group.allocatedCores > 0 || group.allocatedRam > 0) && (
                    <div style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginLeft: "1rem",
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "0.25rem",
                      fontSize: "0.6875rem",
                    }}>
                      <div title="Allocated Cores">
                        <span style={{ color: "#6b7280" }}>Cores: </span>
                        <span style={{
                          fontWeight: "600",
                          color: hostCores && group.allocatedCores > hostCores ? "#dc2626" : "#059669"
                        }}>
                          {group.allocatedCores}
                        </span>
                        {hostCores !== undefined && (
                          <span style={{ color: "#9ca3af" }}> / {hostCores}</span>
                        )}
                      </div>
                      <div title={`Allocated RAM (GB) - OS uses ${group.osOverheadRam}GB`}>
                        <span style={{ color: "#6b7280" }}>RAM: </span>
                        <span style={{
                          fontWeight: "600",
                          color: availableRam !== undefined && group.allocatedRam > availableRam ? "#dc2626" : "#059669"
                        }}>
                          {group.allocatedRam}GB
                        </span>
                        {availableRam !== undefined && (
                          <span style={{ color: "#9ca3af" }}> / {availableRam}GB</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Host Action Buttons */}
                <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                  {hostInfo && (
                    <button
                      onClick={() => setSelectedHost(hostInfo)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        border: "1px solid #6366f1",
                        borderRadius: "0.25rem",
                        backgroundColor: "#eef2ff",
                        color: "#4f46e5",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                      title="View host credentials"
                    >
                      Credentials
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["RDP?"] === 1 && (
                    <button
                      onClick={() => openRDP(hostInfo["IP address"])}
                      style={{
                        padding: "0.375rem 0.75rem",
                        border: "1px solid #3b82f6",
                        borderRadius: "0.25rem",
                        backgroundColor: "#dbeafe",
                        color: "#1d4ed8",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                      title="Open Remote Desktop"
                    >
                      RDP
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["VNC?"] === 1 && (
                    <button
                      onClick={() => openVNC(hostInfo["IP address"])}
                      style={{
                        padding: "0.375rem 0.75rem",
                        border: "1px solid #8b5cf6",
                        borderRadius: "0.25rem",
                        backgroundColor: "#ede9fe",
                        color: "#6d28d9",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                      title="Open VNC"
                    >
                      VNC
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["SSH?"] === 1 && (
                    <button
                      onClick={() => openSSH(hostInfo["IP address"], hostInfo.Login)}
                      style={{
                        padding: "0.375rem 0.75rem",
                        border: "1px solid #059669",
                        borderRadius: "0.25rem",
                        backgroundColor: "#d1fae5",
                        color: "#047857",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                      title="Open SSH"
                    >
                      SSH
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["Web?"] === 1 && (
                    <button
                      onClick={() => openWebUI(hostInfo["IP address"])}
                      style={{
                        padding: "0.375rem 0.75rem",
                        border: "1px solid #f59e0b",
                        borderRadius: "0.25rem",
                        backgroundColor: "#fef3c7",
                        color: "#b45309",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                      title="Open Web UI"
                    >
                      Web
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content - Card Grid Layout */}
              {isExpanded && (
                <div style={{ padding: "0.75rem 1rem" }}>
                  {/* Combined VMs and Containers in a single card grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "0.5rem"
                  }}>
                    {/* VM Cards */}
                    {group.vms.map((vm, idx) => (
                      <div
                        key={`vm-${vm.Name}-${idx}`}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: vm.Active === 1 ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${vm.Active === 1 ? "#bbf7d0" : "#fecaca"}`,
                          borderRadius: "0.375rem",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "90px",
                        }}
                      >
                        {/* Header with name and badges */}
                        <div style={{ marginBottom: "0.25rem" }}>
                          <div style={{
                            fontWeight: "600",
                            fontSize: "0.8125rem",
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }} title={vm.Name}>
                            {vm.Name}
                          </div>
                          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.125rem" }}>
                            <span style={{
                              fontSize: "0.625rem",
                              padding: "0.0625rem 0.25rem",
                              borderRadius: "9999px",
                              backgroundColor: "#e0e7ff",
                              color: "#3730a3",
                            }}>
                              VM
                            </span>
                            {vm.Type && (
                              <span style={{
                                fontSize: "0.625rem",
                                padding: "0.0625rem 0.25rem",
                                borderRadius: "9999px",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}>
                                {vm.Type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* IP and specs */}
                        <div style={{ fontSize: "0.6875rem", color: "#6b7280", flex: 1 }}>
                          {vm.IP && <div style={{ fontFamily: "monospace" }}>{vm.IP}</div>}
                          <div>
                            {vm["Startup memory (GB)"] && <span>{vm["Startup memory (GB)"]}GB</span>}
                            {vm["Assigned cores"] && <span> / {vm["Assigned cores"]}c</span>}
                          </div>
                          {/* Startup Notes */}
                          {vm["Startup Notes"] && (
                            <div style={{
                              marginTop: "0.25rem",
                              padding: "0.25rem",
                              backgroundColor: "#fef3c7",
                              border: "1px solid #fcd34d",
                              borderRadius: "0.25rem",
                              fontSize: "0.625rem",
                              color: "#92400e",
                              lineHeight: "1.3",
                            }} title={vm["Startup Notes"]}>
                              {vm["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.375rem" }}>
                          {vm.IP && (
                            <>
                              <button
                                onClick={() => openRDP(vm.IP)}
                                style={{
                                  flex: 1,
                                  padding: "0.25rem",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  backgroundColor: "#3b82f6",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "0.625rem",
                                  fontWeight: "500",
                                }}
                                title="RDP to VM"
                              >
                                RDP
                              </button>
                              <button
                                onClick={() => copyToClipboard(vm.IP)}
                                style={{
                                  padding: "0.25rem 0.375rem",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "0.25rem",
                                  backgroundColor: "white",
                                  color: "#6b7280",
                                  cursor: "pointer",
                                  fontSize: "0.625rem",
                                }}
                                title="Copy IP"
                              >
                                IP
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Container Cards */}
                    {group.containers.map((container, idx) => (
                      <div
                        key={`container-${container.Name}-${idx}`}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          borderRadius: "0.375rem",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "90px",
                        }}
                      >
                        {/* Header with name and badge */}
                        <div style={{ marginBottom: "0.25rem" }}>
                          <div style={{
                            fontWeight: "600",
                            fontSize: "0.8125rem",
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }} title={container.Name}>
                            {container.Name}
                          </div>
                          <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.125rem" }}>
                            <span style={{
                              fontSize: "0.625rem",
                              padding: "0.0625rem 0.25rem",
                              borderRadius: "9999px",
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                            }}>
                              Container
                            </span>
                          </div>
                        </div>

                        {/* IP and port */}
                        <div style={{ fontSize: "0.6875rem", color: "#6b7280", flex: 1 }}>
                          {container.IP && <div style={{ fontFamily: "monospace" }}>{container.IP}</div>}
                          {container.Port && <div>Port: {container.Port}</div>}
                          {/* Startup Notes */}
                          {container["Startup Notes"] && (
                            <div style={{
                              marginTop: "0.25rem",
                              padding: "0.25rem",
                              backgroundColor: "#fef3c7",
                              border: "1px solid #fcd34d",
                              borderRadius: "0.25rem",
                              fontSize: "0.625rem",
                              color: "#92400e",
                              lineHeight: "1.3",
                            }} title={container["Startup Notes"]}>
                              {container["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.375rem" }}>
                          {container.IP && container.Port && (
                            <button
                              onClick={() => openWebUI(container.IP, container.Port)}
                              style={{
                                flex: 1,
                                padding: "0.25rem",
                                border: "none",
                                borderRadius: "0.25rem",
                                backgroundColor: "#f59e0b",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "0.625rem",
                                fontWeight: "500",
                              }}
                              title="Open Web UI"
                            >
                              Open
                            </button>
                          )}
                          {container.IP && (
                            <button
                              onClick={() => copyToClipboard(container.Port ? `${container.IP}:${container.Port}` : container.IP)}
                              style={{
                                padding: "0.25rem 0.375rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "0.25rem",
                                backgroundColor: "white",
                                color: "#6b7280",
                                cursor: "pointer",
                                fontSize: "0.625rem",
                              }}
                              title="Copy address"
                            >
                              IP
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Daemon Cards */}
                    {group.daemons.map((daemon, idx) => (
                      <div
                        key={`daemon-${daemon.Name}-${idx}`}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: daemon.Inactive === 1 ? "#fef2f2" : "#fdf4ff",
                          border: `1px solid ${daemon.Inactive === 1 ? "#fecaca" : "#e9d5ff"}`,
                          borderRadius: "0.375rem",
                          display: "flex",
                          flexDirection: "column",
                          minHeight: "90px",
                        }}
                      >
                        {/* Header with name and badge */}
                        <div style={{ marginBottom: "0.25rem" }}>
                          <div style={{
                            fontWeight: "600",
                            fontSize: "0.8125rem",
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }} title={daemon.Name}>
                            {daemon.Name}
                          </div>
                          <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.125rem" }}>
                            <span style={{
                              fontSize: "0.625rem",
                              padding: "0.0625rem 0.25rem",
                              borderRadius: "9999px",
                              backgroundColor: "#f3e8ff",
                              color: "#7c3aed",
                            }}>
                              Daemon
                            </span>
                            {daemon.Inactive === 1 && (
                              <span style={{
                                fontSize: "0.625rem",
                                padding: "0.0625rem 0.25rem",
                                borderRadius: "9999px",
                                backgroundColor: "#fee2e2",
                                color: "#dc2626",
                              }}>
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        {/* IP and user */}
                        <div style={{ fontSize: "0.6875rem", color: "#6b7280", flex: 1 }}>
                          {daemon.IP && <div style={{ fontFamily: "monospace" }}>{daemon.IP}</div>}
                          {daemon.User && <div>User: {daemon.User}</div>}
                          {/* Startup Notes */}
                          {daemon["Startup Notes"] && (
                            <div style={{
                              marginTop: "0.25rem",
                              padding: "0.25rem",
                              backgroundColor: "#fef3c7",
                              border: "1px solid #fcd34d",
                              borderRadius: "0.25rem",
                              fontSize: "0.625rem",
                              color: "#92400e",
                              lineHeight: "1.3",
                            }} title={daemon["Startup Notes"]}>
                              {daemon["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.375rem" }}>
                          {daemon.IP && (
                            <>
                              <button
                                onClick={() => openRDP(daemon.IP)}
                                style={{
                                  flex: 1,
                                  padding: "0.25rem",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  backgroundColor: "#8b5cf6",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "0.625rem",
                                  fontWeight: "500",
                                }}
                                title="RDP to Daemon"
                              >
                                RDP
                              </button>
                              <button
                                onClick={() => copyToClipboard(daemon.IP)}
                                style={{
                                  padding: "0.25rem 0.375rem",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "0.25rem",
                                  backgroundColor: "white",
                                  color: "#6b7280",
                                  cursor: "pointer",
                                  fontSize: "0.625rem",
                                }}
                                title="Copy IP"
                              >
                                IP
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty state */}
                  {group.vms.length === 0 && group.containers.length === 0 && group.daemons.length === 0 && (
                    <div style={{ textAlign: "center", padding: "1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
                      No VMs, containers, or daemons
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {sortedHosts.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            No VMs, containers, or daemons found{searchTerm ? ` matching "${searchTerm}"` : ""}.
          </div>
        )}
      </div>

      {/* Host Credentials Modal */}
      {selectedHost && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "3em",
            zIndex: 1000,
            overflow: "auto",
          }}
          onClick={() => setSelectedHost(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "calc(100vh - 6em)",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827", margin: 0 }}>
                {selectedHost.Name}
              </h3>
              <button
                onClick={() => setSelectedHost(null)}
                style={{
                  padding: "0.25rem 0.5rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {/* IP Address */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>IP Address</div>
                  <div style={{ fontWeight: "500", fontFamily: "monospace" }}>{selectedHost["IP address"] || "N/A"}</div>
                </div>
                {selectedHost["IP address"] && (
                  <button
                    onClick={() => copyToClipboard(selectedHost["IP address"])}
                    style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Login */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Login</div>
                  <div style={{ fontWeight: "500", fontFamily: "monospace" }}>{selectedHost.Login || "N/A"}</div>
                </div>
                {selectedHost.Login && (
                  <button
                    onClick={() => copyToClipboard(selectedHost.Login)}
                    style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Password */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Password</div>
                  <div style={{ fontWeight: "500", fontFamily: "monospace" }}>
                    {showPasswords.has("main") ? selectedHost.Password || "N/A" : "••••••••"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    onClick={() => togglePassword("main")}
                    style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    {showPasswords.has("main") ? "Hide" : "Show"}
                  </button>
                  {selectedHost.Password && (
                    <button
                      onClick={() => copyToClipboard(selectedHost.Password)}
                      style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              {/* Alt Login */}
              {selectedHost["Alt Login"] && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Alt Login</div>
                    <div style={{ fontWeight: "500", fontFamily: "monospace" }}>{selectedHost["Alt Login"]}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedHost["Alt Login"])}
                    style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Copy
                  </button>
                </div>
              )}

              {/* Alt Password */}
              {selectedHost["Alt Passwd"] && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Alt Password</div>
                    <div style={{ fontWeight: "500", fontFamily: "monospace" }}>
                      {showPasswords.has("alt") ? selectedHost["Alt Passwd"] : "••••••••"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={() => togglePassword("alt")}
                      style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      {showPasswords.has("alt") ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedHost["Alt Passwd"])}
                      style={{ padding: "0.25rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "0.25rem", backgroundColor: "white", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedHost.Description && (
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Description</div>
                  <div style={{ fontSize: "0.875rem" }}>{selectedHost.Description}</div>
                </div>
              )}

              {/* Notes */}
              {selectedHost.Notes && (
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.25rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Notes</div>
                  <div style={{ fontSize: "0.875rem" }}>{selectedHost.Notes}</div>
                </div>
              )}
            </div>

            {/* Quick Connect Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", justifyContent: "center", flexWrap: "wrap" }}>
              {selectedHost["IP address"] && selectedHost["RDP?"] === 1 && (
                <button
                  onClick={() => openRDP(selectedHost["IP address"])}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  RDP
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["VNC?"] === 1 && (
                <button
                  onClick={() => openVNC(selectedHost["IP address"])}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  VNC
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["SSH?"] === 1 && (
                <button
                  onClick={() => openSSH(selectedHost["IP address"], selectedHost.Login)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: "#059669",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  SSH
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["Web?"] === 1 && (
                <button
                  onClick={() => openWebUI(selectedHost["IP address"])}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "none",
                    borderRadius: "0.375rem",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  Web
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
