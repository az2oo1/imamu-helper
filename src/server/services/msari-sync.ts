import { importMsariData } from '../../../scripts/import_msari';

export function startMsariSync() {
  if (process.env.NODE_ENV === 'test') return;

  console.log('[Msari Sync] Initiating automatic background sync from Msari...');
  importMsariData()
    .then(res => console.log('[Msari Sync] Startup sync completed:', res))
    .catch(err => console.error('[Msari Sync] Startup sync notice:', err.message || err));

  // Schedule periodic re-sync every 12 hours
  setInterval(() => {
    console.log('[Msari Sync] Running periodic background sync from Msari...');
    importMsariData()
      .then(res => console.log('[Msari Sync] Periodic sync completed:', res))
      .catch(err => console.error('[Msari Sync] Periodic sync error:', err.message || err));
  }, 12 * 60 * 60 * 1000);
}
