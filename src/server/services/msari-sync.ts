import { importMsariData } from './msari';

let syncIntervalHandle: NodeJS.Timeout | null = null;

export function startMsariSync() {
  if (process.env.NODE_ENV === 'test') return;

  console.log('[Msari Sync] Initiating automatic background sync from Msari...');
  importMsariData()
    .then(res => console.log('[Msari Sync] Startup sync completed:', res))
    .catch(err => console.error('[Msari Sync] Startup sync notice:', err.message || err));

  // Schedule periodic re-sync every 12 hours
  if (!syncIntervalHandle) {
    syncIntervalHandle = setInterval(() => {
      console.log('[Msari Sync] Running periodic background sync from Msari...');
      importMsariData()
        .then(res => console.log('[Msari Sync] Periodic sync completed:', res))
        .catch(err => console.error('[Msari Sync] Periodic sync error:', err.message || err));
    }, 12 * 60 * 60 * 1000);
    // Unref timer so it doesn't block process exit
    if (syncIntervalHandle.unref) syncIntervalHandle.unref();
  }
}

export function stopMsariSync() {
  if (syncIntervalHandle) {
    clearInterval(syncIntervalHandle);
    syncIntervalHandle = null;
    console.log('[Msari Sync] Background sync timer stopped.');
  }
}

