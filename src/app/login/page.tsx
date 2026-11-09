"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginConfig {
  fallbackAdminEnabled: boolean;
  orchestratorLoginUrl: string | null;
}

/** Shared-domain SSO landing page with an optional break-glass disclosure. */
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const [offDomain, setOffDomain] = useState(false);

  function rememberUser(user: unknown) {
    try {
      localStorage.setItem("user", JSON.stringify(user));
    } catch {
      // Display caching is optional; the server cookie authenticates requests.
    }
  }

  useEffect(() => {
    let active = true;
    const hostname = window.location.hostname;
    setOffDomain(
      hostname !== "biztechro.com" && !hostname.endsWith(".biztechro.com"),
    );

    async function initialize() {
      await Promise.all([
        (async () => {
          try {
            const response = await fetch("/api/config", { cache: "no-store" });
            if (!response.ok) throw new Error("Configuration unavailable");
            const data = await response.json();
            if (!active) return;
            setConfig(data);
            if (data.authDisabled) router.push("/dashboard");
          } catch {
            if (active)
              setError("Unable to load sign-in configuration. Please reload.");
          }
        })(),
        (async () => {
          try {
            const response = await fetch("/api/auth/me", { cache: "no-store" });
            if (response.status !== 200) return;
            const data = await response.json();
            if (!active) return;
            rememberUser(data.user);
            router.push("/dashboard");
          } catch {
            // Remain on the landing page; Continue allows another attempt.
          }
        })(),
      ]);
      if (active) setInitializing(false);
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleContinue() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status !== 200) throw new Error("Not signed in");
      const data = await response.json();
      rememberUser(data.user);
      router.push("/dashboard");
    } catch {
      setError("Still not signed in");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || initializing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Session cookie is set by the server automatically
      // Store user for display purposes only
      rememberUser(data.user);
      router.push("/dashboard");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Client Data Management System
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to access the system
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {initializing && <p role="status">Loading sign-in options...</p>}
          {config?.orchestratorLoginUrl ? (
            <a
              href={config.orchestratorLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Sign in with BT Auth
            </a>
          ) : (
            config && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                BT Auth sign-in is not configured.
              </p>
            )
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            After signing in, return here and select Continue.
          </p>
          {offDomain && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
              BT Auth sign-in only works at the CDMS biztechro.com address.
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleContinue}
            className="w-full rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-900 dark:border-gray-600 dark:text-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        </div>

        {config?.fallbackAdminEnabled && (
          <details className="mt-6 text-gray-900 dark:text-gray-100">
            <summary className="cursor-pointer rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
              Emergency admin sign-in
            </summary>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={busy}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={busy}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {loading ? "Logging in..." : "Sign In"}
              </button>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}
