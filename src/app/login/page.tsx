"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Client Data Management System
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Enter your credentials to access the system
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          {error && (
            <div style={{ fontSize: '0.875rem', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', padding: '0.75rem' }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? "Logging in..." : "Sign In"}
          </button>
        </form>
        
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>Default credentials:</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
