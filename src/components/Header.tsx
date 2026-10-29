import React from 'react';
import { User } from 'firebase/auth';
import { Shield, Radio, List, Compass } from 'lucide-react';
import { isUserAdmin } from '../firebase';

interface HeaderProps {
  venuesCount: number;
  user: User | null;
  onOpenAdmin: () => void;
  onToggleList: () => void;
  isListOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  venuesCount,
  user,
  onOpenAdmin,
  onToggleList,
  isListOpen,
}) => {
  const isAdmin = user ? isUserAdmin(user.email) : false;

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
        <div className="flex items-center gap-1.5">
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

          {/* Admin Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium backdrop-blur-md transition-all cursor-pointer shadow-lg border ${
              isAdmin
                ? 'bg-neutral-900 text-lime-400 border-lime-400/50 hover:bg-neutral-800'
                : user
                ? 'bg-neutral-950/90 text-neutral-300 border-neutral-800 hover:text-white'
                : 'bg-neutral-950/90 text-neutral-400 hover:text-white border-neutral-800'
            }`}
            title={user ? `Signed in: ${user.email}` : 'Admin Access (/admin)'}
          >
            <Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-lime-400' : ''}`} />
            <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Login'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
