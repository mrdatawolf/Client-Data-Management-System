"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if auth is disabled via runtime config
        const configRes = await fetch("/api/config");
        const config = await configRes.json();

        if (config.authDisabled) {
          // Auth disabled - go directly to dashboard
          router.push("/dashboard");
          return;
        }

        // Check if user has valid session via /api/auth/me
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          // Session valid - go to dashboard
          router.push("/dashboard");
        } else {
          // No valid session - go to login
          router.push("/login");
        }
      } catch {
        // On error, default to login
        router.push("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-700 dark:text-gray-300">Redirecting...</p>
    </div>
  );
}
