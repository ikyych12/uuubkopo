import React from 'react';
import {
  Video,
  BarChart3,
  Upload,
  UserCheck,
  LogIn,
  LogOut,
  Radio,
  PlaySquare,
  ShieldCheck,
} from 'lucide-react';
import type { AdminUser } from '../types';

interface NavbarProps {
  currentTab: 'browse' | 'watch' | 'upload' | 'analytics';
  setCurrentTab: (tab: 'browse' | 'watch' | 'upload' | 'analytics') => void;
  adminUser: AdminUser | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  activeVideoId?: string | null;
  totalActiveLiveViewers: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  adminUser,
  onOpenLoginModal,
  onLogout,
  activeVideoId,
  totalActiveLiveViewers,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          id="nav-brand-logo"
          onClick={() => setCurrentTab('browse')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/20 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                StreamCast
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                Real-Time
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Video Share &amp; Live Viewers</p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="nav-btn-browse"
            onClick={() => setCurrentTab('browse')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'browse'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <PlaySquare className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">Jelajah Video</span>
          </button>

          {activeVideoId && (
            <button
              id="nav-btn-watch"
              onClick={() => setCurrentTab('watch')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                currentTab === 'watch'
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Sedang Nonton</span>
            </button>
          )}

          <button
            id="nav-btn-upload"
            onClick={() => {
              if (adminUser) {
                setCurrentTab('upload');
              } else {
                onOpenLoginModal();
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'upload'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Upload Video</span>
            {!adminUser && (
              <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                Admin
              </span>
            )}
          </button>

          <button
            id="nav-btn-analytics"
            onClick={() => setCurrentTab('analytics')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'analytics'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Analitik Penonton</span>
            {totalActiveLiveViewers > 0 && (
              <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {totalActiveLiveViewers} Live
              </span>
            )}
          </button>
        </nav>

        {/* Right Status & Auth */}
        <div className="flex items-center gap-3">
          {adminUser ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                  {adminUser.email || 'Admin'}
                </p>
                <p className="text-[10px] text-emerald-400 font-medium">Akun Admin Aktif</p>
              </div>
              <button
                id="btn-admin-logout"
                onClick={onLogout}
                title="Keluar Admin"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>User: Tanpa Login</span>
              </div>
              <button
                id="btn-open-admin-login"
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
