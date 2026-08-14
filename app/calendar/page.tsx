import CalendarView from '@/components/calendar/CalendarView';

/**
 * Server component so the `?month=` query string is read on the server and
 * handed to the client view as a plain prop. Reading it client-side with
 * `useSearchParams` would require a Suspense boundary around the whole page,
 * which leaves the streamed boundary unhydrated and stops effects running.
 */
export default async function CalendarPage({ searchParams }: PageProps<'/calendar'>) {
  const { month } = await searchParams;
  return <CalendarView monthParam={typeof month === 'string' ? month : null} />;
}
