'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, redirect to home
    fetch('/api/auth/me')
      .then((res) => { if (res.ok) router.replace('/'); })
      .catch(() => {});
  }, [router]);

  async function handleRegister() {
    if (!username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!optRes.ok) {
        const data = await optRes.json();
        setError(data.error ?? 'Failed to get registration options');
        return;
      }
      const options = await optRes.json();

      const attResp = await startRegistration({ optionsJSON: options });

      const verRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), response: attResp }),
      });
      if (!verRes.ok) {
        const data = await verRes.json();
        setError(data.error ?? 'Registration failed');
        return;
      }
      router.push('/');
    } catch (err) {
      setError((err as Error).message ?? 'Registration error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!optRes.ok) {
        const data = await optRes.json();
        setError(data.error ?? 'Failed to get login options');
        return;
      }
      const options = await optRes.json();

      const assertResp = await startAuthentication({ optionsJSON: options });

      const verRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), response: assertResp }),
      });
      if (!verRes.ok) {
        const data = await verRes.json();
        setError(data.error ?? 'Login failed');
        return;
      }
      router.push('/');
    } catch (err) {
      setError((err as Error).message ?? 'Login error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Todo App
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
          Sign in or register with a passkey
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          disabled={loading}
          autoFocus
        />

        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 transition-colors"
          >
            {loading ? '...' : 'Register'}
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white font-medium py-2.5 transition-colors"
          >
            {loading ? '...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
