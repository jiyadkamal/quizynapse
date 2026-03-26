import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import serviceAccount from '@/../serviceAccountKey.json';

// Type assertion to satisfy TypeScript about the structure of the JSON file.
const cert = serviceAccount as admin.ServiceAccount;

if (!getApps().length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(cert),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();

export { admin, db };
