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
import { Venue, VenueFormData } from '../types/venue';
import sampleVenues from '../../data/seed/venues.json';

const COLLECTION_NAME = 'venues';

export function subscribeToVenues(
  onData: (venues: Venue[]) => void,
  onError?: (error: Error) => void
): () => void {
  const venuesRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    venuesRef,
    (snapshot) => {
      const venues: Venue[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name ?? '',
          lat: Number(data.lat),
          lng: Number(data.lng),
          address: data.address ?? '',
          igUrl: data.igUrl ?? '',
          mapsUrl: data.mapsUrl ?? '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onData(venues);
    },
    (error) => {
      console.error('Error listening to venues snapshot:', error);
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function fetchVenues(): Promise<Venue[]> {
  try {
    const venuesRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(venuesRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name ?? '',
        lat: Number(data.lat),
        lng: Number(data.lng),
        address: data.address ?? '',
        igUrl: data.igUrl ?? '',
        mapsUrl: data.mapsUrl ?? '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  }
}

export async function createVenue(data: VenueFormData, customId?: string): Promise<string> {
  const docId = customId || `venue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const path = `${COLLECTION_NAME}/${docId}`;

  try {
    await setDoc(docRef, {
      name: data.name.trim(),
      lat: Number(data.lat),
      lng: Number(data.lng),
      address: data.address.trim(),
      igUrl: data.igUrl.trim(),
      mapsUrl: data.mapsUrl.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateVenue(id: string, data: Partial<VenueFormData>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.lat !== undefined) updatePayload.lat = Number(data.lat);
    if (data.lng !== undefined) updatePayload.lng = Number(data.lng);
    if (data.address !== undefined) updatePayload.address = data.address.trim();
    if (data.igUrl !== undefined) updatePayload.igUrl = data.igUrl.trim();
    if (data.mapsUrl !== undefined) updatePayload.mapsUrl = data.mapsUrl.trim();

    await updateDoc(docRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVenue(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedSampleVenues(): Promise<number> {
  let seededCount = 0;
  for (const item of sampleVenues) {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    const path = `${COLLECTION_NAME}/${item.id}`;
    try {
      await setDoc(docRef, {
        name: item.name,
        lat: Number(item.lat),
        lng: Number(item.lng),
        address: item.address,
        igUrl: item.igUrl,
        mapsUrl: item.mapsUrl,
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
