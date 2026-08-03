import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Department, Employee, KPI, Evaluation, User, Goal, SelfAppraisal, FeedbackRequest } from '../types';

export const COLLECTIONS = {
  departments: 'departments',
  employees: 'employees',
  kpis: 'kpis',
  evaluations: 'evaluations',
  users: 'users',
  goals: 'goals',
  selfAppraisals: 'selfAppraisals',
  feedbackRequests: 'feedbackRequests',
};

// Helper to clean objects for Firestore by stripping undefined values
export function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeForFirestore);

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned;
}

// Helper to write a record to Firestore asynchronously without blocking local state
export async function saveDocument<T extends { id: string }>(collName: string, item: T): Promise<void> {
  try {
    const ref = doc(db, collName, item.id);
    const cleanItem = sanitizeForFirestore(item);
    await setDoc(ref, cleanItem, { merge: true });
  } catch (err) {
    console.error(`Error saving document to Firestore [${collName}/${item.id}]:`, err);
  }
}

export async function deleteDocument(collName: string, id: string): Promise<void> {
  try {
    const ref = doc(db, collName, id);
    await deleteDoc(ref);
  } catch (err) {
    console.error(`Error deleting document from Firestore [${collName}/${id}]:`, err);
  }
}

export async function batchSaveDocuments<T extends { id: string }>(collName: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  try {
    // Firestore batch supports up to 500 writes
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const ref = doc(db, collName, item.id);
        batch.set(ref, sanitizeForFirestore(item), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error(`Error batch saving documents to Firestore [${collName}]:`, err);
  }
}

export async function fetchAllCollection<T>(collName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collName));
    const list: T[] = [];
    snap.forEach((d) => {
      list.push(d.data() as T);
    });
    return list;
  } catch (err) {
    console.error(`Error fetching collection [${collName}]:`, err);
    return [];
  }
}

export function subscribeToCollection<T>(collName: string, callback: (items: T[]) => void) {
  return onSnapshot(
    collection(db, collName),
    (snap) => {
      const list: T[] = [];
      snap.forEach((d) => list.push(d.data() as T));
      callback(list);
    },
    (err) => {
      console.error(`Snapshot error for collection [${collName}]:`, err);
    }
  );
}
