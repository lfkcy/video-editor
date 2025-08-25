import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProjectData, ProjectSettings, Track, Clip, ProjectState } from '@/types';

/**
 * 项目操作接口
 */
interface ProjectActions {
  // 项目操作
  createNewProject: (settings?: Partial<ProjectSettings>) => void;
  loadProject: (projectData: ProjectData) => void;
  saveProject: () => Promise<void>;
  updateProject: (updates: Partial<ProjectData>) => void;
  setProjectName: (name: string) => void;
  setProjectSettings: (settings: Partial<ProjectSettings>) => void;
  
  // 轨道操作
  addTrack: (track: Omit<Track, 'id'>) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  duplicateTrack: (trackId: string) => string;
  
  // 片段操作
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  duplicateClip: (clipId: string) => string;
  splitClip: (clipId: string, splitTime: number) => string[];
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;
  
  // 工具方法
  getClipById: (clipId: string) => Clip | undefined;
  getTrackById: (trackId: string) => Track | undefined;
  getAllClips: () => Clip[];
  getClipsByTrack: (trackId: string) => Clip[];
  getTotalDuration: () => number;
}

/**
 * 项目 Store 接口
 */
interface ProjectStore extends ProjectState, ProjectActions {}

/**
 * 默认项目设置
 */
const defaultProjectSettings: ProjectSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  sampleRate: 48000,
  channels: 2,
  quality: 'high',
};

/**
 * 生成唯一 ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 创建默认项目
 */
const createDefaultProject = (settings?: Partial<ProjectSettings>): ProjectData => ({
  id: generateId(),
  name: '未命名项目',
  duration: 0,
  tracks: [
    {
      id: generateId(),
      type: 'video',
      name: '视频轨道 1',
      clips: [],
      isVisible: true,
      isMuted: false,
      isLocked: false,
      height: 80,
      order: 0,
    },
    {
      id: generateId(),
      type: 'audio',
      name: '音频轨道 1',
      clips: [],
      isVisible: true,
      isMuted: false,
      isLocked: false,
      height: 60,
      order: 1,
    },
  ],
  settings: { ...defaultProjectSettings, ...settings },
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * 项目状态管理 Store
 */
export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        currentProject: null,
        isLoading: false,
        error: null,
        hasUnsavedChanges: false,

        // 项目操作
        createNewProject: (settings) => {
          const newProject = createDefaultProject(settings);
          set({
            currentProject: newProject,
            hasUnsavedChanges: false,
            error: null,
          });
        },

        loadProject: (projectData) => {
          set({
            currentProject: projectData,
            hasUnsavedChanges: false,
            error: null,
          });
        },

        saveProject: async () => {
          const { currentProject } = get();
          if (!currentProject) return;

          set({ isLoading: true, error: null });

          try {
            // 这里应该调用实际的保存 API
            // await projectApi.save(currentProject);
            
            // 模拟保存延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            set({
              hasUnsavedChanges: false,
              isLoading: false,
              currentProject: {
                ...currentProject,
                updatedAt: new Date(),
              },
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '保存失败',
              isLoading: false,
            });
          }
        },

        updateProject: (updates) => {
          const { currentProject } = get();
          if (!currentProject) return;

          set({
            currentProject: {
              ...currentProject,
              ...updates,
              updatedAt: new Date(),
            },
            hasUnsavedChanges: true,
          });
        },

        setProjectName: (name) => {
          get().updateProject({ name });
        },

        setProjectSettings: (settings) => {
          const { currentProject } = get();
          if (!currentProject) return;

          get().updateProject({
            settings: { ...currentProject.settings, ...settings },
          });
        },

        // 轨道操作
        addTrack: (trackData) => {
          const { currentProject } = get();
          if (!currentProject) return '';

          const trackId = generateId();
          const newTrack: Track = {
            ...trackData,
            id: trackId,
            order: currentProject.tracks.length,
          };

          get().updateProject({
            tracks: [...currentProject.tracks, newTrack],
          });

          return trackId;
        },

        removeTrack: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const updatedTracks = currentProject.tracks.filter(
            track => track.id !== trackId
          );

          get().updateProject({ tracks: updatedTracks });
        },

        updateTrack: (trackId, updates) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const updatedTracks = currentProject.tracks.map(track =>
            track.id === trackId ? { ...track, ...updates } : track
          );

          get().updateProject({ tracks: updatedTracks });
        },

        reorderTracks: (fromIndex, toIndex) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const tracks = [...currentProject.tracks];
          const [removed] = tracks.splice(fromIndex, 1);
          tracks.splice(toIndex, 0, removed);

          // 更新 order 属性
          const updatedTracks = tracks.map((track, index) => ({
            ...track,
            order: index,
          }));

          get().updateProject({ tracks: updatedTracks });
        },

        duplicateTrack: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return '';

          const track = currentProject.tracks.find(t => t.id === trackId);
          if (!track) return '';

          const newTrackId = generateId();
          const duplicatedTrack: Track = {
            ...track,
            id: newTrackId,
            name: `${track.name} 副本`,
            order: currentProject.tracks.length,
            clips: track.clips.map(clip => ({
              ...clip,
              id: generateId(),
              trackId: newTrackId,
            })),
          };

          get().updateProject({
            tracks: [...currentProject.tracks, duplicatedTrack],
          });

          return newTrackId;
        },

        // 片段操作
        addClip: (trackId, clipData) => {
          const { currentProject } = get();
          if (!currentProject) return '';

          const clipId = generateId();
          const newClip: Clip = {
            ...clipData,
            id: clipId,
            trackId,
            selected: false,
          };

          const updatedTracks = currentProject.tracks.map(track =>
            track.id === trackId
              ? { ...track, clips: [...track.clips, newClip] }
              : track
          );

          get().updateProject({ tracks: updatedTracks });
          return clipId;
        },

        removeClip: (clipId) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const updatedTracks = currentProject.tracks.map(track => ({
            ...track,
            clips: track.clips.filter(clip => clip.id !== clipId),
          }));

          get().updateProject({ tracks: updatedTracks });
        },

        updateClip: (clipId, updates) => {
          const { currentProject } = get();
          if (!currentProject) return;

          const updatedTracks = currentProject.tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
              clip.id === clipId ? { ...clip, ...updates } : clip
            ),
          }));

          get().updateProject({ tracks: updatedTracks });
        },

        moveClip: (clipId, newTrackId, newStartTime) => {
          const { currentProject } = get();
          if (!currentProject) return;

          let clipToMove: Clip | undefined;

          // 从原轨道移除片段
          const tracksWithoutClip = currentProject.tracks.map(track => ({
            ...track,
            clips: track.clips.filter(clip => {
              if (clip.id === clipId) {
                clipToMove = clip;
                return false;
              }
              return true;
            }),
          }));

          if (!clipToMove) return;

          // 添加到新轨道
          const updatedTracks = tracksWithoutClip.map(track =>
            track.id === newTrackId
              ? {
                  ...track,
                  clips: [
                    ...track.clips,
                    { ...clipToMove!, trackId: newTrackId, startTime: newStartTime },
                  ],
                }
              : track
          );

          get().updateProject({ tracks: updatedTracks });
        },

        duplicateClip: (clipId) => {
          const { currentProject, addClip } = get();
          if (!currentProject) return '';

          const clip = get().getClipById(clipId);
          if (!clip) return '';

          const { id, trackId, ...clipData } = clip;
          const newClipId = addClip(trackId, {
            ...clipData,
            startTime: clip.startTime + clip.duration + 100, // 稍微偏移
          });

          return newClipId;
        },

        splitClip: (clipId, splitTime) => {
          const { currentProject } = get();
          if (!currentProject) return [];

          const clip = get().getClipById(clipId);
          if (!clip || splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            return [];
          }

          const firstClipId = generateId();
          const secondClipId = generateId();

          const firstClip: Clip = {
            ...clip,
            id: firstClipId,
            duration: splitTime - clip.startTime,
            trimEnd: clip.trimStart + (splitTime - clip.startTime),
          };

          const secondClip: Clip = {
            ...clip,
            id: secondClipId,
            startTime: splitTime,
            duration: clip.duration - (splitTime - clip.startTime),
            trimStart: clip.trimStart + (splitTime - clip.startTime),
          };

          const updatedTracks = currentProject.tracks.map(track => ({
            ...track,
            clips: track.clips.map(c =>
              c.id === clipId
                ? null
                : c
            ).filter(Boolean).concat(
              c => c?.trackId === track.id ? [firstClip, secondClip] : []
            ),
          }));

          get().updateProject({ tracks: updatedTracks });
          return [firstClipId, secondClipId];
        },

        // 状态管理
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        markUnsaved: () => set({ hasUnsavedChanges: true }),
        markSaved: () => set({ hasUnsavedChanges: false }),

        // 工具方法
        getClipById: (clipId) => {
          const { currentProject } = get();
          if (!currentProject) return undefined;

          for (const track of currentProject.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) return clip;
          }
          return undefined;
        },

        getTrackById: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return undefined;

          return currentProject.tracks.find(track => track.id === trackId);
        },

        getAllClips: () => {
          const { currentProject } = get();
          if (!currentProject) return [];

          return currentProject.tracks.flatMap(track => track.clips);
        },

        getClipsByTrack: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return [];

          const track = currentProject.tracks.find(t => t.id === trackId);
          return track ? track.clips : [];
        },

        getTotalDuration: () => {
          const { currentProject } = get();
          if (!currentProject) return 0;

          let maxDuration = 0;
          for (const track of currentProject.tracks) {
            for (const clip of track.clips) {
              const clipEnd = clip.startTime + clip.duration;
              maxDuration = Math.max(maxDuration, clipEnd);
            }
          }
          return maxDuration;
        },
      }),
      {
        name: 'video-editor-project',
        partialize: (state) => ({
          currentProject: state.currentProject,
          hasUnsavedChanges: state.hasUnsavedChanges,
        }),
      }
    ),
    { name: 'ProjectStore' }
  )
);