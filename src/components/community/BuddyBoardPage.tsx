import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { BuddyPost, BuddyPostKind, UserProfile } from '../../types/community';
import { ConcertEvent } from '../../types/event';
import {
  fetchAllBuddyPosts,
  fetchBlockedUids,
  blockUser,
} from '../../services/communityService';
import { BuddyPostCard } from './BuddyPostCard';
import { ReportModal } from './ReportModal';
import { Language, translations } from '../../i18n';
import {
  Users,
  ShieldAlert,
  RefreshCw,
  ArrowLeft,
  Filter,
} from 'lucide-react';

interface BuddyBoardPageProps {
  user: User | null;
  profile: UserProfile | null;
  events: ConcertEvent[];
  onOpenEvent: (eventId: string) => void;
  onBack: () => void;
  onRequestProfile: () => void;
  onStartChat?: (targetUid: string, targetName: string, targetEmoji?: string) => void;
  lang: Language;
  isAdmin?: boolean;
}

export const BuddyBoardPage: React.FC<BuddyBoardPageProps> = ({
  user,
  profile,
  events,
  onOpenEvent,
  onBack,
  onRequestProfile,
  onStartChat,
  lang,
  isAdmin,
}) => {
  const t = translations[lang];

  const [posts, setPosts] = useState<BuddyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment';
    targetPath: string;
  } | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const list = await fetchAllBuddyPosts(kindFilter, 30);
      setPosts(list);
    } catch (err) {
      console.error('Failed to load buddy posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    if (!user) return;
    try {
      const uids = await fetchBlockedUids(user.uid);
      setBlockedUids(uids);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPosts();
  }, [kindFilter]);

  useEffect(() => {
    loadBlocks();
  }, [user?.uid]);

  const handleBlockUser = async (targetUid: string) => {
    if (!user) return;
    if (!window.confirm(t.community.blockConfirm)) return;
    try {
      await blockUser(user.uid, targetUid);
      setBlockedUids([...blockedUids, targetUid]);
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  // Filter out blocked users
  const visiblePosts = posts.filter((p) => !blockedUids.includes(p.authorUid));

  // Find event title for a post
  const getEventTitle = (eventId: string): string => {
    const e = events.find((item) => item.id === eventId);
    return e?.title || 'Concert';
  };

  return (
    <div className="fixed inset-0 z-1000 bg-neutral-950 text-white flex flex-col overflow-hidden animate-in fade-in">
      {/* Top Header */}
      <header className="p-4 border-b border-neutral-850 bg-neutral-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-lime-400" />
              <span>{t.community.findBuddy}</span>
            </h1>
            <p className="text-[11px] font-mono text-neutral-400">
              Community board (30 newest open posts)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPosts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t.community.refresh}</span>
          </button>
        </div>
      </header>

      {/* Safety Notice Banner (Requirement 5) */}
      <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-2.5 flex items-start gap-2.5 shrink-0">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
          <strong>Safety Note:</strong> {t.community.safetyNotice}
        </p>
      </div>

      {/* Filter Tabs by Kind */}
      <div className="px-4 py-2.5 border-b border-neutral-850 flex items-center gap-2 overflow-x-auto shrink-0 bg-neutral-950">
        <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        {(
          [
            { key: 'all', label: t.community.allKinds },
            { key: 'looking_for_buddy', label: t.community.kinds.looking_for_buddy },
            { key: 'have_extra_ticket', label: t.community.kinds.have_extra_ticket },
            { key: 'need_ticket', label: t.community.kinds.need_ticket },
          ] as { key: string; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setKindFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
              kindFilter === f.key
                ? 'bg-lime-400 text-black font-bold'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Post List Content */}
      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin text-lime-400" />
            <p className="text-xs font-mono">Loading buddy requests...</p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Users className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="text-sm text-neutral-400">{t.community.noPostsOnBoard}</p>
            <p className="text-xs text-neutral-500">
              Open any concert details from the map to post a request for that show!
            </p>
          </div>
        ) : (
          visiblePosts.map((post) => (
            <BuddyPostCard
              key={post.id}
              post={post}
              user={user}
              profile={profile}
              isAdmin={isAdmin}
              onPostUpdated={loadPosts}
              onPostDeleted={loadPosts}
              onReport={(targetType, targetPath) => setReportTarget({ targetType, targetPath })}
              onBlockUser={handleBlockUser}
              onStartChat={onStartChat}
              lang={lang}
              eventTitle={getEventTitle(post.eventId)}
              onOpenEvent={() => onOpenEvent(post.eventId)}
            />
          ))
        )}
      </main>

      {/* Report Modal */}
      {reportTarget && user && (
        <ReportModal
          reporterUid={user.uid}
          targetType={reportTarget.targetType}
          targetPath={reportTarget.targetPath}
          isOpen={true}
          onClose={() => setReportTarget(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
