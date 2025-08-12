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

function cleanForFirestore(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    // Handle special cases
    if (obj.$oid) return obj.$oid;
    if (obj.$date) return new Date(obj.$date);
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and undefined values
      if (value !== undefined && typeof value !== 'function') {
        try {
          const cleanedValue = cleanForFirestore(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        } catch (error) {
          console.log(`Skipping problematic field ${key}:`, error.message);
        }
      }
    }
    return cleaned;
  }
  
  return undefined;
}

async function processLine(line, count, filePath, collectionName) {
  
    if (!line.trim()) return;
    try {
      console.log(count);
      const raw = JSON.parse(line);
    const docId = raw._id && raw._id.$oid ? raw._id.$oid : undefined;
    if (docId === '6899f46b9657db26685f43ce') {
      debugger;
    }
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
      if (createdAtDate && createdAtDate.getMonth() < 6) {
        return;
      }
    }
    if (docId) delete data._id;
    data.userId = 'xSzJt5Mv4QQecP1eqvsakrnNKFJ2'
    
    // Clean data for Firestore
    const cleanedData = cleanForFirestore(data);
    if (!cleanedData) {
      console.log('Skipping document with no valid data');
      return;
    }
    
    // Special handling for simulations: variations as subcollection
    if (collectionName === 'simulations' && Array.isArray(cleanedData.variations)) {
      const variations = cleanedData.variations.slice(0, 100).map(cleanForFirestore).filter(v => v);
      delete cleanedData.variations;
      // Write the main simulation document
      await db.collection(collectionName).doc(docId || undefined).set(cleanedData, { merge: false });
      console.log('simulations', docId);
      // Write each variation as a subcollection document
      if (docId) {
        const variationsRef = db.collection(collectionName).doc(docId).collection('variations');
        console.log('variations', docId, variations.length);
        for (let i = 0; i < variations.length; i++) {
          console.log('variation', i, docId);
          
          try {
            const variationData = variations[i];
            // Additional validation for variation data
            if (!variationData || typeof variationData !== 'object' || Array.isArray(variationData)) {
              console.log(`Skipping invalid variation ${i}:`, typeof variationData);
              continue;
            }
            
            // Ensure it's a plain object
            const plainVariation = JSON.parse(JSON.stringify(variationData));
            await variationsRef.doc(i.toString()).set(plainVariation, { merge: false });
          } catch (variationError) {
            console.error(`Error writing variation ${i} for doc ${docId}:`, variationError);
            console.error('Variation data:', JSON.stringify(variations[i], null, 2));
            continue; // Skip this variation and continue with the next one
          }
        }
      }
      count++;
      return;
    } else {
      // Overwrite existing document
      await db.collection(collectionName).doc(docId || undefined).set(cleanedData, { merge: false });
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
      promises.push(processLine(line, count++, filePath, collectionName));
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
