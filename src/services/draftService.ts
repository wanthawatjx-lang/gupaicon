import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EventDraft } from '../types/draft';
import { EventStatus } from '../types/event';

const COLLECTION_NAME = 'eventDrafts';
const EVENTS_COLLECTION = 'events';

export function subscribeToEventDrafts(
  onData: (drafts: EventDraft[]) => void,
  onError?: (error: Error) => void
): () => void {
  const ref = collection(db, COLLECTION_NAME);

  return onSnapshot(
    ref,
    (snapshot) => {
      const items: EventDraft[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title ?? '',
          artists: data.artists ?? [],
          venueName: data.venueName ?? '',
          promoterName: data.promoterName || null,
          startAt: data.startAt ?? new Date().toISOString(),
          priceText: data.priceText || null,
          genres: data.genres ?? [],
          ticketUrl: data.ticketUrl || null,
          sourceUrl: data.sourceUrl ?? '',
          sourceName: data.sourceName ?? '',
          confidence: Number(data.confidence ?? 0.5),
          notes: data.notes || null,
          warnings: data.warnings ?? [],
          matchedVenueId: data.matchedVenueId || null,
          fingerprint: data.fingerprint ?? '',
          reviewStatus: data.reviewStatus ?? 'pending',
          createdAt: data.createdAt,
        };
      });
      onData(items);
    },
    (error) => {
      console.error('Error listening to event drafts snapshot:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    }
  );
}

export async function updateEventDraft(id: string, data: Partial<EventDraft>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventDraft(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const path = `${COLLECTION_NAME}/${id}`;
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function approveEventDraft(
  draft: EventDraft,
  selectedStatus: EventStatus = 'not_open'
): Promise<string> {
  if (!draft.matchedVenueId) {
    throw new Error('Cannot approve event draft without a matched venue.');
  }

  // Dates: if startAt is invalid, throw an error and block approval instead of using the current time
  if (!draft.startAt || typeof draft.startAt !== 'string') {
    throw new Error('Event draft startAt date is missing or invalid.');
  }
  const startDate = new Date(draft.startAt);
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid startAt date "${draft.startAt}". Cannot approve draft.`);
  }
  const startTimestamp = Timestamp.fromDate(startDate);

  // Status: never guess status from notes/ticketUrl. Use admin's choice (defaulting to "not_open")
  const validStatuses: EventStatus[] = ['available', 'low', 'sold_out', 'not_open', 'cancelled'];
  const status: EventStatus = validStatuses.includes(selectedStatus) ? selectedStatus : 'not_open';

  const eventId = `evt_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const path = `${EVENTS_COLLECTION}/${eventId}`;

  // firestore.rules reject null for optional fields.
  // Build the event object without optional keys when empty (promoterId, ticketUrl, igPostUrl, posterUrl, sourceUrl omitted).
  const cleanTitle = draft.title.trim().slice(0, 120);
  const cleanArtists = draft.artists.map((a) => a.trim()).filter(Boolean).slice(0, 20);

  const eventPayload: Record<string, any> = {
    title: cleanTitle,
    artists: cleanArtists.length > 0 ? cleanArtists : [cleanTitle || 'Indie Artist'],
    venueId: draft.matchedVenueId,
    startAt: startTimestamp,
    priceText: (draft.priceText || 'Check ticket page').trim().slice(0, 60),
    genres: draft.genres.map((g) => g.trim()).filter(Boolean).slice(0, 8),
    status,
    statusUpdatedAt: serverTimestamp(),
    statusSource: 'admin',
    origin: 'ai',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only include optional keys if non-empty string, NEVER null
  if (draft.ticketUrl && typeof draft.ticketUrl === 'string' && draft.ticketUrl.trim().length > 0) {
    eventPayload.ticketUrl = draft.ticketUrl.trim().slice(0, 500);
  }
  if (draft.sourceUrl && typeof draft.sourceUrl === 'string' && draft.sourceUrl.trim().length > 0) {
    eventPayload.sourceUrl = draft.sourceUrl.trim().slice(0, 500);
  }

  try {
    // 1. Create real event in Firestore
    await setDoc(eventRef, eventPayload);

    // 2. Delete approved draft
    await deleteEventDraft(draft.id);

    return eventId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function rejectEventDraft(draftId: string): Promise<void> {
  await updateEventDraft(draftId, { reviewStatus: 'rejected' });
  await deleteEventDraft(draftId);
}
