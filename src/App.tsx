/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VideoGridView } from './components/VideoGridView';
import { VideoPlayerView } from './components/VideoPlayerView';
import { VideoUploadModal } from './components/VideoUploadModal';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ToastNotification } from './components/ToastNotification';
import {
  subscribeVideos,
  subscribeAllViewerSessions,
  auth,
  onAuthStateChanged,
  signOut,
  addVideoDoc,
} from './firebase';
import type { VideoItem, AdminUser, ViewerSession } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'browse' | 'watch' | 'upload' | 'analytics'>('browse');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [sessions, setSessions] = useState<ViewerSession[]>([]);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasInitializedSeed, setHasInitializedSeed] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAdminUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
          isAdmin: true,
        });
      } else {
        setAdminUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Listen to URL parameters for direct video links (e.g. ?v=VIDEO_ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoParam = params.get('v');
    if (videoParam) {
      setSelectedVideoId(videoParam);
      setCurrentTab('watch');
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('v');
      if (v) {
        setSelectedVideoId(v);
        setCurrentTab('watch');
      } else {
        setSelectedVideoId(null);
        setCurrentTab('browse');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 3. Subscribe to Real-time Firestore Videos
  useEffect(() => {
    const unsubscribe = subscribeVideos((items) => {
      setVideos(items);

      // If database has 0 videos on first load, seed 2 starter videos for instant preview
      if (items.length === 0 && !hasInitializedSeed) {
        setHasInitializedSeed(true);
        seedInitialVideos();
      }
    });

    return () => unsubscribe();
  }, [hasInitializedSeed]);

  // Seed sample starter videos so user has instant playable content
  const seedInitialVideos = async () => {
    try {
      await addVideoDoc({
        title: 'Big Buck Bunny (Cuplikan Animasi HD)',
        description:
          'Animasi open-source klasik 3D karya Blender Foundation. Contoh video siap tonton dengan pemutar video responsif dan analitik penonton.',
        videoUrl:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60',
        duration: 596,
        fileSize: 158008374,
        uploadedBy: 'admin@streamcast.app',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        tags: ['Animasi', 'Blender', 'HD', 'Contoh'],
      });

      await addVideoDoc({
        title: 'For Bigger Blazes (Sinematik 4K Pemandangan)',
        description:
          'Video landscape sinematik dengan visual menawan dan audio jernih. Cocok untuk menguji streaming instan dan analitik.',
        videoUrl:
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60',
        duration: 15,
        fileSize: 15000000,
        uploadedBy: 'admin@streamcast.app',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        tags: ['Nature', 'Cinematic', '4K'],
      });
    } catch (e) {
      console.warn('Seed error (may already exist):', e);
    }
  };

  // 4. Subscribe to Real-time Sessions for live viewer pulse
  useEffect(() => {
    const unsubscribe = subscribeAllViewerSessions((data) => {
      setSessions(data);
    });
    return () => unsubscribe();
  }, []);

  // Compute live active viewers (heartbeat within 25 seconds)
  const nowMs = Date.now();
  const activeSessionsCount = sessions.filter(
    (s) => s.lastActiveAt && new Date(s.lastActiveAt).getTime() > nowMs - 25000
  ).length;

  // Handle selecting a video to watch
  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    setCurrentTab('watch');
    const newUrl = `${window.location.pathname}?v=${videoId}`;
    window.history.pushState({ videoId }, '', newUrl);
  };

  // Handle navigating back to browse
  const handleBackToBrowse = () => {
    setSelectedVideoId(null);
    setCurrentTab('browse');
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setAdminUser(null);
    showToast('Berhasil keluar dari akun admin.');
    if (currentTab === 'upload') {
      setCurrentTab('browse');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'watch') {
            window.history.pushState({}, '', window.location.pathname);
          }
          setCurrentTab(tab);
        }}
        adminUser={adminUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        activeVideoId={selectedVideoId}
        totalActiveLiveViewers={activeSessionsCount}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {currentTab === 'browse' && (
          <VideoGridView
            videos={videos}
            adminUser={adminUser}
            onSelectVideo={handleSelectVideo}
            onOpenUpload={() => setCurrentTab('upload')}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onShowToast={showToast}
            totalActiveLiveViewers={activeSessionsCount}
          />
        )}

        {currentTab === 'watch' && selectedVideoId && (
          <VideoPlayerView
            videoId={selectedVideoId}
            onBack={handleBackToBrowse}
            onSelectVideo={handleSelectVideo}
            allVideos={videos}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'upload' && (
          <>
            {adminUser ? (
              <VideoUploadModal
                adminUser={adminUser}
                onUploadSuccess={(vid) => {
                  setSelectedVideoId(vid);
                }}
                onWatchVideo={handleSelectVideo}
                onGoToAnalytics={() => setCurrentTab('analytics')}
                onShowToast={showToast}
              />
            ) : (
              <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Akses Khusus Admin</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    User umum dapat menonton tanpa login. Untuk mengunggah video, silakan masuk dengan akun admin terlebih dahulu.
                  </p>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
                  >
                    Buka Login Admin
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {currentTab === 'analytics' && (
          <AnalyticsDashboard
            videos={videos}
            adminUser={adminUser}
            onWatchVideo={handleSelectVideo}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 px-4 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">StreamCast Real-Time</span>
            <span>•</span>
            <span>Didukung oleh Firebase Firestore &amp; Express Full-Stack</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>👤 User Bebas Nonton (Tanpa Login)</span>
            <span>•</span>
            <span>🛡️ Admin Studio &amp; Upload</span>
          </div>
        </div>
      </footer>

      {/* Admin Login Dialog Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(email) => {
          showToast(`Selamat datang admin: ${email}`);
        }}
      />

      {/* Toast Notification Container */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
