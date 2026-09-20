import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Radio,
  Eye,
  Clock,
  CheckCircle2,
  Users,
  Copy,
  Play,
  Trash2,
  ExternalLink,
  Smartphone,
  Monitor,
  Flame,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { VideoItem, ViewerSession, AdminUser } from '../types';
import { subscribeAllViewerSessions, deleteVideoDoc } from '../firebase';
import { formatDuration, formatNumber, formatTimeAgo } from '../utils/format';

interface AnalyticsDashboardProps {
  videos: VideoItem[];
  adminUser: AdminUser | null;
  onWatchVideo: (videoId: string) => void;
  onOpenLoginModal: () => void;
  onShowToast: (msg: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  videos,
  adminUser,
  onWatchVideo,
  onOpenLoginModal,
  onShowToast,
}) => {
  const [sessions, setSessions] = useState<ViewerSession[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to real-time viewer sessions
  useEffect(() => {
    const unsubscribe = subscribeAllViewerSessions((data) => {
      setSessions(data);
    });
    return () => unsubscribe();
  }, []);

  // Compute Active Live Viewers across all videos (heartbeat in last 25s)
  const nowMs = Date.now();
  const thresholdMs = nowMs - 25000;

  const activeSessions = sessions.filter(
    (s) => s.lastActiveAt && new Date(s.lastActiveAt).getTime() > thresholdMs
  );

  const totalViews = videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
  const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount || 0), 0);
  const totalWatchSeconds = sessions.reduce((acc, s) => acc + (s.watchedSeconds || 0), 0);
  const totalCompleted = sessions.filter((s) => s.completed).length;
  const completionRate =
    sessions.length > 0 ? Math.round((totalCompleted / sessions.length) * 100) : 0;

  // Active viewers count per video
  const getActiveForVideo = (videoId: string) => {
    return activeSessions.filter((s) => s.videoId === videoId).length;
  };

  const handleCopyLink = (videoId: string) => {
    const link = `${window.location.origin}/?v=${videoId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(videoId);
    onShowToast('Tautan tonton video berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDeleteVideo = async (videoId: string, title: string) => {
    if (!adminUser) {
      onOpenLoginModal();
      return;
    }
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus video "${title}"?`);
    if (confirmed) {
      try {
        await deleteVideoDoc(videoId);
        onShowToast(`Video "${title}" berhasil dihapus.`);
      } catch (err: any) {
        console.error('Delete error:', err);
        onShowToast('Gagal menghapus video.');
      }
    }
  };

  // Find most popular video
  const topVideo = [...videos].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Firebase Firestore Stream
            </span>
            <span className="text-xs text-slate-400">Pembaruan Real-Time Aktif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1.5">
            Sistem Analitik Penonton
          </h1>
          <p className="text-sm text-slate-400">
            Pantau jumlah penonton aktif secara langsung, total tayangan video, dan sesi interaksi.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Sedang Nonton Sekarang</p>
            <p className="text-lg font-bold text-white flex items-center gap-2">
              {activeSessions.length} Penonton
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full animate-ping">
                LIVE
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Views */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tayangan
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {formatNumber(totalViews)}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Dari {videos.length} video diterbitkan
            </p>
          </div>
        </div>

        {/* Card 2: Live Viewers */}
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Penonton Aktif (Live)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {activeSessions.length}
              <span className="text-xs font-normal text-rose-400">online</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeSessions.length > 0 ? 'Sedang streaming video' : 'Belum ada viewer aktif'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Watch Time */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Waktu Tonton
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {Math.round(totalWatchSeconds / 60)} Menit
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ~{formatDuration(totalWatchSeconds)} total durasi
            </p>
          </div>
        </div>

        {/* Card 4: Total Suka & Sesi */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Suka &amp; Sesi
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {formatNumber(totalLikes)} <span className="text-lg text-slate-400 font-normal">Suka</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {sessions.length} sesi penonton tercatat
            </p>
          </div>
        </div>
      </div>

      {/* Visual Chart: Views per Video Performance */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Statistik Tayangan per Video
            </h3>
            <p className="text-xs text-slate-400">
              Perbandingan jumlah penonton dan status penonton real-time di tiap video.
            </p>
          </div>
          {topVideo && (
            <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Video Terpopuler:{' '}
              <strong className="text-indigo-300 font-semibold">{topVideo.title}</strong> (
              {formatNumber(topVideo.viewsCount)} views)
            </div>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Belum ada data video. Unggah video pertama untuk memantau performa analitik.
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((vid) => {
              const liveCount = getActiveForVideo(vid.id);
              const maxViews = Math.max(...videos.map((v) => v.viewsCount || 0), 1);
              const pct = Math.min(100, Math.max(8, Math.round(((vid.viewsCount || 0) / maxViews) * 100)));

              return (
                <div key={vid.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate max-w-md">
                      <span className="font-semibold text-slate-200 truncate">{vid.title}</span>
                      {liveCount > 0 && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-bold border border-rose-500/30 shrink-0">
                          {liveCount} Live
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 shrink-0">
                      {formatNumber(vid.viewsCount)} views ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Columns: Live Viewer Session Feed & Video Management Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Detailed Video Performance Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Daftar &amp; Monitoring Video ({videos.length})
            </h3>
            <span className="text-xs text-slate-500">Diperbarui otomatis via Firebase</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Video</th>
                    <th className="px-3 py-3 text-center">Penonton Live</th>
                    <th className="px-3 py-3 text-center">Total Tayangan</th>
                    <th className="px-3 py-3 text-center">Suka</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Belum ada video yang diunggah.
                      </td>
                    </tr>
                  ) : (
                    videos.map((vid) => {
                      const liveCount = getActiveForVideo(vid.id);
                      const isCopied = copiedId === vid.id;

                      return (
                        <tr key={vid.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <img
                              src={
                                vid.thumbnailUrl ||
                                'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=300'
                              }
                              alt={vid.title}
                              className="w-12 h-8 object-cover rounded-lg shrink-0 border border-slate-700"
                            />
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                              <p className="font-semibold text-white truncate">{vid.title}</p>
                              <p className="text-[10px] text-slate-500">
                                {formatDuration(vid.duration)} • {formatTimeAgo(vid.createdAt)}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            {liveCount > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                                {liveCount} Live
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center font-semibold text-white">
                            {formatNumber(vid.viewsCount)}
                          </td>

                          <td className="px-3 py-3 text-center text-slate-300">
                            {formatNumber(vid.likesCount || 0)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Copy Link Button */}
                              <button
                                id={`btn-copy-link-${vid.id}`}
                                onClick={() => handleCopyLink(vid.id)}
                                title="Salin Tautan Tonton Video"
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* Watch Video Button */}
                              <button
                                id={`btn-watch-${vid.id}`}
                                onClick={() => onWatchVideo(vid.id)}
                                title="Tonton Video"
                                className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-colors"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Video Button (Admin) */}
                              {adminUser && (
                                <button
                                  id={`btn-delete-${vid.id}`}
                                  onClick={() => handleDeleteVideo(vid.id, vid.title)}
                                  title="Hapus Video"
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Viewer Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              Sesi Penonton Terakhir
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {activeSessions.length} Aktif
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5 max-h-[460px] overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Belum ada rekaman sesi penonton. Sesi otomatis tercatat ketika ada yang menonton video.
              </div>
            ) : (
              sessions.slice(0, 15).map((s) => {
                const isActive = s.lastActiveAt && new Date(s.lastActiveAt).getTime() > thresholdMs;
                const matchedVideo = videos.find((v) => v.id === s.videoId);

                return (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[11px] text-slate-300 font-semibold truncate max-w-[140px]">
                        {s.viewerSessionId}
                      </span>
                      {isActive ? (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                          Sedang Nonton
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {formatTimeAgo(s.lastActiveAt)}
                        </span>
                      )}
                    </div>

                    <p className="text-white font-medium truncate mb-1">
                      {matchedVideo ? matchedVideo.title : `Video ID: ${s.videoId}`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1">
                        {s.device === 'Mobile' ? (
                          <Smartphone className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Monitor className="w-3 h-3 text-slate-400" />
                        )}
                        {s.device || 'Web'}
                      </span>
                      <span>Durasi: {formatDuration(s.watchedSeconds)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
