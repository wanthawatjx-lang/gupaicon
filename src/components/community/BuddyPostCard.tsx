import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { BuddyPost, BuddyPostKind, BuddyComment, UserProfile } from '../../types/community';
import {
  fetchComments,
  addComment,
  deleteComment,
  updateBuddyPostStatus,
  updateBuddyPostBody,
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
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Calendar,
} from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';

interface BuddyPostCardProps {
  post: BuddyPost;
  user: User | null;
  profile?: UserProfile | null;
  isAdmin?: boolean;
  blockedUids?: string[];
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
  onReport: (targetType: 'post' | 'comment', targetPath: string) => void;
  onBlockUser: (targetUid: string) => void;
  onStartChat?: (targetUid: string, targetName: string, targetEmoji?: string) => void;
  lang: Language;
  eventTitle?: string;
  eventDate?: string;
  onOpenEvent?: () => void;
}

export const BuddyPostCard: React.FC<BuddyPostCardProps> = ({
  post,
  user,
  profile,
  isAdmin,
  blockedUids = [],
  onPostUpdated,
  onPostDeleted,
  onReport,
  onBlockUser,
  onStartChat,
  lang,
  eventTitle,
  eventDate,
  onOpenEvent,
}) => {
  const t = translations[lang];

  const [expandedComments, setExpandedComments] = useState(false);
  const [comments, setComments] = useState<BuddyComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Edit post state (author only)
  const [isEditing, setIsEditing] = useState(false);
  const [editKind, setEditKind] = useState<BuddyPostKind>(post.kind);
  const [editBody, setEditBody] = useState(post.body);
  const [editMeetUpNote, setEditMeetUpNote] = useState(post.meetUpNote || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<{
    uid: string;
    name: string;
    emoji?: string;
  } | null>(null);
  const [inlineConfirm, setInlineConfirm] = useState<
    | { type: 'deletePost' }
    | { type: 'block'; targetUid: string }
    | null
  >(null);

  const isAuthor = user ? user.uid === post.authorUid : false;
  const canMessage = Boolean(user && profile?.ageConfirmed);

  const handleToggleComments = async () => {
    if (!expandedComments && comments.length === 0) {
      setLoadingComments(true);
      setCommentError(null);
      try {
        const list = await fetchComments(post.id, 30);
        setComments(list);
      } catch {
        setCommentError(t.states.errorMessage);
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

  const handleDeletePostConfirmed = async () => {
    if (!isAuthor && !isAdmin) return;
    try {
      await deleteBuddyPost(post.id);
      setInlineConfirm(null);
      if (onPostDeleted) onPostDeleted();
    } catch {
      setEditError(t.states.errorMessage);
    }
  };

  const handleOpenEdit = () => {
    setEditKind(post.kind);
    setEditBody(post.body);
    setEditMeetUpNote(post.meetUpNote || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = editBody.trim();
    if (clean.length < 1 || clean.length > 500) {
      setEditError(
        lang === 'th'
          ? 'ข้อความต้องมีความยาวระหว่าง 1–500 ตัวอักษร'
          : 'Message must be between 1 and 500 characters'
      );
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateBuddyPostBody(post.id, clean, editMeetUpNote.trim(), editKind);
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated();
    } catch (err: any) {
      console.error('Failed to update post:', err);
      setEditError(err?.message || 'Failed to update post');
    } finally {
      setIsSavingEdit(false);
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
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-850">
          <div className="min-w-0 space-y-0.5">
            <button
              type="button"
              onClick={onOpenEvent}
              className="text-xs font-semibold text-lime-400 hover:underline truncate max-w-[260px] text-left cursor-pointer block"
            >
              🎵 {eventTitle}
            </button>
            {eventDate && (
              <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-500 shrink-0" />
                <span>{eventDate}</span>
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(post.createdAt, lang)}
          </span>
        </div>
      )}

      {/* Author Row + Badges */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setProfileTarget({
              uid: post.authorUid,
              name: post.authorName,
              emoji: post.avatarEmoji,
            })
          }
          title={t.community.viewProfile}
          className="flex items-center gap-2 min-w-0 text-left group cursor-pointer"
        >
          <span className="text-xl shrink-0">{post.avatarEmoji || '🎸'}</span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate group-hover:text-lime-400 transition-colors">
              {post.authorName}
            </div>
            {!eventTitle && (
              <div className="text-[10px] font-mono text-neutral-500">
                {formatRelativeTime(post.createdAt, lang)}
              </div>
            )}
          </div>
        </button>

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

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="space-y-2.5 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { key: 'looking_for_buddy', label: t.community.kinds.looking_for_buddy },
                { key: 'have_extra_ticket', label: t.community.kinds.have_extra_ticket },
                { key: 'need_ticket', label: t.community.kinds.need_ticket },
              ] as { key: BuddyPostKind; label: string }[]
            ).map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setEditKind(k.key)}
                className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  editKind === k.key
                    ? 'bg-lime-400 text-black border-lime-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            maxLength={500}
            rows={3}
            required
            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-xs resize-none"
          />
          <input
            type="text"
            value={editMeetUpNote}
            onChange={(e) => setEditMeetUpNote(e.target.value)}
            placeholder={t.community.meetUpNotePlaceholder}
            maxLength={120}
            className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-lime-400 focus:outline-none text-white text-xs"
          />
          {editError && <p className="text-[11px] text-red-400">{editError}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSavingEdit}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-mono cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>{t.community.cancel}</span>
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-lime-400 text-black text-xs font-bold font-mono cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>{t.community.saveChanges}</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Post Text (Plain text only, no HTML or auto-clickable links) */}
          <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed select-text font-normal">
            {post.body}
          </p>

          {/* Meet-up Note */}
          {post.meetUpNote && (
            <div className="flex items-start gap-1.5 p-2 rounded-xl bg-neutral-950/60 border border-neutral-850 text-xs text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5" />
              <span className="leading-snug">
                <strong className="text-neutral-400 font-mono text-[10px] uppercase mr-1">{t.community.meetLabel}</strong>
                {post.meetUpNote}
              </span>
            </div>
          )}
        </>
      )}

      {/* Inline Confirmation Bar (Delete post or Block user) */}
      {inlineConfirm && (
        <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-red-200">
            {inlineConfirm.type === 'deletePost'
              ? t.community.deletePostConfirm
              : t.community.blockConfirm}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInlineConfirm(null)}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs cursor-pointer"
            >
              {t.community.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (inlineConfirm.type === 'deletePost') {
                  handleDeletePostConfirmed();
                } else {
                  onBlockUser(inlineConfirm.targetUid);
                  setInlineConfirm(null);
                }
              }}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs cursor-pointer"
            >
              {inlineConfirm.type === 'deletePost' ? t.community.deletePost : t.community.block}
            </button>
          </div>
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
          {/* Message button (Requirement 1: only users with profile and ageConfirmed can use it) */}
          {!isAuthor && onStartChat && (
            <button
              type="button"
              disabled={!canMessage}
              onClick={() => {
                if (!canMessage) return;
                onStartChat(post.authorUid, post.authorName, post.avatarEmoji);
              }}
              title={!canMessage ? t.chat.signInToMessage : t.chat.messageButton}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shadow-sm ${
                canMessage
                  ? 'bg-lime-400 hover:bg-lime-300 text-black cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>{t.chat.messageButton}</span>
            </button>
          )}

          {/* Author actions */}
          {isAuthor && !isEditing && (
            <>
              <button
                type="button"
                onClick={handleOpenEdit}
                title={t.community.editPost}
                aria-label={t.community.editPost}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-lime-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleToggleClose}
                className="min-h-[36px] px-1.5 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
              >
                {post.status === 'open' ? t.community.closePost : t.community.reopenPost}
              </button>
            </>
          )}

          {(isAuthor || isAdmin) && (
            <button
              type="button"
              onClick={() => setInlineConfirm({ type: 'deletePost' })}
              title={t.community.deletePost}
              aria-label={t.community.deletePost}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
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
                aria-label={t.community.report}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-amber-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setInlineConfirm({ type: 'block', targetUid: post.authorUid })}
                title={t.community.block}
                aria-label={t.community.block}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
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
            <p className="text-[11px] font-mono text-neutral-500">{t.community.commentsLoading}</p>
          ) : comments.filter((c) => !blockedUids.includes(c.authorUid)).length === 0 ? (
            <p className="text-[11px] font-mono text-neutral-500">
              {t.community.noCommentsYet}
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {comments
                .filter((c) => !blockedUids.includes(c.authorUid))
                .map((comment) => {
                  const isCommentAuthor = user ? user.uid === comment.authorUid : false;
                  return (
                    <div
                      key={comment.id}
                      className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-850 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setProfileTarget({
                              uid: comment.authorUid,
                              name: comment.authorName,
                            })
                          }
                          title={t.community.viewProfile}
                          className="font-bold text-neutral-300 hover:text-lime-400 transition-colors cursor-pointer"
                        >
                          {comment.authorName}
                        </button>
                        <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[10px]">
                          <span>{formatRelativeTime(comment.createdAt, lang)}</span>
                          {(isCommentAuthor || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              title={t.community.deletePost}
                              aria-label={t.community.deletePost}
                              className="text-neutral-400 hover:text-red-400 p-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isCommentAuthor && user && (
                            <>
                              <button
                                type="button"
                                onClick={() => onReport('comment', `buddyPosts/${post.id}/comments/${comment.id}`)}
                                title={t.community.report}
                                aria-label={t.community.report}
                                className="text-neutral-400 hover:text-amber-400 p-1.5 cursor-pointer"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineConfirm({ type: 'block', targetUid: comment.authorUid })}
                                title={t.community.block}
                                aria-label={t.community.block}
                                className="text-neutral-400 hover:text-red-400 p-1.5 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Plain text comment (URLs shown as plain text only) */}
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
              {t.community.completeProfileToComment}
            </p>
          ) : null}

          {commentError && (
            <p className="text-[11px] text-red-400">{commentError}</p>
          )}
        </div>
      )}

      {profileTarget && (
        <UserProfileModal
          targetUid={profileTarget.uid}
          fallbackName={profileTarget.name}
          fallbackEmoji={profileTarget.emoji}
          viewerUser={user}
          viewerProfile={profile}
          isOpen={true}
          onClose={() => setProfileTarget(null)}
          onStartChat={onStartChat}
          onBlockUser={onBlockUser}
          lang={lang}
        />
      )}
    </div>
  );
};
