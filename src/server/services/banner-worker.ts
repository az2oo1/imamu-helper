import { sql, eq } from 'drizzle-orm';
import { banner_terms } from '../../db/schema';
import { syncTermFromBanner, checkTermChangesAndSeats } from './banner-service';

export function startPeriodicBannerSync(db: any) {
  if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
    return;
  }

  const runWorker = async () => {
    try {
      const activeTerms = await db.select().from(banner_terms);

      for (const term of activeTerms) {
        // 1. Regular full update if autoUpdate is enabled
        if (term.autoUpdate) {
          const intervalMs = (term.updateIntervalDays || 2) * 24 * 60 * 60 * 1000;
          const lastSync = term.lastSyncAt ? new Date(term.lastSyncAt).getTime() : 0;
          const now = Date.now();

          if (now - lastSync >= intervalMs && term.status !== 'syncing') {
            console.log(`[Banner Worker] Starting scheduled sync for term ${term.termCode} (${term.termName})...`);
            try {
              await syncTermFromBanner(term.termCode, term.termName, db, term.academicYear, term.semester);
              console.log(`[Banner Worker] Scheduled sync completed for term ${term.termCode}.`);
            } catch (err: any) {
              console.error(`[Banner Worker] Error syncing term ${term.termCode}:`, err.message);
            }
          }
        }

        // 2. Monitoring changes & live seats if monitorChanges is enabled
        if (term.monitorChanges && term.status !== 'syncing') {
          const checkIntervalMs = 60 * 60 * 1000; // Check hourly
          const lastCheck = term.lastCheckAt ? new Date(term.lastCheckAt).getTime() : 0;
          const now = Date.now();

          if (now - lastCheck >= checkIntervalMs) {
            console.log(`[Banner Worker] Checking live changes for term ${term.termCode}...`);
            try {
              const res = await checkTermChangesAndSeats(term.termCode, db);
              console.log(`[Banner Worker] Checked term ${term.termCode}: updated ${res.updatedCount} sections.`);
            } catch (err: any) {
              console.error(`[Banner Worker] Error checking changes for term ${term.termCode}:`, err.message);
            }
          }
        }
      }
    } catch (e: any) {
      console.error('[Banner Worker Error]', e.message || e);
    }
  };

  // Run initial check after 15 seconds, then every 30 minutes
  setTimeout(runWorker, 15000);
  setInterval(runWorker, 30 * 60 * 1000);
}
