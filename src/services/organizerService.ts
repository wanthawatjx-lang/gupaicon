import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  OrganizerRequest,
  OrganizerRecord,
  OrganizerRequestFormData,
} from '../types/organizer';

const REQUESTS_COLLECTION = 'organizerRequests';
const ORGANIZERS_COLLECTION = 'organizers';

/**
 * Submit an organizer verification request for the signed-in user.
 * Document ID must equal user.uid.
 */
export async function submitOrganizerRequest(
  uid: string,
  data: OrganizerRequestFormData
): Promise<void> {
  const docRef = doc(db, REQUESTS_COLLECTION, uid);
  const path = `${REQUESTS_COLLECTION}/${uid}`;

  try {
    await setDoc(docRef, {
      promoterName: data.promoterName.trim(),
      igUrl: data.igUrl.trim(),
      contactEmail: data.contactEmail.trim(),
      note: data.note.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetch the current user's organizer request once.
 */
export async function fetchUserOrganizerRequest(uid: string): Promise<OrganizerRequest | null> {
  const docRef = doc(db, REQUESTS_COLLECTION, uid);
  const path = `${REQUESTS_COLLECTION}/${uid}`;

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      promoterName: data.promoterName,
      igUrl: data.igUrl,
      contactEmail: data.contactEmail,
      note: data.note,
      status: data.status,
      createdAt: data.createdAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribe to the current user's organizer request.
 */
export function subscribeUserOrganizerRequest(
  uid: string,
  onData: (req: OrganizerRequest | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, REQUESTS_COLLECTION, uid);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        id: snap.id,
        promoterName: data.promoterName,
        igUrl: data.igUrl,
        contactEmail: data.contactEmail,
        note: data.note,
        status: data.status,
        createdAt: data.createdAt,
      });
    },
    (error) => {
      console.error('Error listening to user organizer request:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to the current user's active organizer record (doc id = uid).
 */
export function subscribeUserOrganizerRecord(
  uid: string,
  onData: (rec: OrganizerRecord | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, ORGANIZERS_COLLECTION, uid);

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        uid: snap.id,
        promoterId: data.promoterId,
        email: data.email,
        approvedAt: data.approvedAt,
      });
    },
    (error) => {
      console.error('Error listening to user organizer record:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch the current user's active organizer record once.
 */
export async function fetchUserOrganizerRecord(uid: string): Promise<OrganizerRecord | null> {
  const docRef = doc(db, ORGANIZERS_COLLECTION, uid);
  const path = `${ORGANIZERS_COLLECTION}/${uid}`;

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: snap.id,
      promoterId: data.promoterId,
      email: data.email,
      approvedAt: data.approvedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Admin: Subscribe to all organizer requests.
 */
export function subscribeOrganizerRequests(
  onData: (reqs: OrganizerRequest[]) => void,
  onError?: (error: Error) => void
): () => void {
  const requestsQuery = query(
    collection(db, REQUESTS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    requestsQuery,
    (snap) => {
      const items: OrganizerRequest[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          promoterName: d.promoterName,
          igUrl: d.igUrl,
          contactEmail: d.contactEmail,
          note: d.note,
          status: d.status,
          createdAt: d.createdAt,
        };
      });
      onData(items);
    },
    (error) => {
      console.error('Error listening to organizer requests:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, REQUESTS_COLLECTION);
    }
  );
}

/**
 * Admin: Subscribe to active organizers.
 */
export function subscribeActiveOrganizers(
  onData: (organizers: OrganizerRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const orgQuery = query(collection(db, ORGANIZERS_COLLECTION), limit(100));

  return onSnapshot(
    orgQuery,
    (snap) => {
      const items: OrganizerRecord[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: docSnap.id,
          promoterId: d.promoterId,
          email: d.email,
          approvedAt: d.approvedAt,
        };
      });
      onData(items);
    },
    (error) => {
      console.error('Error listening to active organizers:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, ORGANIZERS_COLLECTION);
    }
  );
}

/**
 * Admin: Approve an organizer request.
 * Writes to organizers/{uid} and updates organizerRequests/{uid}.status = 'approved'.
 */
export async function approveOrganizerRequest(
  uid: string,
  promoterId: string,
  email: string
): Promise<void> {
  const orgDocRef = doc(db, ORGANIZERS_COLLECTION, uid);
  const reqDocRef = doc(db, REQUESTS_COLLECTION, uid);

  try {
    await setDoc(orgDocRef, {
      promoterId,
      email: email.trim(),
      approvedAt: serverTimestamp(),
    });

    await updateDoc(reqDocRef, {
      status: 'approved',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ORGANIZERS_COLLECTION}/${uid}`);
  }
}

/**
 * Admin: Reject an organizer request.
 */
export async function rejectOrganizerRequest(uid: string): Promise<void> {
  const reqDocRef = doc(db, REQUESTS_COLLECTION, uid);
  const path = `${REQUESTS_COLLECTION}/${uid}`;

  try {
    await updateDoc(reqDocRef, {
      status: 'rejected',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin: Revoke organizer rights (deletes organizers/{uid}).
 */
export async function revokeOrganizer(uid: string): Promise<void> {
  const orgDocRef = doc(db, ORGANIZERS_COLLECTION, uid);
  const path = `${ORGANIZERS_COLLECTION}/${uid}`;

  try {
    await deleteDoc(orgDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
