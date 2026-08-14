/**
 * Seeds Singapore public holidays into the `holidays` table.
 *
 *   npx tsx scripts/seed-holidays.ts
 *
 * Idempotent — re-running updates names in place rather than duplicating rows.
 *
 * IMPORTANT: the lunar- and Islamic-calendar holidays (Chinese New Year, Hari
 * Raya Puasa, Hari Raya Haji, Vesak Day, Deepavali) shift each year and are
 * only fixed once gazetted. Verify these against the Ministry of Manpower's
 * published list before relying on them, and add future years here as they
 * are announced: https://www.mom.gov.sg/employment-practices/public-holidays
 */

// The database is opened directly rather than through `lib/db.ts`: that module
// imports `server-only`, which Next.js aliases at build time but which throws
// in a plain Node process.
import Database from 'better-sqlite3';
import path from 'path';

interface HolidaySeed {
  date: string;
  name: string;
}

const HOLIDAYS: HolidaySeed[] = [
  // 2025
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year' },
  { date: '2025-03-31', name: 'Hari Raya Puasa' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-07', name: 'Hari Raya Haji' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },

  // 2026
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year' },
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

function seed(): void {
  const db = new Database(path.join(process.cwd(), 'todos.db'));

  // The app creates this table on boot, but the script may run against a fresh
  // checkout where the server has never started.
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
  `);

  const upsert = db.prepare(
    `INSERT INTO holidays (date, name) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET name = excluded.name`
  );

  db.transaction(() => {
    for (const holiday of HOLIDAYS) upsert.run(holiday.date, holiday.name);
  })();

  db.close();
  process.stdout.write(`Seeded ${HOLIDAYS.length} Singapore public holidays.\n`);
}

seed();
