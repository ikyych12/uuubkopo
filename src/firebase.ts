import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import type { VideoItem, ViewerSession } from './types';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  measurementId: firebaseConfigJson.measurementId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if provided
export const db = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Validation test connection to Firestore as per Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration:', error.message);
    } else {
      // Ignored for normal non-existent doc response
    }
  }
}
testConnection();

// Videos Real-time Subscription
export function subscribeVideos(callback: (videos: VideoItem[]) => void) {
  const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: VideoItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<VideoItem, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.error('Error listening to videos:', err);
    }
  );
}

// Single Video Real-time Subscription
export function subscribeVideo(videoId: string, callback: (video: VideoItem | null) => void) {
  const docRef = doc(db, 'videos', videoId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...(docSnap.data() as Omit<VideoItem, 'id'>) });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error(`Error listening to video ${videoId}:`, err);
      callback(null);
    }
  );
}

// Add New Video (Admin)
export async function addVideoDoc(
  videoData: Omit<VideoItem, 'id' | 'viewsCount' | 'likesCount' | 'activeViewers'>
): Promise<string> {
  const colRef = collection(db, 'videos');
  const newDocRef = doc(colRef);
  const now = new Date().toISOString();

  await setDoc(newDocRef, {
    ...videoData,
    viewsCount: 0,
    likesCount: 0,
    activeViewers: 0,
    createdAt: videoData.createdAt || now,
    updatedAt: now,
  });

  return newDocRef.id;
}

// Delete Video (Admin)
export async function deleteVideoDoc(videoId: string): Promise<void> {
  await deleteDoc(doc(db, 'videos', videoId));
}

// Increment Video Views
export async function incrementVideoViews(videoId: string): Promise<void> {
  try {
    const docRef = doc(db, 'videos', videoId);
    await updateDoc(docRef, {
      viewsCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to increment views:', err);
  }
}

// Like Video
export async function likeVideoDoc(videoId: string): Promise<void> {
  try {
    const docRef = doc(db, 'videos', videoId);
    await updateDoc(docRef, {
      likesCount: increment(1),
    });
  } catch (err) {
    console.warn('Failed to like video:', err);
  }
}

// Viewer Session Heartbeat for Real-time Analytics
// Active viewers are defined as those with lastActiveAt within the last 25 seconds
export async function sendViewerHeartbeat(params: {
  videoId: string;
  sessionId: string;
  watchedSeconds: number;
  completed?: boolean;
}): Promise<void> {
  const { videoId, sessionId, watchedSeconds, completed = false } = params;
  try {
    const sessionRef = doc(db, 'viewer_sessions', sessionId);
    const now = new Date().toISOString();

    await setDoc(
      sessionRef,
      {
        videoId,
        viewerSessionId: sessionId,
        lastActiveAt: now,
        watchedSeconds,
        completed,
        device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
        joinedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to record heartbeat:', err);
  }
}

// Close Viewer Session when user navigates away or pauses
export async function closeViewerSession(sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, 'viewer_sessions', sessionId);
    // Set lastActive to long ago to immediately drop active status
    await updateDoc(sessionRef, {
      lastActiveAt: new Date(Date.now() - 60000).toISOString(),
    });
  } catch {
    // Session may already be closed
  }
}

// Real-time Active Viewers for a specific video
export function subscribeActiveViewers(
  videoId: string,
  callback: (activeCount: number) => void
) {
  const q = query(
    collection(db, 'viewer_sessions'),
    where('videoId', '==', videoId),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const thresholdMs = Date.now() - 25000; // active in last 25s
    let active = 0;
    snapshot.forEach((d) => {
      const data = d.data() as ViewerSession;
      if (data.lastActiveAt && new Date(data.lastActiveAt).getTime() > thresholdMs) {
        active++;
      }
    });
    callback(active);
  });
}

// Real-time Analytics Subscriptions for Admin
export function subscribeAllViewerSessions(
  callback: (sessions: ViewerSession[]) => void
) {
  const q = query(collection(db, 'viewer_sessions'), limit(200));
  return onSnapshot(q, (snapshot) => {
    const sessions: ViewerSession[] = [];
    snapshot.forEach((d) => {
      sessions.push({ id: d.id, ...(d.data() as Omit<ViewerSession, 'id'>) });
    });
    callback(sessions);
  });
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
};
