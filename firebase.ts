import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: ReturnType<typeof getFirestore>;

// Initialize Firebase Admin
const dbPromise = (async () => {
  const serviceAccount = JSON.parse(
    await readFile(join(__dirname, 'tradevision.json'), 'utf-8')
  );

  const app = initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore(app);
  return db;
})();

export { db, dbPromise }; 