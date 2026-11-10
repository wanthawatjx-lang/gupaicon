import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { BuddyPost, BuddyComment, UserProfile } from '../../types/community';
import {
  fetchComments,
  addComment,
  deleteComment,
  updateBuddyPostStatus,
  deleteBuddyPost,
} from '../../services/communityService';
import { formatRelativeTime } from '../../utils/dateUtils';
import { Language, translations } from '../../i18n';
import {
  MessageSquare,
  MapPin,
  Flag,
  UserX,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BuddyPostCardProps {
  post: BuddyPost;
  user: User | null;
  profile?: UserProfile | null;
  isAdmin?: boolean;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  onReport: (targetType: 'post' | 'comment', targetPath: string) => void;
  onBlockUser: (targetUid: string) => void;
  onStartChat?: (targetUid: string, targetName: string, targetEmoji?: string) => void;
  lang: Language;
  eventTitle?: string;
  onOpenEvent?: () => void;
}

export const BuddyPostCard: React.FC<BuddyPostCardProps> = ({
  post,
  user,
  profile,
  isAdmin,
  onPostUpdated,
  onPostDeleted,
  onReport,
  onBlockUser,
  onStartChat,
  lang,
  eventTitle,
  onOpenEvent,
}) => {
  const t = translations[lang];

  const [expandedComments, setExpandedComments] = useState(false);
  const [comments, setComments] = useState<BuddyComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isAuthor = user ? user.uid === post.authorUid : false;

  const handleToggleComments = async () => {
    if (!expandedComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const list = await fetchComments(post.id, 30);
        setComments(list);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setExpandedComments(!expandedComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const authorName = `${profile.displayName}#${profile.tag}`;
      const commentId = await addComment(
        post.id,
        user.uid,
        authorName,
        newCommentText.trim()
      );
      setComments([
        ...comments,
        {
          id: commentId,
          authorUid: user.uid,
          authorName,
          body: newCommentText.trim(),
          createdAt: new Date(),
        },
      ]);
      setNewCommentText('');
    } catch (err: any) {
      console.error('Failed to add comment:', err);
      setCommentError(err?.message || 'Failed to submit comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(post.id, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleToggleClose = async () => {
    if (!isAuthor) return;
    const nextStatus = post.status === 'open' ? 'closed' : 'open';
    try {
      await updateBuddyPostStatus(post.id, nextStatus);
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!isAuthor && !isAdmin) return;
    if (!window.confirm(t.community.deletePostConfirm)) return;
    try {
      await deleteBuddyPost(post.id);
      if (onPostDeleted) onPostDeleted();
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Kind badge styles
  const getKindBadge = () => {
    switch (post.kind) {
      case 'have_extra_ticket':
        return {
          text: t.community.kinds.have_extra_ticket,
          cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'need_ticket':
        return {
          text: t.community.kinds.need_ticket,
          cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'looking_for_buddy':
      default:
        return {
          text: t.community.kinds.looking_for_buddy,
          cls: 'bg-lime-400/15 text-lime-400 border-lime-400/30',
        };
    }
  };

  const badge = getKindBadge();

  return (
    <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3 transition-colors hover:border-neutral-750">
      {/* Event Link Header (if shown in global board) */}
      {eventTitle && (
        <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
          <button
            type="button"
            onClick={onOpenEvent}
            className="text-xs font-semibold text-lime-400 hover:underline truncate max-w-[280px] text-left cursor-pointer"
          >
            🎵 {eventTitle}
          </button>
          <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(post.createdAt, lang)}
          </span>
        </div>
      )}

      {/* Author Row + Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{post.avatarEmoji || '🎸'}</span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {post.authorName}
            </div>
            {!eventTitle && (
              <div className="text-[10px] font-mono text-neutral-500">
                {formatRelativeTime(post.createdAt, lang)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badge.cls}`}
          >
            {badge.text}
          </span>
          {post.status === 'closed' && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-mono font-bold">
              {t.community.closedBadge}
            </span>
          )}
        </div>
      </div>

      {/* Post Text (Plain text only, no HTML or auto-clickable links) */}
      <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed select-text font-normal">
        {post.body}
      </p>

      {/* Meet-up Note */}
      {post.meetUpNote && (
        <div className="flex items-start gap-1.5 p-2 rounded-xl bg-neutral-950/60 border border-neutral-850 text-xs text-neutral-300">
          <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
          <span className="leading-snug">
            <strong className="text-neutral-400 font-mono text-[10px] uppercase mr-1">Meet:</strong>
            {post.meetUpNote}
          </span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-850 text-xs">
        {/* Toggle Comments Button */}
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <MessageSquare className="w-3.5 h-3.5 text-lime-400" />
          <span>{t.community.comments}</span>
          {comments.length > 0 && (
            <span className="text-[10px] font-mono text-neutral-400">({comments.length})</span>
          )}
          {expandedComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Message button (Requirement 1) */}
          {!isAuthor && onStartChat && (
            <button
              type="button"
              onClick={() => onStartChat(post.authorUid, post.authorName, post.avatarEmoji)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lime-400 hover:bg-lime-300 text-black text-[11px] font-mono font-bold transition-all shadow-sm cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>{t.chat.messageButton}</span>
            </button>
          )}

          {/* Author actions */}
          {isAuthor && (
            <button
              type="button"
              onClick={handleToggleClose}
              className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
            >
              {post.status === 'open' ? t.community.closePost : 'Re-open'}
            </button>
          )}

          {(isAuthor || isAdmin) && (
            <button
              type="button"
              onClick={handleDeletePost}
              title={t.community.deletePost}
              className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Non-author safety actions */}
          {!isAuthor && user && (
            <>
              <button
                type="button"
                onClick={() => onReport('post', `buddyPosts/${post.id}`)}
                title={t.community.report}
                className="p-1.5 text-neutral-500 hover:text-amber-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onBlockUser(post.authorUid)}
                title={t.community.block}
                className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Comments Section (Loaded only when expanded, limit 30) */}
      {expandedComments && (
        <div className="pt-2 space-y-3 border-t border-neutral-850 animate-in fade-in">
          {loadingComments ? (
            <p className="text-[11px] font-mono text-neutral-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-[11px] font-mono text-neutral-500">
              No comments yet. Write one below.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {comments.map((comment) => {
                const isCommentAuthor = user ? user.uid === comment.authorUid : false;
                return (
                  <div
                    key={comment.id}
                    className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-850 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-300">
                        {comment.authorName}
                      </span>
                      <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[10px]">
                        <span>{formatRelativeTime(comment.createdAt, lang)}</span>
                        {(isCommentAuthor || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-neutral-500 hover:text-red-400 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {!isCommentAuthor && user && (
                          <button
                            type="button"
                            onClick={() => onReport('comment', `buddyPosts/${post.id}/comments/${comment.id}`)}
                            title={t.community.report}
                            className="text-neutral-500 hover:text-amber-400 p-0.5 cursor-pointer"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Plain text comment */}
                    <p className="text-neutral-300 whitespace-pre-wrap select-text leading-snug">
                      {comment.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Comment Input (Signed-in with profile only) */}
          {user && profile ? (
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={t.community.addComment}
                maxLength={300}
                required
                className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-lime-400"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>{t.community.sendComment}</span>
              </button>
            </form>
          ) : user && !profile ? (
            <p className="text-[11px] font-mono text-neutral-500 text-center">
              Please complete your profile to post comments.
            </p>
          ) : null}

          {commentError && (
            <p className="text-[11px] text-red-400">{commentError}</p>
          )}
        </div>
      )}
    </div>
  );
};
