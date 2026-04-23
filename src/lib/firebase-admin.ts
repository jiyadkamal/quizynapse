import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import serviceAccount from '@/../serviceAccountKey.json';

// Type assertion to satisfy TypeScript about the structure of the JSON file.
const cert = serviceAccount as admin.ServiceAccount;

// Use the same project as the client-side Firebase config to avoid
// reading from one project and writing to another.
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || serviceAccount.project_id;

if (!getApps().length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(cert),
      projectId: projectId,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();

export { admin, db };

