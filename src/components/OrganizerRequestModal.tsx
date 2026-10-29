import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { OrganizerRequest, OrganizerRequestFormData } from '../types/organizer';
import { submitOrganizerRequest } from '../services/organizerService';
import {
  X,
  BadgeCheck,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Instagram,
  Mail,
  FileText,
  Building2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface OrganizerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentRequest: OrganizerRequest | null;
  isApprovedOrganizer: boolean;
}

export const OrganizerRequestModal: React.FC<OrganizerRequestModalProps> = ({
  isOpen,
  onClose,
  user,
  currentRequest,
  isApprovedOrganizer,
}) => {
  const [formData, setFormData] = useState<OrganizerRequestFormData>({
    promoterName: currentRequest?.promoterName || '',
    igUrl: currentRequest?.igUrl || '',
    contactEmail: currentRequest?.contactEmail || user?.email || '',
    note: currentRequest?.note || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage('Failed to sign in with Google. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.promoterName.trim()) {
      setErrorMessage('Promoter / Collective name is required.');
      return;
    }
    if (!formData.igUrl.trim()) {
      setErrorMessage('Official Instagram URL is required.');
      return;
    }
    if (!formData.contactEmail.trim()) {
      setErrorMessage('Contact email is required.');
      return;
    }
    if (!formData.note.trim()) {
      setErrorMessage('Please provide a short verification note.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitOrganizerRequest(user.uid, formData);
      setSuccessMessage('Application submitted successfully! Our team will review your verification details.');
    } catch (err: any) {
      console.error('Submit organizer request error:', err);
      setErrorMessage('Failed to submit application. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-labelledby="organizer-modal-title"
        className="relative z-10 w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400">
              <BadgeCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 id="organizer-modal-title" className="text-lg font-bold text-white font-display">
                Organizer Verification
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Manage gigs & direct verified ticket updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
          {/* Status Alert Banners */}
          {isApprovedOrganizer ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>You are an Approved Organizer!</span>
              </div>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Your account is verified. You can create and manage events, and update ticket statuses in real time.
              </p>
              <a
                href="#/organizer"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-xs hover:bg-emerald-300 transition-colors shadow-md"
              >
                <span>Go to Organizer Dashboard</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : currentRequest?.status === 'pending' ? (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Application Under Review</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                We received your verification request for <strong>{currentRequest.promoterName}</strong>. Our team is verifying your Instagram handle. We will approve your promoter access shortly.
              </p>
            </div>
          ) : currentRequest?.status === 'rejected' ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Application Not Approved</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                Your previous verification request was not approved. You may submit an updated request with more details below.
              </p>
            </div>
          ) : null}

          {/* If NOT signed in */}
          {!user ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
              <Building2 className="w-10 h-10 text-lime-400 mx-auto opacity-80" />
              <div>
                <h3 className="text-sm font-bold text-white">Sign In to Apply</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Organizer accounts are linked to your Google account for secure management of your concert listings.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignIn}
                className="py-3 px-5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-98 transition-all inline-flex items-center gap-2.5 shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Promoter Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Promoter / Collective Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={formData.promoterName}
                    onChange={(e) => setFormData({ ...formData, promoterName: e.target.value })}
                    placeholder="e.g. Seen Scene Space, Fungjai, Maho Rasop"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-hidden focus:border-lime-400 placeholder:text-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Instagram URL */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Official Instagram URL *
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="url"
                    required
                    value={formData.igUrl}
                    onChange={(e) => setFormData({ ...formData, igUrl: e.target.value })}
                    placeholder="https://instagram.com/your_promoter_handle"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-hidden focus:border-lime-400 placeholder:text-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="promoter@domain.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-hidden focus:border-lime-400 placeholder:text-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Verification Note */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Verification Note *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                  <textarea
                    required
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="How we can verify you (e.g. DM sent to @gupaicon from our official IG, official website link, or ticket platform listing)"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-hidden focus:border-lime-400 placeholder:text-neutral-600 transition-colors resize-none"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  We verify every promoter to keep ticket status badges 100% reliable for concert goers.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-bold text-sm hover:bg-lime-300 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-lime-950/40"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{currentRequest ? 'Update Verification Request' : 'Submit Application'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
