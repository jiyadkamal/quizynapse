import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

/**
 * Firebase Admin initialization.
 * 
 * We avoid importing serviceAccountKey.json directly to prevent build errors 
 * in CI/CD environments (like Netlify) where the file is (correctly) gitignored.
 */
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
  try {
    if (projectId && clientEmail && privateKey) {
      // Use environment variables (Production/Netlify)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      // Fallback to local file (Local Development only)
      // We use require inside a try-catch to prevent build-time failures if the file is missing
      const serviceAccount = require('../../serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

const db = admin.firestore();

export { admin, db };

