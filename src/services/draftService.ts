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

export async function approveEventDraft(draft: EventDraft): Promise<string> {
  if (!draft.matchedVenueId) {
    throw new Error('Cannot approve event draft without a matched venue.');
  }

  const eventId = `evt_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const path = `${EVENTS_COLLECTION}/${eventId}`;

  // Determine status: "available" only if ticketUrl or notes clearly indicate tickets on sale, otherwise "not_open"
  const notesLower = (draft.notes || '').toLowerCase();
  const ticketAvailableHint = Boolean(draft.ticketUrl) || notesLower.includes('sale') || notesLower.includes('available') || notesLower.includes('buy');
  const status: EventStatus = ticketAvailableHint ? 'available' : 'not_open';

  // Parse startAt ISO string to Firestore Timestamp
  const startDate = new Date(draft.startAt);
  const startTimestamp = Timestamp.fromDate(isNaN(startDate.getTime()) ? new Date() : startDate);

  try {
    // 1. Create real event
    await setDoc(eventRef, {
      title: draft.title.trim(),
      artists: draft.artists.map((a) => a.trim()).filter(Boolean),
      venueId: draft.matchedVenueId,
      promoterId: null,
      startAt: startTimestamp,
      priceText: (draft.priceText || 'Check ticket page').trim(),
      genres: draft.genres.map((g) => g.trim()).filter(Boolean),
      ticketUrl: draft.ticketUrl ? draft.ticketUrl.trim() : null,
      igPostUrl: null,
      posterUrl: null,
      status,
      statusUpdatedAt: serverTimestamp(),
      statusSource: 'admin',
      origin: 'ai',
      sourceUrl: draft.sourceUrl ? draft.sourceUrl.trim() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Delete or mark draft approved
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
