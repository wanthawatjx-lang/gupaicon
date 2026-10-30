import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CrowdReport, CrowdReportStatus } from '../types/event';

/**
 * Subcollection path helper: events/{eventId}/reports/{uid}
 */
const getReportsCollectionPath = (eventId: string) => `events/${eventId}/reports`;

/**
 * Fetch / subscribe to crowd reports for a specific event (limit 50, last 90 minutes)
 * Keeps Firestore reads low (Requirement 5)
 */
export function subscribeToEventReports(
  eventId: string,
  onData: (reports: CrowdReport[]) => void,
  onError?: (error: Error) => void
): () => void {
  const reportsRef = collection(db, getReportsCollectionPath(eventId));
  const reportsQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const reports: CrowdReport[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          status: (data.status as CrowdReportStatus) || 'available',
          createdAt: data.createdAt,
        };
      });
      onData(reports);
    },
    (error) => {
      console.error('Error listening to event reports:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, getReportsCollectionPath(eventId));
    }
  );
}

/**
 * Submit or update a crowd report for the current signed-in user (Document ID = uid)
 */
export async function submitCrowdReport(
  eventId: string,
  uid: string,
  status: CrowdReportStatus
): Promise<void> {
  const docRef = doc(db, getReportsCollectionPath(eventId), uid);
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
 * Delete all crowd reports for an event (Admin spam cleanup - Requirement 7)
 */
export async function deleteAllEventReports(eventId: string): Promise<number> {
  const reportsColRef = collection(db, getReportsCollectionPath(eventId));
  try {
    const snapshot = await getDocs(reportsColRef);
    let deletedCount = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }
    return deletedCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, getReportsCollectionPath(eventId));
  }
}
