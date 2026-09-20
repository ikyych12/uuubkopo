export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  viewsCount: number;
  likesCount: number;
  activeViewers?: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface ViewerSession {
  id: string;
  videoId: string;
  viewerSessionId: string;
  joinedAt: string;
  lastActiveAt: string;
  watchedSeconds: number;
  device: string;
  completed: boolean;
}

export interface AnalyticsSummary {
  totalVideos: number;
  totalViews: number;
  currentActiveViewers: number;
  totalWatchTimeSeconds: number;
  completionRate: number;
  videoStats: Array<{
    id: string;
    title: string;
    viewsCount: number;
    activeViewers: number;
    likesCount: number;
    duration?: number;
  }>;
}

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}
