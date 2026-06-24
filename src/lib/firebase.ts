import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json'; // using the JSON

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
