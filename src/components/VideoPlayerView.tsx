import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Copy,
  CheckCircle2,
  Eye,
  Radio,
  ThumbsUp,
  Share2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { VideoItem } from '../types';
import {
  subscribeVideo,
  incrementVideoViews,
  likeVideoDoc,
  sendViewerHeartbeat,
  closeViewerSession,
  subscribeActiveViewers,
} from '../firebase';
import { formatDuration, formatNumber, formatTimeAgo } from '../utils/format';

interface VideoPlayerViewProps {
  videoId: string;
  onBack: () => void;
  onSelectVideo: (videoId: string) => void;
  allVideos: VideoItem[];
  onShowToast: (msg: string) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  videoId,
  onBack,
  onSelectVideo,
  allVideos,
  onShowToast,
}) => {
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [activeLiveViewers, setActiveLiveViewers] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(
    `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  // Subscribe to real-time video details
  useEffect(() => {
    setHasIncrementedView(false);
    const unsubscribeVideo = subscribeVideo(videoId, (data) => {
      setVideo(data);
      if (data?.duration && !duration) {
        setDuration(data.duration);
      }
    });

    const unsubscribeActive = subscribeActiveViewers(videoId, (count) => {
      // At least 1 viewer (this user who is on the page)
      setActiveLiveViewers(Math.max(1, count));
    });

    return () => {
      unsubscribeVideo();
      unsubscribeActive();
    };
  }, [videoId]);

  // Real-time Heartbeat for Viewer Analytics
  useEffect(() => {
    const sessionId = sessionIdRef.current;

    // Send initial heartbeat upon opening the page
    sendViewerHeartbeat({
      videoId,
      sessionId,
      watchedSeconds: Math.round(currentTime),
      completed: duration > 0 && currentTime >= duration * 0.9,
    });

    // Heartbeat every 8 seconds while viewer is active
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        sendViewerHeartbeat({
          videoId,
          sessionId,
          watchedSeconds: Math.round(videoRef.current.currentTime),
          completed: duration > 0 && videoRef.current.currentTime >= duration * 0.9,
        });
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      closeViewerSession(sessionId);
    };
  }, [videoId, duration]);

  // Update video element events
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);

      // Increment view count in Firebase once per session
      if (!hasIncrementedView) {
        incrementVideoViews(videoId);
        setHasIncrementedView(true);
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen error:', err);
      });
      setIsFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?v=${videoId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    onShowToast('Tautan tonton video berhasil disalin!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleLike = () => {
    if (hasLiked) return;
    setHasLiked(true);
    likeVideoDoc(videoId);
    onShowToast('Terima kasih telah menyukai video ini!');
  };

  const otherVideos = allVideos.filter((v) => v.id !== videoId);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 lg:px-8 space-y-6">
      {/* Top Navigation & Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <button
          id="btn-back-to-browse"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Jelajah</span>
        </button>

        {/* Public Guest Banner */}
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mode Bebas: Anda menonton sebagai publik tanpa perlu login</span>
        </div>
      </div>

      {/* Main Grid: Player on left (large), recommendations on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Container */}
          <div
            ref={playerContainerRef}
            id="custom-video-player-container"
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 group aspect-video flex items-center justify-center select-none"
          >
            {video?.videoUrl ? (
              <video
                ref={videoRef}
                id="html5-video-player"
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={handlePlayPause}
                className="w-full h-full object-contain cursor-pointer"
              />
            ) : (
              <div className="text-slate-500 text-sm">Memuat video...</div>
            )}

            {/* Floating Live Viewers Counter (Top Right inside video player) */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-rose-500/30 text-rose-300 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                {activeLiveViewers} Penonton Aktif
              </span>
            </div>

            {/* Play Overlay Button if paused */}
            {!isPlaying && (
              <div
                onClick={handlePlayPause}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-white" />
                </div>
              </div>
            )}

            {/* Custom Bottom Player Controls (Visible on hover or when paused) */}
            <div
              className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-200 ${
                isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
              }`}
            >
              {/* Seekbar */}
              <div className="mb-2.5">
                <input
                  id="video-seek-slider"
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-2 transition-all"
                />
              </div>

              {/* Control Buttons Bar */}
              <div className="flex items-center justify-between text-white text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <button
                    id="btn-play-pause-toggle"
                    onClick={handlePlayPause}
                    className="p-1 hover:text-rose-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>

                  <div className="flex items-center gap-1.5 group/vol">
                    <button
                      id="btn-mute-toggle"
                      onClick={toggleMute}
                      className="p-1 hover:text-rose-400 transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-rose-400" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      id="video-volume-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 sm:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  {/* Time indicator */}
                  <span className="text-slate-300 font-mono text-xs hidden sm:inline">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3 relative">
                  {/* Speed Selector */}
                  <div className="relative">
                    <button
                      id="btn-speed-toggle"
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-xs font-semibold text-slate-200 transition-colors"
                    >
                      {playbackRate}x
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-2 right-0 bg-slate-900 border border-slate-700 rounded-xl py-1 w-24 shadow-2xl z-40 text-xs">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changeSpeed(rate)}
                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 transition-colors ${
                              playbackRate === rate ? 'text-rose-400 font-bold' : 'text-slate-300'
                            }`}
                          >
                            {rate}x {rate === 1 && '(Normal)'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    id="btn-fullscreen-toggle"
                    onClick={toggleFullscreen}
                    className="p-1 hover:text-rose-400 transition-colors"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Metadata & Actions Card */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {video?.title || 'Video Tanpa Judul'}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-200">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    {formatNumber(video?.viewsCount || 0)} kali ditonton
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {formatTimeAgo(video?.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">
                    {activeLiveViewers} sedang menonton saat ini
                  </span>
                </div>
              </div>

              {/* Action Buttons: Copy Link & Like */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-player-copy-link"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Link Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Link Video
                    </>
                  )}
                </button>

                <button
                  id="btn-player-like"
                  onClick={handleLike}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all border ${
                    hasLiked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>{formatNumber((video?.likesCount || 0) + (hasLiked ? 1 : 0))}</span>
                </button>
              </div>
            </div>

            {/* Video Description */}
            {video?.description && (
              <div className="pt-3 border-t border-slate-800/80">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Deskripsi
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {video.description}
                </p>
              </div>
            )}

            {/* Tags & Uploaded By */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-1.5">
                {video?.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium text-[11px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <div>
                Diupload oleh: <span className="text-slate-300">{video?.uploadedBy || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Other Recommended Videos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Video Lainnya
            </h3>
            <span className="text-xs text-slate-500">{otherVideos.length} Video</span>
          </div>

          <div className="space-y-3">
            {otherVideos.length === 0 ? (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                Belum ada video lainnya. Admin dapat mengunggah lebih banyak video di menu Studio!
              </div>
            ) : (
              otherVideos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectVideo(item.id)}
                  className="p-2.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex gap-3 group"
                >
                  <div className="w-28 h-18 rounded-xl overflow-hidden relative shrink-0 bg-slate-950">
                    <img
                      src={
                        item.thumbnailUrl ||
                        'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      {formatDuration(item.duration)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-400 line-clamp-2 transition-colors">
                      {item.title}
                    </h4>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p>{formatNumber(item.viewsCount)} tayangan</p>
                      <p className="text-slate-500">{formatTimeAgo(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
