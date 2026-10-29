import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut, isUserAdmin } from '../firebase';
import { Shield, Radio, List, LogIn, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  venuesCount: number;
  user: User | null;
  isApprovedOrganizer?: boolean;
  onOpenAdmin: () => void;
  onOpenOrganizerDashboard?: () => void;
  onOpenOrganizerRequest?: () => void;
  onToggleList: () => void;
  isListOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  venuesCount,
  user,
  isApprovedOrganizer = false,
  onOpenAdmin,
  onOpenOrganizerDashboard,
  onOpenOrganizerRequest,
  onToggleList,
  isListOpen,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isAdmin = user ? isUserAdmin(user.email) : false;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Sign-in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-500 pointer-events-none p-3 sm:p-4">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2 pointer-events-auto">
        {/* Logo Card */}
        <div className="flex items-center gap-2.5 bg-neutral-950/90 border border-neutral-800/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-lime-400 text-black">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold tracking-tight text-white text-base font-mono">
                gupaicon
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
            </div>
            <p className="text-[10px] text-neutral-400 tracking-wider uppercase font-medium mt-0.5">
              Bangkok & Rangsit
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 relative">
          {/* Venue Count / List Toggle */}
          <button
            type="button"
            onClick={onToggleList}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg border ${
              isListOpen
                ? 'bg-lime-400 text-black border-lime-400'
                : 'bg-neutral-950/90 text-neutral-200 hover:text-white border-neutral-800/90 hover:bg-neutral-900'
            }`}
            title="Browse Venues List"
          >
            <List className="w-3.5 h-3.5" />
            <span>{venuesCount}</span>
          </button>

          {/* Approved Organizer Dashboard quick button */}
          {isApprovedOrganizer && onOpenOrganizerDashboard && (
            <button
              type="button"
              onClick={onOpenOrganizerDashboard}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-600/60 hover:bg-sky-900/80 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title="Open Organizer Console"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Organizer</span>
            </button>
          )}

          {/* User / Auth / Admin Controls */}
          {!user ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenOrganizerRequest}
                className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-mono text-neutral-400 hover:text-white bg-neutral-950/80 border border-neutral-800/80 hover:bg-neutral-900 transition-colors cursor-pointer"
                title="Organizer verification"
              >
                <span>For Organizers</span>
              </button>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white backdrop-blur-md transition-all cursor-pointer shadow-lg"
                title="Sign in with Google to report ticket status"
              >
                <LogIn className="w-3.5 h-3.5 text-lime-400" />
                <span>Sign In</span>
              </button>
            </div>
          ) : isAdmin ? (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-neutral-900 text-lime-400 border border-lime-400/60 hover:bg-neutral-850 backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title={`Admin Console (${user.email})`}
            >
              <Shield className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white backdrop-blur-md transition-all cursor-pointer shadow-lg max-w-[120px] sm:max-w-none truncate"
                title={`Signed in as ${user.email}`}
              >
                <UserIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{user.displayName || user.email?.split('@')[0]}</span>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-neutral-900 border border-neutral-800 p-2 shadow-2xl z-550 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[11px] font-mono text-neutral-400 truncate border-b border-neutral-800 pb-1.5 mb-1">
                    {user.email}
                  </div>

                  {isApprovedOrganizer && onOpenOrganizerDashboard ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenOrganizerDashboard();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-sky-300 hover:bg-sky-950/50 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      <span>Organizer Dashboard</span>
                    </button>
                  ) : onOpenOrganizerRequest ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenOrganizerRequest();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-lime-400" />
                      <span>For Organizers</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAdmin();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Admin Panel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer border-t border-neutral-800 pt-1.5 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
