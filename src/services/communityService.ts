/**
 * Community Profile & Concert Buddy Board Service
 * Low-read usage: No realtime listeners; bounded one-time queries.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  UserProfile,
  BuddyPost,
  BuddyComment,
  ContentReport,
  ReportReason,
  BuddyPostKind,
  BuddyPostStatus,
} from '../types/community';

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `profiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: snap.id,
      displayName: data.displayName || 'Concert Fan',
      tag: data.tag || '0000',
      avatarEmoji: data.avatarEmoji || '🎸',
      bio: data.bio || '',
      favoriteGenres: Array.isArray(data.favoriteGenres) ? data.favoriteGenres : [],
      ageConfirmed: Boolean(data.ageConfirmed),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(
  uid: string,
  data: {
    displayName: string;
    avatarEmoji: string;
    bio?: string;
    favoriteGenres: string[];
    ageConfirmed: boolean;
  }
): Promise<UserProfile> {
  const path = `profiles/${uid}`;
  const tag = Math.floor(1000 + Math.random() * 9000).toString();
  const cleanName = data.displayName.trim().slice(0, 24);
  const cleanBio = data.bio?.trim().slice(0, 140);

  const payload: Record<string, any> = {
    displayName: cleanName,
    tag,
    avatarEmoji: data.avatarEmoji,
    favoriteGenres: data.favoriteGenres.slice(0, 5),
    ageConfirmed: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanBio && cleanBio.length > 0) {
    payload.bio = cleanBio;
  }

  try {
    await setDoc(doc(db, 'profiles', uid), payload);
    return {
      uid,
      displayName: cleanName,
      tag,
      avatarEmoji: data.avatarEmoji,
      bio: cleanBio,
      favoriteGenres: data.favoriteGenres.slice(0, 5),
      ageConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  data: {
    displayName?: string;
    avatarEmoji?: string;
    bio?: string;
    favoriteGenres?: string[];
  }
): Promise<void> {
  const path = `profiles/${uid}`;
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (data.displayName !== undefined) {
    payload.displayName = data.displayName.trim().slice(0, 24);
  }
  if (data.avatarEmoji !== undefined) {
    payload.avatarEmoji = data.avatarEmoji;
  }
  if (data.bio !== undefined) {
    payload.bio = data.bio.trim().slice(0, 140);
  }
  if (data.favoriteGenres !== undefined) {
    payload.favoriteGenres = data.favoriteGenres.slice(0, 5);
  }

  try {
    await updateDoc(doc(db, 'profiles', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserProfileAndData(uid: string): Promise<void> {
  const path = `profiles/${uid}`;
  try {
    // 1. Delete profile doc
    await deleteDoc(doc(db, 'profiles', uid));

    // 2. Delete user's own buddy posts
    const postsQuery = query(
      collection(db, 'buddyPosts'),
      where('authorUid', '==', uid),
      limit(50)
    );
    const snap = await getDocs(postsQuery);
    for (const postDoc of snap.docs) {
      await deleteDoc(postDoc.ref).catch(() => {});
    }

    // 3. Delete block entries (bounded)
    const blocksSnap = await getDocs(
      query(collection(db, 'profiles', uid, 'blocks'), limit(100))
    ).catch(() => null);
    if (blocksSnap) {
      for (const b of blocksSnap.docs) {
        await deleteDoc(b.ref).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Bounded one-time query for event buddy posts (limit 10, newest first)
export async function fetchEventBuddyPosts(
  eventId: string,
  limitCount = 10
): Promise<BuddyPost[]> {
  const path = 'buddyPosts';
  try {
    const q = query(
      collection(db, 'buddyPosts'),
      where('eventId', '==', eventId),
      limit(25)
    );
    const snap = await getDocs(q);
    const list: BuddyPost[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        eventId: data.eventId,
        authorUid: data.authorUid,
        authorName: data.authorName,
        avatarEmoji: data.avatarEmoji || '🎸',
        kind: data.kind,
        body: data.body,
        meetUpNote: data.meetUpNote,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Client-side filter to open posts & sort newest first (avoids needing composite index)
    return list
      .filter((p) => p.status === 'open')
      .sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      })
      .slice(0, limitCount);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Bounded one-time query for general board (limit 30 newest open posts)
export async function fetchAllBuddyPosts(
  kindFilter = 'all',
  limitCount = 30
): Promise<BuddyPost[]> {
  const path = 'buddyPosts';
  try {
    const q = query(
      collection(db, 'buddyPosts'),
      where('status', '==', 'open'),
      limit(50)
    );
    const snap = await getDocs(q);
    let list: BuddyPost[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        eventId: data.eventId,
        authorUid: data.authorUid,
        authorName: data.authorName,
        avatarEmoji: data.avatarEmoji || '🎸',
        kind: data.kind,
        body: data.body,
        meetUpNote: data.meetUpNote,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    if (kindFilter !== 'all') {
      list = list.filter((p) => p.kind === kindFilter);
    }

    return list
      .sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return tB - tA;
      })
      .slice(0, limitCount);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createBuddyPost(post: {
  eventId: string;
  authorUid: string;
  authorName: string;
  avatarEmoji?: string;
  kind: BuddyPostKind;
  body: string;
  meetUpNote?: string;
}): Promise<string> {
  const postId = `${post.eventId}_${post.authorUid}`;
  const path = `buddyPosts/${postId}`;

  const payload: Record<string, any> = {
    eventId: post.eventId,
    authorUid: post.authorUid,
    authorName: post.authorName.slice(0, 80),
    avatarEmoji: post.avatarEmoji || '🎸',
    kind: post.kind,
    body: post.body.trim().slice(0, 500),
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (post.meetUpNote && post.meetUpNote.trim()) {
    payload.meetUpNote = post.meetUpNote.trim().slice(0, 120);
  }

  try {
    await setDoc(doc(db, 'buddyPosts', postId), payload);
    return postId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBuddyPostStatus(
  postId: string,
  status: BuddyPostStatus
): Promise<void> {
  const path = `buddyPosts/${postId}`;
  try {
    await updateDoc(doc(db, 'buddyPosts', postId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBuddyPostBody(
  postId: string,
  body: string,
  meetUpNote?: string,
  kind?: BuddyPostKind
): Promise<void> {
  const path = `buddyPosts/${postId}`;
  const payload: Record<string, any> = {
    body: body.trim().slice(0, 500),
    updatedAt: serverTimestamp(),
  };
  if (meetUpNote !== undefined) {
    payload.meetUpNote = meetUpNote.trim().slice(0, 120);
  }
  if (kind !== undefined) {
    payload.kind = kind;
  }

  try {
    await updateDoc(doc(db, 'buddyPosts', postId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBuddyPost(postId: string): Promise<void> {
  const path = `buddyPosts/${postId}`;
  try {
    await deleteDoc(doc(db, 'buddyPosts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchComments(
  postId: string,
  limitCount = 30
): Promise<BuddyComment[]> {
  const path = `buddyPosts/${postId}/comments`;
  try {
    const q = query(
      collection(db, 'buddyPosts', postId, 'comments'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorUid: data.authorUid,
        authorName: data.authorName,
        body: data.body,
        createdAt: data.createdAt,
      };
    });

    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tA - tB;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function addComment(
  postId: string,
  authorUid: string,
  authorName: string,
  body: string
): Promise<string> {
  const commentId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const path = `buddyPosts/${postId}/comments/${commentId}`;

  try {
    await setDoc(doc(db, 'buddyPosts', postId, 'comments', commentId), {
      authorUid,
      authorName: authorName.slice(0, 80),
      body: body.trim().slice(0, 300),
      createdAt: serverTimestamp(),
    });
    return commentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const path = `buddyPosts/${postId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'buddyPosts', postId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function blockUser(myUid: string, otherUid: string): Promise<void> {
  const path = `profiles/${myUid}/blocks/${otherUid}`;
  try {
    await setDoc(doc(db, 'profiles', myUid, 'blocks', otherUid), {
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function unblockUser(myUid: string, otherUid: string): Promise<void> {
  const path = `profiles/${myUid}/blocks/${otherUid}`;
  try {
    await deleteDoc(doc(db, 'profiles', myUid, 'blocks', otherUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchBlockedUids(myUid: string): Promise<string[]> {
  try {
    const snap = await getDocs(query(collection(db, 'profiles', myUid, 'blocks'), limit(100)));
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

export async function submitContentReport(
  reporterUid: string,
  targetType: 'post' | 'comment',
  targetPath: string,
  reason: ReportReason
): Promise<string> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `contentReports/${reportId}`;

  try {
    await setDoc(doc(db, 'contentReports', reportId), {
      reporterUid,
      targetType,
      targetPath,
      reason,
      createdAt: serverTimestamp(),
    });
    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchContentReports(): Promise<ContentReport[]> {
  const path = 'contentReports';
  try {
    const q = query(collection(db, 'contentReports'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        reporterUid: data.reporterUid,
        targetType: data.targetType,
        targetPath: data.targetPath,
        chatId: data.chatId,
        excerpt: data.excerpt,
        reason: data.reason,
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteContentReport(reportId: string): Promise<void> {
  const path = `contentReports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'contentReports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function banUser(uid: string, reason: string): Promise<void> {
  const path = `bans/${uid}`;
  try {
    await setDoc(doc(db, 'bans', uid), {
      uid,
      reason: reason.trim().slice(0, 200),
      bannedAt: serverTimestamp(),
      bannedBy: 'admin',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkIsBanned(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'bans', uid));
    return snap.exists();
  } catch {
    return false;
  }
}
