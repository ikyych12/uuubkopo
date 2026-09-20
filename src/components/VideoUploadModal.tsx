import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileVideo,
  CheckCircle2,
  Copy,
  ExternalLink,
  BarChart3,
  AlertCircle,
  Play,
  Film,
  Sparkles,
  RefreshCw,
  Link2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { addVideoDoc } from '../firebase';
import { formatBytes, formatDuration } from '../utils/format';
import type { AdminUser } from '../types';

interface VideoUploadModalProps {
  adminUser: AdminUser;
  onUploadSuccess: (videoId: string) => void;
  onWatchVideo: (videoId: string) => void;
  onGoToAnalytics: () => void;
  onShowToast: (msg: string) => void;
}

interface SamplePreset {
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration: number;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  adminUser,
  onUploadSuccess,
  onWatchVideo,
  onGoToAnalytics,
  onShowToast,
}) => {
  const [activeMode, setActiveMode] = useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number>(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tags, setTags] = useState('Streaming, HD');

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Presets
  const [samplePresets, setSamplePresets] = useState<SamplePreset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sample videos from backend
  useEffect(() => {
    fetch('/api/sample-videos')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSamplePresets(data);
        }
      })
      .catch((err) => console.log('Sample videos fetch error:', err));
  }, []);

  // Generate thumbnail from local video file
  const generateThumbnailFromFile = (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        setDetectedDuration(Math.round(video.duration) || 0);
        video.currentTime = Math.min(1.5, video.duration / 2);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewThumbnail(dataUrl);
        }
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.warn('Thumbnail generation error:', e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('Harap pilih file video yang valid (.mp4, .webm, dsb.)');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    if (!title) {
      // Auto-set clean title from filename
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
    generateThumbnailFromFile(file);
  };

  const handleSelectPreset = (preset: SamplePreset) => {
    setActiveMode('url');
    setTitle(preset.title);
    setDescription(preset.description);
    setVideoUrl(preset.url);
    setPreviewThumbnail(preset.thumbnail);
    setDetectedDuration(preset.duration);
    setErrorMsg(null);
    onShowToast(`Template video "${preset.title}" dipilih!`);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activeMode === 'file' && !selectedFile) {
      setErrorMsg('Silakan pilih file video untuk diunggah.');
      return;
    }

    if (activeMode === 'url' && !videoUrl.trim()) {
      setErrorMsg('Silakan masukkan tautan video yang valid.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Judul video wajib diisi.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      let finalVideoUrl = videoUrl;
      let finalFileSize = selectedFile?.size || 0;

      // 1. If uploading file to full-stack Express server
      if (activeMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('video', selectedFile);

        // Use XMLHttpRequest to track actual upload progress
        const uploadResult = await new Promise<{ url: string; size: number }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 85);
              setUploadProgress(Math.max(10, pct));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                resolve({ url: res.url, size: res.size });
              } catch (parseErr) {
                reject(new Error('Format balasan server tidak valid.'));
              }
            } else {
              reject(new Error(`Gagal mengunggah file (Kode ${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Kesalahan koneksi saat mengunggah video.'));
          xhr.send(formData);
        });

        finalVideoUrl = uploadResult.url;
        finalFileSize = uploadResult.size;
      }

      setUploadProgress(90);

      // 2. Save metadata & real-time doc to Firebase Firestore
      const newVideoDocId = await addVideoDoc({
        title: title.trim(),
        description: description.trim() || 'Video diunggah oleh admin melalui StreamCast Real-Time.',
        videoUrl: finalVideoUrl,
        thumbnailUrl:
          previewThumbnail ||
          'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=60',
        duration: detectedDuration || 60,
        fileSize: finalFileSize,
        uploadedBy: adminUser.email || 'admin@streamcast.app',
        createdAt: new Date().toISOString(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      setUploadProgress(100);
      setUploadedVideoId(newVideoDocId);

      // Trigger festive celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe ignore
      }

      onUploadSuccess(newVideoDocId);
      onShowToast('Video berhasil diunggah dan disimpan ke Firebase!');
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Gagal mengunggah video. Coba lagi.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFullShareLink = (id: string) => {
    const origin = window.location.origin;
    return `${origin}/?v=${id}`;
  };

  const handleCopyLink = (id: string) => {
    const link = getFullShareLink(id);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    onShowToast('Tautan tonton video berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const resetForm = () => {
    setUploadedVideoId(null);
    setSelectedFile(null);
    setPreviewThumbnail(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setUploadProgress(0);
    setErrorMsg(null);
    setCopiedLink(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Uploaded Success View */}
      {uploadedVideoId ? (
        <div
          id="upload-success-container"
          className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Video Siap Ditonton &amp; Dibagikan
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
                Video Berhasil Diunggah!
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Video sudah tersimpan di Firebase Firestore real-time. Siapa pun bisa menonton lewat
                tautan tanpa perlu login.
              </p>
            </div>

            {/* Link Box */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-left space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                Tautan Tonton Video Publik (User Tanpa Login)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="input-shareable-link"
                  readOnly
                  value={getFullShareLink(uploadedVideoId)}
                  className="w-full bg-slate-900 border border-slate-700/80 text-xs sm:text-sm font-mono text-slate-200 px-3.5 py-2.5 rounded-xl select-all focus:outline-none focus:border-indigo-500"
                />
                <button
                  id="btn-copy-video-link"
                  onClick={() => handleCopyLink(uploadedVideoId)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Salin Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Kirimkan tautan ini kepada penonton Anda. Penonton langsung streaming secara real-time.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="btn-watch-uploaded-video"
                onClick={() => onWatchVideo(uploadedVideoId)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
              >
                <Play className="w-4 h-4" />
                Buka &amp; Tonton Video
              </button>

              <button
                id="btn-analytics-uploaded-video"
                onClick={onGoToAnalytics}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm flex items-center gap-2 transition-all border border-slate-700"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Pantau Analitik Real-Time
              </button>

              <button
                id="btn-upload-another"
                onClick={resetForm}
                className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Upload Video Lain
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload Form Container */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-md">
                  Studio Admin
                </span>
                <span className="text-xs text-slate-400">
                  Login sebagai: <strong className="text-slate-200">{adminUser.email}</strong>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Unggah Video Baru
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Unggah video lokal atau gunakan tautan URL. Video langsung tersedia secara publik tanpa login penonton.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                id="tab-upload-file"
                onClick={() => setActiveMode('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeMode === 'file'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileVideo className="w-3.5 h-3.5" />
                Upload File Lokal
              </button>
              <button
                type="button"
                id="tab-upload-url"
                onClick={() => setActiveMode('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeMode === 'url'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                URL / Preset Video
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="mt-6 space-y-6">
            {/* File Dropzone or URL input */}
            {activeMode === 'file' ? (
              <div>
                <input
                  ref={fileInputRef}
                  id="file-input-video"
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-indigo-500/60 bg-indigo-950/20'
                      : 'border-slate-700/80 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  {selectedFile ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white truncate max-w-md mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-indigo-300">
                        Ukuran: {formatBytes(selectedFile.size)}{' '}
                        {detectedDuration > 0 && `• Durasi: ~${formatDuration(detectedDuration)}`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Klik untuk mengganti file video
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-slate-200">
                        Klik untuk memilih video atau seret file ke sini
                      </p>
                      <p className="text-xs text-slate-500">
                        Mendukung MP4, WebM, MOV, MKV (hingga 500 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Direct Video URL (MP4 / WebM)
                  </label>
                  <input
                    id="input-video-url"
                    type="url"
                    required
                    placeholder="https://example.com/video.mp4"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                {/* Sample Presets */}
                {samplePresets.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Atau pilih video preset siap pakai (Cepat &amp; Bebas Royalti):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {samplePresets.map((preset, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                            videoUrl === preset.url
                              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                          }`}
                        >
                          <img
                            src={preset.thumbnail}
                            alt={preset.title}
                            className="w-14 h-10 object-cover rounded-lg shrink-0 border border-slate-800"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {preset.title}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Durasi: {formatDuration(preset.duration)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Thumbnail Preview if available */}
            {previewThumbnail && (
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center gap-4">
                <img
                  src={previewThumbnail}
                  alt="Thumbnail Preview"
                  className="w-24 h-14 object-cover rounded-xl border border-slate-700"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Thumbnail Otomatis Siap
                  </span>
                  <p className="text-xs text-slate-300">
                    Cuplikan frame video berhasil di-generate secara otomatis untuk pratinjau penonton.
                  </p>
                </div>
              </div>
            )}

            {/* Video Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 md:col-span-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Judul Video <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-video-title"
                    type="text"
                    required
                    placeholder="Contoh: Tutorial React Real-Time Firestore..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Deskripsi Video
                  </label>
                  <textarea
                    id="input-video-description"
                    rows={3}
                    placeholder="Tuliskan deskripsi singkat mengenai video ini..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kategori / Tag (Dipisah koma)
                </label>
                <input
                  id="input-video-tags"
                  type="text"
                  placeholder="Edukasi, Streaming, Hiburan"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perkiraan Durasi (Detik)
                </label>
                <input
                  id="input-video-duration"
                  type="number"
                  min={1}
                  value={detectedDuration || 60}
                  onChange={(e) => setDetectedDuration(parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Progress Bar during Upload */}
            {isUploading && (
              <div className="space-y-2 p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sedang mengunggah &amp; sinkronisasi ke Firebase Firestore...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                id="btn-submit-upload"
                type="submit"
                disabled={isUploading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-indigo-600/25 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Mengunggah Video...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Unggah &amp; Terbitkan Video
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
