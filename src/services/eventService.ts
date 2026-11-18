import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ConcertEvent, EventFormData, EventStatus } from '../types/event';
import sampleEvents from '../../data/seed/events.json';

const COLLECTION_NAME = 'events';

export async function fetchEvents(): Promise<ConcertEvent[]> {
  try {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000));
    const eventsQuery = query(
      collection(db, COLLECTION_NAME),
      where('startAt', '>=', cutoff),
      orderBy('startAt', 'asc'),
      limit(60)
    );
    const snapshot = await getDocs(eventsQuery);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title ?? '',
        artists: Array.isArray(data.artists) ? data.artists : [],
        venueId: data.venueId ?? '',
        promoterId: data.promoterId ?? '',
        startAt: data.startAt,
        priceText: data.priceText ?? '',
        genres: Array.isArray(data.genres) ? data.genres : [],
        ticketUrl: data.ticketUrl ?? '',
        igPostUrl: data.igPostUrl ?? '',
        posterUrl: data.posterUrl ?? '',
        status: (data.status as EventStatus) || 'not_open',
        statusUpdatedAt: data.statusUpdatedAt || data.createdAt,
        statusSource: data.statusSource === 'organizer' ? 'organizer' : 'admin',
        origin: data.origin,
        sourceUrl: data.sourceUrl ?? '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
  }
}

export async function createEvent(
  data: EventFormData,
  customId?: string,
  statusSource: 'admin' | 'organizer' = 'admin'
): Promise<string> {
  const docId = customId || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const path = `${COLLECTION_NAME}/${docId}`;

  const startDate = new Date(data.startAtIso);
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid event start date.');
  }
  const startTimestamp = Timestamp.fromDate(startDate);

  try {
    const payload: Record<string, any> = {
      title: data.title.trim().slice(0, 120),
      artists: data.artists.map((a) => a.trim()).filter(Boolean).slice(0, 20),
      venueId: data.venueId.trim(),
      startAt: startTimestamp,
      priceText: (data.priceText.trim() || 'Free Entry').slice(0, 60),
      genres: data.genres.map((g) => g.trim()).filter(Boolean).slice(0, 8),
      status: data.status,
      statusUpdatedAt: serverTimestamp(),
      statusSource,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (data.promoterId && data.promoterId.trim()) {
      payload.promoterId = data.promoterId.trim();
    }
    if (data.ticketUrl && data.ticketUrl.trim()) {
      payload.ticketUrl = data.ticketUrl.trim();
    }
    if (data.igPostUrl && data.igPostUrl.trim()) {
      payload.igPostUrl = data.igPostUrl.trim();
    }
    if (data.posterUrl && data.posterUrl.trim()) {
      payload.posterUrl = data.posterUrl.trim();
    }

    await setDoc(docRef, payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEvent(
  id: string,
  data: Partial<EventFormData>,
  statusSource: 'admin' | 'organizer' = 'admin'
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    const payload: Record<string, any> = {
      updatedAt: serverTimestamp(),
      statusSource,
    };

    if (data.title !== undefined) payload.title = data.title.trim().slice(0, 120);
    if (data.artists !== undefined)
      payload.artists = data.artists.map((a) => a.trim()).filter(Boolean).slice(0, 20);
    if (data.venueId !== undefined) payload.venueId = data.venueId.trim();
    if (data.promoterId !== undefined) {
      if (data.promoterId.trim()) {
        payload.promoterId = data.promoterId.trim();
      } else {
        payload.promoterId = '';
      }
    }
    if (data.startAtIso !== undefined) {
      const startDate = new Date(data.startAtIso);
      if (!isNaN(startDate.getTime())) {
        payload.startAt = Timestamp.fromDate(startDate);
      }
    }
    if (data.priceText !== undefined) payload.priceText = data.priceText.trim().slice(0, 60);
    if (data.genres !== undefined)
      payload.genres = data.genres.map((g) => g.trim()).filter(Boolean).slice(0, 8);
    if (data.ticketUrl !== undefined) payload.ticketUrl = data.ticketUrl.trim();
    if (data.igPostUrl !== undefined) payload.igPostUrl = data.igPostUrl.trim();
    if (data.posterUrl !== undefined) payload.posterUrl = data.posterUrl.trim();

    if (data.status !== undefined) {
      payload.status = data.status;
      payload.statusUpdatedAt = serverTimestamp();
    }

    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * One-tap quick status update with serverTimestamp
 */
export async function updateEventStatus(
  id: string,
  newStatus: EventStatus,
  statusSource: 'admin' | 'organizer' = 'admin'
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    await updateDoc(docRef, {
      status: newStatus,
      statusUpdatedAt: serverTimestamp(),
      statusSource,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

const SAMPLE_DAY_OFFSETS = [3, 5, 8, 12, 20];

function getRelativeSampleStartDate(index: number, baseNowMs: number): Date {
  const offsetDays = SAMPLE_DAY_OFFSETS[index] ?? 3 + index * 4;
  const bkkNow = new Date(baseNowMs + 7 * 60 * 60 * 1000);
  const targetBkk = new Date(
    Date.UTC(bkkNow.getUTCFullYear(), bkkNow.getUTCMonth(), bkkNow.getUTCDate() + offsetDays)
  );
  const yyyy = targetBkk.getUTCFullYear();
  const mm = String(targetBkk.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetBkk.getUTCDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T19:00:00+07:00`);
}

export async function seedSampleEvents(): Promise<number> {
  let seededCount = 0;
  const baseNowMs = Date.now();
  for (let i = 0; i < sampleEvents.length; i++) {
    const item = sampleEvents[i];
    const docRef = doc(db, COLLECTION_NAME, item.id);
    const path = `${COLLECTION_NAME}/${item.id}`;

    const startDate = getRelativeSampleStartDate(i, baseNowMs);
    const startTimestamp = Timestamp.fromDate(startDate);

    try {
      const payload: Record<string, any> = {
        title: item.title,
        artists: item.artists,
        venueId: item.venueId,
        startAt: startTimestamp,
        priceText: item.priceText,
        genres: item.genres,
        status: item.status,
        statusUpdatedAt: serverTimestamp(),
        statusSource: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (item.promoterId) payload.promoterId = item.promoterId;
      if (item.ticketUrl) payload.ticketUrl = item.ticketUrl;
      if (item.igPostUrl) payload.igPostUrl = item.igPostUrl;
      if (item.posterUrl) payload.posterUrl = item.posterUrl;

      await setDoc(docRef, payload);
      seededCount++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  return seededCount;
}
