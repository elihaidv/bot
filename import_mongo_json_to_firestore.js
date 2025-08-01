import { readFile } from "fs/promises";
import { createReadStream } from "fs";
import { join, basename } from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readdir } from 'fs/promises';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firestore initialization (reuse firebase.ts logic)
const serviceAccount = JSON.parse(
  await readFile(join(__dirname, 'tradevision.json'), 'utf-8')
);
const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

function fixMongoTypes(obj) {
  if (Array.isArray(obj)) {
    return obj.map(fixMongoTypes);
  } else if (obj && typeof obj === 'object') {
    // Convert _id: { $oid: ... } to string
    if (obj.$oid) return obj.$oid;
    if (obj.$date) return new Date(obj.$date);
    const out = {};
    for (const k in obj) {
      out[k] = fixMongoTypes(obj[k]);
    }
    return out;
  } else {
    return obj;
  }
}

async function processLine(line, count, filePath, collectionName) {
  
    if (!line.trim()) return;
    try {
      console.log(count);
      const raw = JSON.parse(line);
    const docId = raw._id && raw._id.$oid ? raw._id.$oid : undefined;
    const data = fixMongoTypes(raw);
    // Skip records with created_at before 2025
    if (data.created_at) {
      let createdAtDate;
      if (data.created_at instanceof Date) {
        createdAtDate = data.created_at;
      } else if (typeof data.created_at === 'string' || typeof data.created_at === 'number') {
        createdAtDate = new Date(data.created_at);
      } else if (data.created_at && data.created_at.$date) {
        createdAtDate = new Date(data.created_at.$date);
      }
      if (createdAtDate && createdAtDate.getFullYear() < 2025) {
        return;
      }
    }
    if (docId) delete data._id;
    // Special handling for simulations: variations as subcollection
    if (collectionName === 'simulations' && Array.isArray(data.variations)) {
      const variations = data.variations;
      delete data.variations;
      // Write the main simulation document
      await db.collection(collectionName).doc(docId || undefined).set(data, { merge: false });
      console.log('simulations', docId);
      // Write each variation as a subcollection document
      if (docId) {
        const variationsRef = db.collection(collectionName).doc(docId).collection('variations');
        console.log('variations', docId, variations.length);
        for (let i = 0; i < variations.length; i++) {
          console.log('variation', i, docId);

          await variationsRef.doc(i.toString()).set(variations[i], { merge: false });
        }
      }
      count++;
      return;
    } else {
      // Overwrite existing document
      await db.collection(collectionName).doc(docId || undefined).set(data, { merge: false });
      count++;
    }
    
  } catch (e) {
    console.error(`Error in ${filePath}:`, e, '\nLine:',);
    

  }
}

async function importFile(filePath, collectionName) {
  const promises = [];

    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });
    let count = 0;
    rl.on('line', async (line) => {
      promises.push(processLine(line, count, filePath, collectionName));
  });
  rl.on('close', () => {
    console.log(`Imported ${count} docs into ${collectionName}`);
   
  });
  rl.on('error', (e) => {
    console.error(e);
    process.exit(1);
  });
  return new Promise((resolve, reject) => {
  setTimeout(() => {
    Promise.all(promises).then(() => {
      resolve();
      console.log('All imports complete.');
      process.exit(0);
    });
  }, 10000);
  });
}

async function main() {
  const dumpDir = join(__dirname, 'dump');
  const files = (await readdir(dumpDir)).filter(f => f.endsWith('simulations.json'));
  for (const file of files) {
    const collectionName = basename(file, '.json');
    await importFile(join(dumpDir, file), collectionName);
  }
  console.log('All imports complete.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
