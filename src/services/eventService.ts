import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ConcertEvent, EventFormData, EventStatus } from '../types/event';
import sampleEvents from '../../data/seed/events.json';

const COLLECTION_NAME = 'events';

export function subscribeToEvents(
  onData: (events: ConcertEvent[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Read with order and limit to protect Firebase free tier quota (Requirement 9)
  const eventsQuery = query(
    collection(db, COLLECTION_NAME),
    orderBy('startAt', 'asc'),
    limit(80)
  );

  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const events: ConcertEvent[] = snapshot.docs.map((docSnap) => {
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
          statusSource: (data.statusSource as 'admin' | 'organizer') || 'admin',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      onData(events);
    },
    (error) => {
      console.error('Error listening to events query:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function fetchEvents(): Promise<ConcertEvent[]> {
  try {
    const eventsQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('startAt', 'asc'),
      limit(80)
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
        statusSource: (data.statusSource as 'admin' | 'organizer') || 'admin',
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
  const startTimestamp = isNaN(startDate.getTime())
    ? Timestamp.now()
    : Timestamp.fromDate(startDate);

  try {
    const payload: Record<string, any> = {
      title: data.title.trim(),
      artists: data.artists.map((a) => a.trim()).filter(Boolean),
      venueId: data.venueId.trim(),
      promoterId: data.promoterId.trim(),
      startAt: startTimestamp,
      priceText: data.priceText.trim() || 'Free Entry',
      genres: data.genres.map((g) => g.trim()).filter(Boolean),
      ticketUrl: data.ticketUrl.trim(),
      igPostUrl: data.igPostUrl.trim(),
      status: data.status,
      statusUpdatedAt: serverTimestamp(),
      statusSource,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

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

    if (data.title !== undefined) payload.title = data.title.trim();
    if (data.artists !== undefined)
      payload.artists = data.artists.map((a) => a.trim()).filter(Boolean);
    if (data.venueId !== undefined) payload.venueId = data.venueId.trim();
    if (data.promoterId !== undefined) payload.promoterId = data.promoterId.trim();
    if (data.startAtIso !== undefined) {
      const startDate = new Date(data.startAtIso);
      if (!isNaN(startDate.getTime())) {
        payload.startAt = Timestamp.fromDate(startDate);
      }
    }
    if (data.priceText !== undefined) payload.priceText = data.priceText.trim();
    if (data.genres !== undefined)
      payload.genres = data.genres.map((g) => g.trim()).filter(Boolean);
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
 * One-tap status update for Admin or Organizer (Requirement 3 & 6)
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

export async function seedSampleEvents(): Promise<number> {
  let seededCount = 0;
  for (const item of sampleEvents) {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    const path = `${COLLECTION_NAME}/${item.id}`;

    const startDate = new Date(item.startAt);
    const startTimestamp = Timestamp.fromDate(startDate);
    const updatedDate = new Date(item.statusUpdatedAt);
    const statusTimestamp = Timestamp.fromDate(updatedDate);

    try {
      const payload: Record<string, any> = {
        title: item.title,
        artists: item.artists,
        venueId: item.venueId,
        promoterId: item.promoterId,
        startAt: startTimestamp,
        priceText: item.priceText,
        genres: item.genres,
        ticketUrl: item.ticketUrl,
        igPostUrl: item.igPostUrl,
        status: item.status,
        statusUpdatedAt: statusTimestamp,
        statusSource: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (item.posterUrl) {
        payload.posterUrl = item.posterUrl;
      }
      await setDoc(docRef, payload);
      seededCount++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  return seededCount;
}
