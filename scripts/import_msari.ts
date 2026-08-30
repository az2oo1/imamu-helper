import { importMsariData } from '../src/server/services/msari';

export { importMsariData };

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('import_msari')) {
  importMsariData()
    .then(res => {
      console.log('[Import Result]', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Import Error]', err);
      process.exit(1);
    });
}
