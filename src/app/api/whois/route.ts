import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import dns from "dns";

const execFileAsync = promisify(execFile);
const resolve4 = promisify(dns.resolve4);
const reverse = promisify(dns.reverse);

// Strict domain validation: only alphanumeric, dots, hyphens, max 253 chars
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Known hosting/DNS providers by reverse DNS patterns
const PROVIDER_PATTERNS: [RegExp, string][] = [
  [/cloudflare/i, "Cloudflare"],
  [/amazonaws\.com/i, "AWS"],
  [/googleusercontent\.com/i, "Google Cloud"],
  [/azure/i, "Microsoft Azure"],
  [/digitalocean/i, "DigitalOcean"],
  [/linode/i, "Linode"],
  [/vultr/i, "Vultr"],
  [/ovh/i, "OVH"],
  [/hetzner/i, "Hetzner"],
  [/godaddy/i, "GoDaddy"],
  [/bluehost/i, "Bluehost"],
  [/hostgator/i, "HostGator"],
  [/siteground/i, "SiteGround"],
  [/wpengine/i, "WP Engine"],
  [/squarespace/i, "Squarespace"],
  [/shopify/i, "Shopify"],
  [/wix/i, "Wix"],
  [/netlify/i, "Netlify"],
  [/vercel/i, "Vercel"],
  [/fastly/i, "Fastly"],
  [/akamai/i, "Akamai"],
];

function identifyProvider(hostname: string): string | null {
  for (const [pattern, name] of PROVIDER_PATTERNS) {
    if (pattern.test(hostname)) return name;
  }
  return null;
}

// Extract the registrable domain from a name server hostname
// e.g., "ns1.name.com" → "name.com", "dns1.p05.nsone.net" → "nsone.net"
function extractNsDomain(nameServers: string[]): string {
  if (nameServers.length === 0) return "";
  const ns = nameServers[0].toLowerCase().replace(/\.$/, "");
  const parts = ns.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return ns;
}

/**
 * GET /api/whois?action=check
 * GET /api/whois?action=lookup&domain=example.com
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "check") {
    return handleCheck();
  } else if (action === "lookup") {
    const domain = searchParams.get("domain");
    return handleLookup(domain);
  }

  return NextResponse.json({ error: "Invalid action. Use 'check' or 'lookup'." }, { status: 400 });
}

async function handleCheck(): Promise<NextResponse> {
  try {
    await execFileAsync("where", ["whois"]);
    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ available: false });
  }
}

async function handleLookup(domain: string | null): Promise<NextResponse> {
  if (!domain) {
    return NextResponse.json({ error: "Domain parameter required" }, { status: 400 });
  }

  // Validate domain
  if (domain.length > 253 || !DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: "Invalid domain name" }, { status: 400 });
  }

  const result: {
    registrar: string;
    dnsHost: string;
    nameServers: string[];
    websiteHost: string;
    websiteIP: string;
  } = {
    registrar: "",
    dnsHost: "",
    nameServers: [],
    websiteHost: "",
    websiteIP: "",
  };

  // Run whois lookup
  try {
    // Sysinternals whois requires accepting EULA; -v suppresses banner, -nobanner if available
    // Using -accepteula to auto-accept the EULA on first run
    const { stdout } = await execFileAsync("whois", ["-v", "-accepteula", domain], {
      timeout: 15000,
    });

    // Parse registrar - collect all matches, prefer the last one
    // WHOIS output often has "Registrar:" in both the registry section
    // (which may show a reseller/sub-registrar) and the detailed section
    // (which shows the actual registrar). The last match is typically correct.
    const registrarMatches = [...stdout.matchAll(/^\s*Registrar:\s*(.+)/gim)];
    if (registrarMatches.length > 0) {
      result.registrar = registrarMatches[registrarMatches.length - 1][1].trim();
    }

    // Parse name servers
    const nsMatches = stdout.matchAll(/Name Server:\s*(.+)/gi);
    for (const match of nsMatches) {
      const ns = match[1].trim().toLowerCase();
      if (ns && !result.nameServers.includes(ns)) {
        result.nameServers.push(ns);
      }
    }

    // DNS Host = the registrable domain of the name servers (e.g., "name.com")
    if (result.nameServers.length > 0) {
      result.dnsHost = extractNsDomain(result.nameServers);
    }
  } catch (error: any) {
    console.error("Whois lookup failed:", error.message);
    // Continue — we can still try DNS lookup
  }

  // DNS A-record lookup + reverse for website host
  try {
    const ips = await resolve4(domain);
    if (ips.length > 0) {
      result.websiteIP = ips[0];

      // Reverse lookup to identify hosting provider
      try {
        const hostnames = await reverse(ips[0]);
        if (hostnames.length > 0) {
          const provider = identifyProvider(hostnames[0]);
          if (provider) {
            result.websiteHost = provider;
          } else {
            // Use the registrable domain from the reverse hostname
            const parts = hostnames[0].replace(/\.$/, "").split(".");
            if (parts.length >= 2) {
              result.websiteHost = parts.slice(-2).join(".");
            }
          }
        }
      } catch {
        // Reverse lookup failed — IP has no PTR record, leave websiteHost empty
      }
    }
  } catch (error: any) {
    console.error("DNS lookup failed:", error.message);
  }

  return NextResponse.json(result);
}
