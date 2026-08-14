"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  readonly className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleLogout();
      }}
      disabled={loggingOut}
      className={className}
    >
      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}
