import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CrowdReport, CrowdReportStatus } from '../utils/crowdStatusLogic';

/**
 * Subscribes to crowd reports for ONLY the open event (Requirement 5)
 * Query limit 50, ordered by createdAt desc to stay well within free tier quota.
 */
export function subscribeToEventReports(
  eventId: string,
  onData: (reports: CrowdReport[]) => void,
  onError?: (err: Error) => void
): () => void {
  const reportsQuery = query(
    collection(db, 'events', eventId, 'reports'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports: CrowdReport[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id, // equals user uid
          status: data.status as CrowdReportStatus,
          createdAt: data.createdAt,
        };
      });
      onData(reports);
    },
    (error) => {
      console.error(`Error listening to reports for event ${eventId}:`, error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `events/${eventId}/reports`);
    }
  );
}

/**
 * Submit or update user's crowd report (one per user per event, doc ID = uid)
 */
export async function submitCrowdReport(
  eventId: string,
  uid: string,
  status: CrowdReportStatus
): Promise<void> {
  const docRef = doc(db, 'events', eventId, 'reports', uid);
  const path = `events/${eventId}/reports/${uid}`;

  try {
    await setDoc(docRef, {
      status,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a user's report
 */
export async function deleteCrowdReport(eventId: string, uid: string): Promise<void> {
  const docRef = doc(db, 'events', eventId, 'reports', uid);
  const path = `events/${eventId}/reports/${uid}`;

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetches recent reports count in last 90 minutes for an event (for Admin Requirement 7)
 */
export async function fetchEventRecentReportsCount(eventId: string): Promise<number> {
  const path = `events/${eventId}/reports`;
  try {
    const q = query(
      collection(db, 'events', eventId, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const ninetyMinsAgo = Date.now() - 90 * 60 * 1000;

    let count = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      const time = data.createdAt?.seconds
        ? data.createdAt.seconds * 1000
        : new Date(data.createdAt).getTime();
      if (!isNaN(time) && time >= ninetyMinsAgo) {
        count++;
      }
    });
    return count;
  } catch {
    return 0;
  }
}

/**
 * Delete all reports for an event (Spam cleanup for Admin Requirement 7)
 */
export async function deleteAllEventReports(eventId: string): Promise<number> {
  const path = `events/${eventId}/reports`;
  try {
    const snap = await getDocs(collection(db, 'events', eventId, 'reports'));
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });

    await batch.commit();
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
