/**
 * Direct Message (Chat) Service
 * Low-read usage: No listener on the chat list (one-time bounded query, max 20 chats);
 * Realtime listener ONLY on the open active conversation (limit 50 newest messages).
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
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Chat, ChatMessage } from '../types/chat';
import { UserProfile, ReportReason } from '../types/community';

/**
 * Returns canonical chatId: sorted UIDs joined with '_'
 */
export function getChatId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Check if a chat is hidden in local storage as backup
 */
export function isChatHiddenLocally(chatId: string, myUid: string): boolean {
  try {
    const raw = localStorage.getItem(`gupaicon_hidden_chats_${myUid}`);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(chatId);
  } catch {
    return false;
  }
}

/**
 * Store hidden chat in local storage as backup
 */
export function hideChatLocally(chatId: string, myUid: string): void {
  try {
    const raw = localStorage.getItem(`gupaicon_hidden_chats_${myUid}`);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && !list.includes(chatId)) {
      list.push(chatId);
      localStorage.setItem(`gupaicon_hidden_chats_${myUid}`, JSON.stringify(list));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch 20 most recent chats for user (one-time query, no listener)
 */
export async function fetchUserChats(myUid: string, blockedUids: string[] = []): Promise<Chat[]> {
  const path = 'chats';
  try {
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', myUid),
      limit(25)
    );
    const snap = await getDocs(q);

    const chats: Chat[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const hiddenBy = Array.isArray(data.hiddenBy) ? data.hiddenBy : [];
      const members = Array.isArray(data.members) ? data.members : [];
      const otherUid = members.find((m: string) => m !== myUid);

      if (
        hiddenBy.includes(myUid) ||
        isChatHiddenLocally(d.id, myUid) ||
        (otherUid && blockedUids.includes(otherUid))
      ) {
        return;
      }

      chats.push({
        id: d.id,
        members: data.members,
        initiator: data.initiator,
        status: data.status,
        createdAt: data.createdAt,
        lastMessageAt: data.lastMessageAt,
        lastMessagePreview: data.lastMessagePreview || '',
        names: data.names || {},
        hiddenBy,
        updatedAt: data.updatedAt,
      });
    });

    // Client-side sort by lastMessageAt descending and cap at 20 most recent
    return chats
      .sort((a, b) => {
        const tA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : new Date(a.lastMessageAt || 0).getTime();
        const tB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : new Date(b.lastMessageAt || 0).getTime();
        return tB - tA;
      })
      .slice(0, 20);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetch a single chat document
 */
export async function fetchChat(chatId: string): Promise<Chat | null> {
  const path = `chats/${chatId}`;
  try {
    const snap = await getDoc(doc(db, 'chats', chatId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      members: data.members,
      initiator: data.initiator,
      status: data.status,
      createdAt: data.createdAt,
      lastMessageAt: data.lastMessageAt,
      lastMessagePreview: data.lastMessagePreview || '',
      names: data.names || {},
      hiddenBy: Array.isArray(data.hiddenBy) ? data.hiddenBy : [],
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Initiates a new chat with the first message while status is 'pending'.
 * If chat already exists, returns existing chat without overwriting.
 */
export async function createPendingChat(
  callerProfile: UserProfile,
  targetUid: string,
  targetName: string,
  firstMessageText: string
): Promise<{ chatId: string; alreadyExisted: boolean }> {
  if (!callerProfile.ageConfirmed) {
    throw new Error('Profile and age confirmation are required to start a chat.');
  }
  if (callerProfile.uid === targetUid) {
    throw new Error('Cannot start a chat with yourself.');
  }

  const chatId = getChatId(callerProfile.uid, targetUid);
  const path = `chats/${chatId}`;

  try {
    const existingSnap = await getDoc(doc(db, 'chats', chatId));
    if (existingSnap.exists()) {
      return { chatId, alreadyExisted: true };
    }

    const sortedMembers = [callerProfile.uid, targetUid].sort() as [string, string];
    const preview = firstMessageText.trim().slice(0, 80);

    // 1. Create chat document
    await setDoc(doc(db, 'chats', chatId), {
      members: sortedMembers,
      initiator: callerProfile.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: preview,
      names: {
        [callerProfile.uid]: `${callerProfile.displayName}#${callerProfile.tag}`.slice(0, 80),
        [targetUid]: targetName.slice(0, 80),
      },
    });

    // 2. Create the ONE allowed message while status is pending (doc id: 'first')
    await setDoc(doc(db, 'chats', chatId, 'messages', 'first'), {
      senderUid: callerProfile.uid,
      text: firstMessageText.trim().slice(0, 1000),
      createdAt: serverTimestamp(),
    });

    // 3. Mark read for initiator
    await setDoc(doc(db, 'chats', chatId, 'reads', callerProfile.uid), {
      lastReadAt: serverTimestamp(),
    });

    return { chatId, alreadyExisted: false };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return { chatId, alreadyExisted: false };
  }
}

/**
 * Accept chat request (only non-initiator)
 */
export async function acceptChat(chatId: string): Promise<void> {
  const path = `chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Decline chat request (only non-initiator)
 */
export async function declineChat(chatId: string): Promise<void> {
  const path = `chats/${chatId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Send a message in an accepted chat
 */
export async function sendChatMessage(
  chatId: string,
  senderUid: string,
  text: string
): Promise<string> {
  const msgId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const msgPath = `chats/${chatId}/messages/${msgId}`;
  const cleanText = text.trim().slice(0, 1000);
  const preview = cleanText.slice(0, 80);

  try {
    // 1. Write message document
    await setDoc(doc(db, 'chats', chatId, 'messages', msgId), {
      senderUid,
      text: cleanText,
      createdAt: serverTimestamp(),
    });

    // 2. Update chat last message preview and time
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: preview,
      updatedAt: serverTimestamp(),
    });

    // 3. Update sender read status
    await setDoc(doc(db, 'chats', chatId, 'reads', senderUid), {
      lastReadAt: serverTimestamp(),
    });

    return msgId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, msgPath);
    return msgId;
  }
}

/**
 * Delete own message
 */
export async function deleteChatMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch up to 10 most recent messages once (used when reporting from Requests inbox before opening chat)
 */
export async function fetchChatMessagesForReport(chatId: string): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    const list: ChatMessage[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        senderUid: data.senderUid,
        text: data.text || '',
        createdAt: data.createdAt,
      });
    });
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return tA - tB;
    });
  } catch {
    return [];
  }
}

/**
 * Realtime listener ONLY on the open active conversation (limit 50 newest messages).
 * Must be unsubscribed when closing conversation.
 */
export function subscribeToChatMessages(
  chatId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError: (err: any) => void
): () => void {
  const path = `chats/${chatId}/messages`;
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        messages.push({
          id: d.id,
          senderUid: data.senderUid,
          text: data.text || '',
          createdAt: data.createdAt,
        });
      });

      // Sort chronological ascending for chat display
      messages.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return tA - tB;
      });

      onUpdate(messages);
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // Logged via handleFirestoreError without throwing unhandled inside onSnapshot callback
      }
    }
  );
}

/**
 * Mark chat as read for user
 */
export async function markChatAsRead(chatId: string, myUid: string): Promise<void> {
  try {
    await setDoc(doc(db, 'chats', chatId, 'reads', myUid), {
      lastReadAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking read mark
  }
}

/**
 * Fetch last read timestamp for user
 */
export async function fetchChatRead(chatId: string, myUid: string): Promise<Date | null> {
  try {
    const snap = await getDoc(doc(db, 'chats', chatId, 'reads', myUid));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.lastReadAt) return null;
    return data.lastReadAt.toDate ? data.lastReadAt.toDate() : new Date(data.lastReadAt);
  } catch {
    return null;
  }
}

/**
 * "Delete chat for me" (hides chat for this user only)
 */
export async function hideChatForUser(
  chatId: string,
  myUid: string,
  existingHiddenBy?: string[]
): Promise<void> {
  hideChatLocally(chatId, myUid);
  const path = `chats/${chatId}`;
  try {
    const newHiddenBy = Array.from(new Set([...(existingHiddenBy || []), myUid]));
    await updateDoc(doc(db, 'chats', chatId), {
      hiddenBy: newHiddenBy.slice(0, 2),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Report a chat to moderation: copies last 10 messages so admin can review without reading private chats
 */
export async function reportChat(
  reporterUid: string,
  chatId: string,
  messages: ChatMessage[],
  reason: ReportReason
): Promise<string> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `contentReports/${reportId}`;

  // Copy last 10 messages as plain text excerpt
  const last10 = messages.slice(-10);
  const excerpt = last10
    .map((m) => {
      const timeStr = m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : '';
      return `[${timeStr}] UID(${m.senderUid}): ${m.text}`;
    })
    .join('\n')
    .slice(0, 10000);

  try {
    await setDoc(doc(db, 'contentReports', reportId), {
      reporterUid,
      targetType: 'chat',
      targetPath: `/chats/${chatId}`,
      chatId,
      excerpt: excerpt || 'No messages copied',
      reason,
      createdAt: serverTimestamp(),
    });
    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return reportId;
  }
}
