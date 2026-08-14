"use client";

import {
    browserSupportsWebAuthn,
    type PublicKeyCredentialCreationOptionsJSON,
    type PublicKeyCredentialRequestOptionsJSON,
    startAuthentication,
    startRegistration
} from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.ok) {
          router.replace("/");
          return;
        }
      } catch {
        setError("Unable to verify session. Please try again.");
      }

      setCheckingSession(false);
    })();
  }, [router]);

  async function requestJson<T>(
    url: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & T;

    if (!response.ok) {
      throw new Error(payload.error ?? "Request failed");
    }

    return payload;
  }

  function getWebAuthnErrorMessage(cause: unknown): string {
    if (cause instanceof Error && cause.name === "NotAllowedError") {
      return "Passkey prompt was cancelled. You can retry.";
    }

    if (!browserSupportsWebAuthn()) {
      return "This browser or device does not support passkeys.";
    }

    if (cause instanceof Error) {
      return cause.message;
    }

    return "Authentication failed";
  }

  async function handleRegister(): Promise<void> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      setError("Username is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options = await requestJson<PublicKeyCredentialCreationOptionsJSON>(
        "/api/auth/register-options",
        { username: normalizedUsername }
      );

      const attestation = await startRegistration({ optionsJSON: options });

      await requestJson<{ success: boolean }>("/api/auth/register-verify", {
        username: normalizedUsername,
        response: attestation
      });

      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(getWebAuthnErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(): Promise<void> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      setError("Username is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options = await requestJson<PublicKeyCredentialRequestOptionsJSON>(
        "/api/auth/login-options",
        { username: normalizedUsername }
      );

      const assertion = await startAuthentication({ optionsJSON: options });

      await requestJson<{ success: boolean }>("/api/auth/login-verify", {
        username: normalizedUsername,
        response: assertion
      });

      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(getWebAuthnErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <p className="text-sm text-slate-600">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Passkey sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Register or log in with your passkey. No password required.
        </p>
        <label className="mt-5 grid gap-1 text-sm">
          <span>Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="yourname"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-0 focus:border-blue-500"
          />
        </label>
        {error ? (
          <p className="mt-4 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              void handleRegister();
            }}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : "Register"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleLogin();
            }}
            disabled={loading}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : "Login"}
          </button>
        </div>
      </section>
    </main>
  );
}
