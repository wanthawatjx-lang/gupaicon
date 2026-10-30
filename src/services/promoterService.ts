import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Promoter, PromoterFormData } from '../types/promoter';
import samplePromoters from '../../data/seed/promoters.json';

const COLLECTION_NAME = 'promoters';

export function subscribeToPromoters(
  onData: (promoters: Promoter[]) => void,
  onError?: (error: Error) => void
): () => void {
  const promotersRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    promotersRef,
    (snapshot) => {
      const promoters: Promoter[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name ?? '',
          igUrl: data.igUrl ?? '',
          verified: Boolean(data.verified),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onData(promoters);
    },
    (error) => {
      console.error('Error listening to promoters:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function fetchPromoters(): Promise<Promoter[]> {
  try {
    const promotersRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(promotersRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name ?? '',
        igUrl: data.igUrl ?? '',
        verified: Boolean(data.verified),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  }
}

export async function createPromoter(data: PromoterFormData, customId?: string): Promise<string> {
  const docId = customId || `promoter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const path = `${COLLECTION_NAME}/${docId}`;

  try {
    const payload: Record<string, any> = {
      name: data.name.trim().slice(0, 80),
      verified: Boolean(data.verified),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (data.igUrl && data.igUrl.trim()) {
      payload.igUrl = data.igUrl.trim().slice(0, 300);
    }
    await setDoc(docRef, payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePromoter(id: string, data: Partial<PromoterFormData>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (data.name !== undefined) payload.name = data.name.trim().slice(0, 80);
    if (data.igUrl !== undefined) {
      if (data.igUrl.trim()) {
        payload.igUrl = data.igUrl.trim().slice(0, 300);
      } else {
        payload.igUrl = '';
      }
    }
    if (data.verified !== undefined) payload.verified = Boolean(data.verified);

    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePromoter(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedSamplePromoters(): Promise<number> {
  let seededCount = 0;
  for (const item of samplePromoters) {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    const path = `${COLLECTION_NAME}/${item.id}`;
    try {
      await setDoc(docRef, {
        name: item.name,
        igUrl: item.igUrl,
        verified: item.verified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      seededCount++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  return seededCount;
}
