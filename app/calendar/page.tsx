import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CalendarView } from "@/components/CalendarView";
import { getSession } from "@/lib/auth";

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 p-6 text-slate-600">
          Loading calendar...
        </main>
      }
    >
      <CalendarView />
    </Suspense>
  );
}
