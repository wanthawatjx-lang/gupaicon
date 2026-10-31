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
import { Source, SourceFormData } from '../types/source';

const COLLECTION_NAME = 'sources';

export function subscribeToSources(
  onData: (sources: Source[]) => void,
  onError?: (error: Error) => void
): () => void {
  const ref = collection(db, COLLECTION_NAME);

  return onSnapshot(
    ref,
    (snapshot) => {
      const items: Source[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name ?? '',
          type: data.type ?? 'search_query',
          value: data.value ?? '',
          venueId: data.venueId || undefined,
          active: data.active ?? true,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onData(items);
    },
    (error) => {
      console.error('Error listening to sources snapshot:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function createSource(data: SourceFormData): Promise<string> {
  const docId = `src_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const path = `${COLLECTION_NAME}/${docId}`;

  try {
    await setDoc(docRef, {
      name: data.name.trim(),
      type: data.type,
      value: data.value.trim(),
      venueId: data.venueId || null,
      active: data.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSource(id: string, data: Partial<SourceFormData>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    const payload: any = { updatedAt: serverTimestamp() };
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.type !== undefined) payload.type = data.type;
    if (data.value !== undefined) payload.value = data.value.trim();
    if (data.venueId !== undefined) payload.venueId = data.venueId || null;
    if (data.active !== undefined) payload.active = data.active;

    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSource(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedSampleSources(): Promise<number> {
  const sampleSources: Omit<Source, 'id'>[] = [
    {
      name: 'SAMPLE: Bangkok Indie Rock Concerts',
      type: 'search_query',
      value: 'indie rock concerts bangkok livehouse 2026 upcoming',
      active: true,
    },
    {
      name: 'SAMPLE: Pathum Thani / Rangsit Live Gigs',
      type: 'search_query',
      value: 'live music gig rangsit pathum thani concert upcoming',
      active: true,
    },
  ];

  let count = 0;
  for (const src of sampleSources) {
    const docId = `src_sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, {
      ...src,
      venueId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count++;
  }
  return count;
}
