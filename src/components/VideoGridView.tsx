import React, { useState } from 'react';
import {
  Play,
  Copy,
  CheckCircle2,
  Eye,
  Radio,
  Clock,
  Search,
  SlidersHorizontal,
  UploadCloud,
  Film,
  Sparkles,
  Share2,
} from 'lucide-react';
import type { VideoItem, AdminUser } from '../types';
import { formatDuration, formatNumber, formatTimeAgo } from '../utils/format';

interface VideoGridViewProps {
  videos: VideoItem[];
  adminUser: AdminUser | null;
  onSelectVideo: (videoId: string) => void;
  onOpenUpload: () => void;
  onOpenLoginModal: () => void;
  onShowToast: (msg: string) => void;
  totalActiveLiveViewers: number;
}

export const VideoGridView: React.FC<VideoGridViewProps> = ({
  videos,
  adminUser,
  onSelectVideo,
  onOpenUpload,
  onOpenLoginModal,
  onShowToast,
  totalActiveLiveViewers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'duration'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/?v=${videoId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(videoId);
    onShowToast('Tautan video berhasil disalin! Bagikan ke teman Anda.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter and sort videos
  const filteredVideos = videos
    .filter((v) => {
      const q = searchQuery.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.tags?.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return (b.viewsCount || 0) - (a.viewsCount || 0);
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0);
      // Default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 lg:px-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800/80 p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            Real-Time Streaming &amp; Analytics
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Tonton Video Bebas Hambatan Tanpa Perlu Login
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Platform streaming video instan. Pengguna dapat langsung menonton video dengan salin tautan,
            sementara admin memantau analitik penonton aktif secara real-time via Firebase.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {adminUser ? (
              <button
                id="btn-hero-upload"
                onClick={onOpenUpload}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Video Baru (Admin)
              </button>
            ) : (
              <button
                id="btn-hero-login"
                onClick={onOpenLoginModal}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Masuk sebagai Admin untuk Upload
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>
                Total <strong className="text-white">{videos.length}</strong> Video Tersedia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-videos"
            type="text"
            placeholder="Cari video atau tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">Urutkan:</span>
          <select
            id="select-sort-videos"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="newest">Terbaru</option>
            <option value="popular">Paling Banyak Ditonton</option>
            <option value="duration">Durasi Terpanjang</option>
          </select>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {searchQuery ? 'Video tidak ditemukan' : 'Belum ada video'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain.`
                : 'Mulai dengan mengunggah video pertama Anda melalui akun admin.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={adminUser ? onOpenUpload : onOpenLoginModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              {adminUser ? 'Unggah Video Sekarang' : 'Masuk sebagai Admin untuk Unggah'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((item) => {
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectVideo(item.id)}
                className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  <img
                    src={
                      item.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600'
                    }
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 ml-0.5 fill-white" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <span className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm text-white text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold">
                    {formatDuration(item.duration)}
                  </span>

                  {/* Copy Link Button (Quick Access right on card) */}
                  <button
                    onClick={(e) => handleCopyLink(e, item.id)}
                    title="Salin Tautan Video"
                    className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition-all shadow-md ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-rose-400 line-clamp-2 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                      {item.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      {formatNumber(item.viewsCount)} tayangan
                    </span>
                    <span>{formatTimeAgo(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
