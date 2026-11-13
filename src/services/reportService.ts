import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CrowdReport, CrowdReportStatus } from '../types/event';

/**
 * Subcollection path helper: events/{eventId}/reports/{uid}
 */
const getReportsCollectionPath = (eventId: string) => `events/${eventId}/reports`;

/**
 * Fetch crowd reports once for a specific event (limit 50, newest first).
 * Keeps Firestore reads low without holding open a realtime listener.
 */
export async function fetchEventReports(eventId: string): Promise<CrowdReport[]> {
  const reportsRef = collection(db, getReportsCollectionPath(eventId));
  const reportsQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(50));
  try {
    const snapshot = await getDocs(reportsQuery);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        status: (data.status as CrowdReportStatus) || 'available',
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, getReportsCollectionPath(eventId));
  }
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
 * Delete crowd reports for an event (Admin spam cleanup, bounded batch of 200)
 */
export async function deleteAllEventReports(eventId: string): Promise<number> {
  const reportsColRef = query(
    collection(db, getReportsCollectionPath(eventId)),
    limit(200)
  );
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
