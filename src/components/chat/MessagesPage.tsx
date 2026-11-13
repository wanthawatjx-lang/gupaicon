import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, ReportReason } from '../../types/community';
import { Chat, ChatMessage } from '../../types/chat';
import {
  fetchUserChats,
  subscribeToChatMessages,
  sendChatMessage,
  deleteChatMessage,
  acceptChat,
  declineChat,
  hideChatForUser,
  reportChat,
  markChatAsRead,
  fetchChatRead,
  fetchChatMessagesForReport,
} from '../../services/chatService';
import { blockUser, fetchBlockedUids } from '../../services/communityService';
import { Language, translations } from '../../i18n';
import {
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Send,
  Trash2,
  Flag,
  ShieldAlert,
  AlertTriangle,
  Check,
  Lock,
  UserX,
  EyeOff,
  WifiOff,
} from 'lucide-react';
import { ReportModal } from '../community/ReportModal';

interface MessagesPageProps {
  user: User | null;
  userProfile: UserProfile | null;
  lang: Language;
  initialChatId?: string | null;
  onBackToMap: () => void;
  onOpenProfileSetup: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  user,
  userProfile,
  lang,
  initialChatId = null,
  onBackToMap,
  onOpenProfileSetup,
}) => {
  const t = translations[lang].chat;
  const commT = translations[lang].community;
  const commonT = translations[lang].states;

  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, Date | null>>({});
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Active open conversation
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Inline confirmation states (no window.confirm / window.alert)
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'hide'; chat: Chat }
    | { type: 'block'; chat: Chat }
    | { type: 'deleteMsg'; msgId: string }
    | null
  >(null);

  // Moderation & Report Modal
  const [reportingTarget, setReportingTarget] = useState<{
    chat: Chat;
    messages: ChatMessage[];
    blockOnReport?: boolean;
  } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMarkedMsgCountRef = useRef<number>(0);

  // Track online / offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat list (one-time query, max 20, no listener)
  const loadChats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const blocked = await fetchBlockedUids(user.uid);
      const list = await fetchUserChats(user.uid, blocked);
      setChats(list);

      // Fetch read timestamps for loaded chats (no listener)
      const reads: Record<string, Date | null> = {};
      await Promise.all(
        list.map(async (c) => {
          const d = await fetchChatRead(c.id, user.uid);
          reads[c.id] = d;
        })
      );
      setReadMap(reads);

      if (initialChatId) {
        const found = list.find((c) => c.id === initialChatId);
        if (found) {
          setSelectedChat(found);
        }
      }
    } catch (err: any) {
      console.error('Failed to load chats:', err);
      setError(commonT.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [user?.uid, initialChatId]);

  // Open active conversation realtime listener ONLY (limit 50 newest messages), unsubscribed on close
  useEffect(() => {
    if (!selectedChat || !user) {
      setMessages([]);
      setConfirmAction(null);
      setSendError(null);
      return;
    }

    setLoadingMessages(true);
    setMessageError(null);
    setSendError(null);
    setConfirmAction(null);
    lastMarkedMsgCountRef.current = 0;

    // Mark as read on open
    markChatAsRead(selectedChat.id, user.uid);
    setReadMap((prev) => ({ ...prev, [selectedChat.id]: new Date() }));

    const unsubscribe = subscribeToChatMessages(
      selectedChat.id,
      (msgs) => {
        setMessages(msgs);
        setLoadingMessages(false);
        // Only write lastReadAt when new incoming messages arrive while open
        if (msgs.length > lastMarkedMsgCountRef.current) {
          lastMarkedMsgCountRef.current = msgs.length;
          const latest = msgs[msgs.length - 1];
          if (latest && latest.senderUid !== user.uid) {
            markChatAsRead(selectedChat.id, user.uid);
            setReadMap((prev) => ({ ...prev, [selectedChat.id]: new Date() }));
          }
        }
      },
      (err) => {
        console.error('Messages subscription error:', err);
        setMessageError(commonT.errorMessage);
        setLoadingMessages(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedChat?.id, user?.uid]);

  // Filter chats by tab
  const acceptedChats = chats.filter(
    (c) => c.status === 'accepted' || (c.status === 'pending' && c.initiator === user?.uid)
  );
  const pendingRequests = chats.filter(
    (c) => c.status === 'pending' && c.initiator !== user?.uid
  );

  const getOtherName = (chat: Chat) => {
    if (!user) return 'User';
    const otherUid = chat.members.find((m) => m !== user.uid) || chat.members[0];
    return chat.names[otherUid] || 'User#0000';
  };

  const isUnread = (chat: Chat) => {
    if (!user) return false;
    const lastRead = readMap[chat.id];
    if (!chat.lastMessageAt) return false;
    const lastMsgTime = chat.lastMessageAt.toDate
      ? chat.lastMessageAt.toDate()
      : new Date(chat.lastMessageAt);
    if (!lastRead) return true;
    return lastMsgTime > lastRead;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !user || isOffline) return;
    const clean = newMessageText.trim();
    if (!clean) return;

    try {
      setSending(true);
      setSendError(null);
      await sendChatMessage(selectedChat.id, user.uid, clean);
      setNewMessageText('');
      const preview = clean.slice(0, 80);
      const now = new Date();
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChat.id
            ? { ...c, lastMessagePreview: preview, lastMessageAt: now }
            : c
        )
      );
      setReadMap((prev) => ({ ...prev, [selectedChat.id]: now }));
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setSendError(t.sendError);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (chat: Chat) => {
    try {
      await acceptChat(chat.id);
      setSelectedChat((prev) => (prev?.id === chat.id ? { ...prev, status: 'accepted' } : prev));
      setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, status: 'accepted' } : c)));
      setActiveTab('chats');
    } catch (err) {
      console.error('Failed to accept chat:', err);
      setError(commonT.errorMessage);
    }
  };

  const handleDeclineRequest = async (chat: Chat) => {
    try {
      await declineChat(chat.id);
      setSelectedChat((prev) => (prev?.id === chat.id ? { ...prev, status: 'declined' } : prev));
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
    } catch (err) {
      console.error('Failed to decline chat:', err);
      setError(commonT.errorMessage);
    }
  };

  const handleDeleteMessageConfirmed = async (msgId: string) => {
    if (!selectedChat) return;
    try {
      await deleteChatMessage(selectedChat.id, msgId);
      setConfirmAction(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleHideChatConfirmed = async (chat: Chat) => {
    if (!user) return;
    try {
      await hideChatForUser(chat.id, user.uid, chat.hiddenBy);
      setConfirmAction(null);
      if (selectedChat?.id === chat.id) setSelectedChat(null);
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
    } catch (err) {
      console.error('Failed to hide chat:', err);
    }
  };

  const handleBlockUserConfirmed = async (chat: Chat) => {
    if (!user) return;
    const otherUid = chat.members.find((m) => m !== user.uid);
    if (!otherUid) return;
    try {
      await blockUser(user.uid, otherUid);
      await hideChatForUser(chat.id, user.uid, chat.hiddenBy);
      setConfirmAction(null);
      if (selectedChat?.id === chat.id) setSelectedChat(null);
      setChats((prev) => prev.filter((c) => !c.members.includes(otherUid)));
      setActionSuccess(commT.userBlocked);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  const handleOpenBlockAndReportFromRequest = async (chat: Chat) => {
    const fetched = await fetchChatMessagesForReport(chat.id);
    const msgsToCopy: ChatMessage[] =
      fetched.length > 0
        ? fetched
        : chat.lastMessagePreview
          ? [
              {
                id: 'first',
                senderUid: chat.initiator,
                text: chat.lastMessagePreview,
                createdAt: chat.lastMessageAt,
              },
            ]
          : [];
    setReportingTarget({ chat, messages: msgsToCopy, blockOnReport: true });
  };

  const handleReportChatSubmit = async (reason: ReportReason) => {
    if (!reportingTarget || !user) return;
    const { chat, messages: msgs, blockOnReport } = reportingTarget;
    try {
      await reportChat(user.uid, chat.id, msgs, reason);
      if (blockOnReport) {
        const otherUid = chat.members.find((m) => m !== user.uid);
        if (otherUid) {
          await blockUser(user.uid, otherUid);
        }
        await hideChatForUser(chat.id, user.uid, chat.hiddenBy);
        if (selectedChat?.id === chat.id) setSelectedChat(null);
        setChats((prev) => prev.filter((c) => c.id !== chat.id));
      }
      setReportingTarget(null);
      setActionSuccess(
        blockOnReport ? `${commT.userBlocked} • ${commT.reportSuccess}` : commT.reportSuccess
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to submit chat report:', err);
    }
  };

  // Signed out state
  if (!user) {
    return (
      <div className="fixed inset-0 z-2000 bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold font-mono text-white">{t.title}</h2>
          <p className="text-xs text-neutral-400">{t.signInToMessage}</p>
          <button
            type="button"
            onClick={onBackToMap}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            {translations[lang].privacy.backToMap}
          </button>
        </div>
      </div>
    );
  }

  // Profile not set up or age not confirmed
  if (!userProfile || !userProfile.ageConfirmed) {
    return (
      <div className="fixed inset-0 z-2000 bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold font-mono text-white">{t.title}</h2>
          <p className="text-xs text-neutral-400">
            {lang === 'th'
              ? 'กรุณาตั้งชื่อโปรไฟล์และยืนยันอายุก่อนใช้งานระบบส่งข้อความ'
              : 'Please set up your profile and confirm age before messaging'}
          </p>
          <button
            type="button"
            onClick={onOpenProfileSetup}
            className="w-full py-2.5 rounded-xl bg-lime-400 text-black font-mono text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            {commT.chooseNameTitle}
          </button>
          <button
            type="button"
            onClick={onBackToMap}
            className="w-full py-2 rounded-xl text-neutral-400 hover:text-white font-mono text-xs transition-all cursor-pointer"
          >
            {translations[lang].privacy.backToMap}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-2000 bg-black text-white flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={selectedChat ? () => setSelectedChat(null) : onBackToMap}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer shrink-0"
            title={selectedChat ? 'Back to chat list' : t.title}
          >
            <ArrowLeft className="w-4 h-4 text-lime-400" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-lime-400 shrink-0" />
            <h1 className="text-sm font-mono font-bold text-white tracking-wider uppercase truncate">
              {selectedChat ? getOtherName(selectedChat) : t.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!selectedChat && (
            <button
              type="button"
              onClick={loadChats}
              disabled={loading || isOffline}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              title={commT.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-lime-400' : ''}`} />
            </button>
          )}

          {selectedChat && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReportingTarget({ chat: selectedChat, messages })}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title={commT.report}
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{commT.report}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ type: 'block', chat: selectedChat })}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-red-400 border border-neutral-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title={commT.block}
              >
                <UserX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{commT.block}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction({ type: 'hide', chat: selectedChat })}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title={t.deleteChatForMe}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{t.deleteChatForMe}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-950/90 border-b border-amber-700/60 text-amber-200 px-4 py-2 text-xs font-mono flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="bg-lime-400 text-black px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shrink-0">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Sidebar Column: Chat list & Requests (Hidden on mobile if chat open) */}
        <div
          className={`${
            selectedChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 border-r border-neutral-800/80 bg-neutral-950 flex-col shrink-0`}
        >
          {/* Tabs */}
          <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/50 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-lime-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span>{t.chatsTab}</span>
              <span className="text-[10px] opacity-80">({acceptedChats.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-lime-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span>{t.requestsTab}</span>
              {pendingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-900">
            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-neutral-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-lime-400" />
                {t.loading}
              </div>
            ) : error ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={loadChats}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-mono text-white hover:bg-neutral-700 cursor-pointer"
                >
                  {t.retry}
                </button>
              </div>
            ) : activeTab === 'chats' ? (
              acceptedChats.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-neutral-500 space-y-2">
                  <MessageSquare className="w-6 h-6 mx-auto opacity-30 text-lime-400" />
                  <p>{t.noChatsYet}</p>
                </div>
              ) : (
                acceptedChats.map((chat) => {
                  const unread = isUnread(chat);
                  const isSelected = selectedChat?.id === chat.id;
                  const name = getOtherName(chat);
                  const isPending = chat.status === 'pending';

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setSelectedChat(chat)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-lime-400/10 border-l-2 border-lime-400'
                          : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="relative shrink-0 w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-base">
                        💬
                        {unread && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-lime-400 ring-2 ring-black" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-xs font-bold text-white truncate">
                            {name}
                          </span>
                          {isPending && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                              {t.statusPending}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate font-sans">
                          {chat.lastMessagePreview || '...'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              /* Requests Tab */
              pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-neutral-500 space-y-2">
                  <Check className="w-6 h-6 mx-auto opacity-30 text-lime-400" />
                  <p>{t.noRequestsYet}</p>
                </div>
              ) : (
                pendingRequests.map((chat) => {
                  const name = getOtherName(chat);
                  return (
                    <div key={chat.id} className="p-4 bg-neutral-900/40 border-b border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                          <span>👋</span>
                          <span>{name}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          {t.statusPending}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80 font-sans leading-relaxed whitespace-pre-wrap break-words">
                        "{chat.lastMessagePreview}"
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleAcceptRequest(chat)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.accept}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleDeclineRequest(chat)}
                          className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          {t.decline}
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleOpenBlockAndReportFromRequest(chat)}
                          className="py-1.5 px-2.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800/60 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title={t.blockAndReport}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{t.blockAndReport}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div
          className={`${
            selectedChat ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-neutral-900/20 overflow-hidden relative`}
        >
          {selectedChat ? (
            <>
              {/* Conversation Top Safety Notice */}
              <div className="p-2.5 bg-neutral-950/80 border-b border-neutral-800/80 px-4 text-[11px] text-amber-300/90 flex items-center gap-2 shrink-0 font-sans">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t.safetyNotice}</span>
              </div>

              {/* Inline Confirmation Bar (Block / Hide / Delete Msg) */}
              {confirmAction && (
                <div className="p-3 bg-red-950/60 border-b border-red-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                  <span className="text-red-200 font-sans">
                    {confirmAction.type === 'block'
                      ? commT.blockConfirm
                      : confirmAction.type === 'hide'
                        ? t.deleteChatConfirm
                        : t.deleteMessageConfirm}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="px-3 py-1 rounded-lg bg-neutral-800 text-neutral-300 font-mono text-xs cursor-pointer"
                    >
                      {commT.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmAction.type === 'block') {
                          handleBlockUserConfirmed(confirmAction.chat);
                        } else if (confirmAction.type === 'hide') {
                          handleHideChatConfirmed(confirmAction.chat);
                        } else {
                          handleDeleteMessageConfirmed(confirmAction.msgId);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs cursor-pointer"
                    >
                      {confirmAction.type === 'block'
                        ? commT.block
                        : confirmAction.type === 'hide'
                          ? t.deleteChatForMe
                          : t.deleteMessage}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Banner if pending / declined */}
              {selectedChat.status === 'pending' && selectedChat.initiator === user.uid && (
                <div className="p-3 bg-amber-950/40 border-b border-amber-900/50 text-xs text-amber-300 text-center font-mono">
                  {t.waitingForAcceptance}
                </div>
              )}

              {selectedChat.status === 'pending' && selectedChat.initiator !== user.uid && (
                <div className="p-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-mono text-neutral-300">
                    {lang === 'th' ? 'คำขอสนทนาใหม่จากผู้ใช้คนนี้' : 'New conversation request'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleAcceptRequest(selectedChat)}
                      className="py-1.5 px-3 rounded-lg bg-lime-400 text-black text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
                    >
                      {t.accept}
                    </button>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleDeclineRequest(selectedChat)}
                      className="py-1.5 px-3 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-mono cursor-pointer disabled:opacity-50"
                    >
                      {t.decline}
                    </button>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => setReportingTarget({ chat: selectedChat, messages, blockOnReport: true })}
                      className="py-1.5 px-3 rounded-lg bg-red-950/60 text-red-300 border border-red-800/60 text-xs font-mono cursor-pointer disabled:opacity-50"
                    >
                      {t.blockAndReport}
                    </button>
                  </div>
                </div>
              )}

              {selectedChat.status === 'declined' && (
                <div className="p-3 bg-red-950/40 border-b border-red-900/50 text-xs text-red-300 text-center font-mono">
                  {t.chatDeclined}
                </div>
              )}

              {/* Realtime Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs font-mono text-neutral-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-lime-400" />
                    {t.loading}
                  </div>
                ) : messageError ? (
                  <div className="py-12 text-center text-xs text-red-400 space-y-2">
                    <AlertTriangle className="w-5 h-5 mx-auto" />
                    <p>{messageError}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs font-mono text-neutral-500">
                    {lang === 'th' ? 'ยังไม่มีข้อความ' : 'No messages yet'}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderUid === user.uid;
                    const timeStr = msg.createdAt?.toDate
                      ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-sans ${
                            isMe
                              ? 'bg-lime-400 text-black rounded-br-none shadow-md font-medium'
                              : 'bg-neutral-800 text-white rounded-bl-none border border-neutral-700/60'
                          }`}
                        >
                          {/* Plain text display: URLs rendered strictly as plain text */}
                          <span>{msg.text}</span>
                        </div>

                        {/* Message meta & actions */}
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500 px-1">
                          <span>{timeStr}</span>
                          {isMe ? (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'deleteMsg', msgId: msg.id })}
                              className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-red-400 transition-opacity p-0.5 cursor-pointer"
                              title={t.deleteMessage}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setReportingTarget({ chat: selectedChat, messages })}
                              className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-amber-400 transition-opacity p-0.5 cursor-pointer"
                              title={t.reportMessage}
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bottom Bar */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800 shrink-0 space-y-2">
                {sendError && (
                  <p className="text-xs text-red-400 font-mono text-center">{sendError}</p>
                )}

                {selectedChat.status === 'accepted' ? (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={t.placeholder}
                      maxLength={1000}
                      disabled={sending || isOffline}
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors font-sans disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={sending || isOffline || !newMessageText.trim()}
                      className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold text-xs flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="p-2 text-center text-xs font-mono text-neutral-500">
                    {selectedChat.status === 'pending' ? t.waitingForAcceptance : t.chatDeclined}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl">
                💬
              </div>
              <p className="text-xs font-mono">{t.noChatsYet}</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportingTarget && (
        <ReportModal
          isOpen={Boolean(reportingTarget)}
          onClose={() => setReportingTarget(null)}
          targetType="chat"
          targetId={reportingTarget.chat.id}
          onSubmit={handleReportChatSubmit}
          lang={lang}
        />
      )}
    </div>
  );
};
