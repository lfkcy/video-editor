import { useState, useCallback, useRef, useEffect } from "react";
import MediaInfo, {
  AudioTrack,
  GeneralTrack,
  mediaInfoFactory,
  MediaInfo as MediaInfoType,
  VideoTrack,
} from "mediainfo.js";

// 导入你的类型定义
import {
  MediaFile,
  MediaMetadata,
  MediaProcessingTask,
  MediaProcessingResult,
} from "@/types";
import { FileUtils } from "@/utils/file-utils";
import { generateId } from "@/lib/utils";

/**
 * 媒体处理 Hooks
 * 封装媒体文件的处理、元数据提取和状态管理
 */
export function useMediaProcessor() {
  // 使用 useRef 存储 mediainfo 实例
  const mediaInfoRef = useRef<MediaInfoType | null>(null);
  const isReadyRef = useRef(false);

  // 使用 useState 跟踪任务状态
  const [task, setTask] = useState<MediaProcessingTask | null>(null);
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);

  // 初始化 mediainfo.js
  useEffect(() => {
    async function initMediaInfo() {
      if (isReadyRef.current) return;
      try {
        // const mediainfo = await mediaInfoFactory();
        // mediaInfoRef.current = mediainfo;
        // isReadyRef.current = true;
        console.log("MediaInfo.js 初始化成功");
      } catch (error) {
        console.error("MediaInfo.js 初始化失败:", error);
      }
    }
    initMediaInfo();

    return () => {
      if (mediaInfoRef.current) {
        mediaInfoRef.current.close();
      }
    };
  }, []);

  // 内部辅助函数：更新任务状态
  const updateTask = useCallback((updates: Partial<MediaProcessingTask>) => {
    setTask((prevTask) => {
      if (!prevTask) return null;
      return { ...prevTask, ...updates };
    });
  }, []);

  /**
   * 提取媒体元数据 (使用 mediainfo.js)
   */
  const extractMetadata = useCallback(
    async (file: File): Promise<MediaMetadata> => {
      if (!isReadyRef.current || !mediaInfoRef.current) {
        throw new Error("MediaInfo.js 尚未初始化");
      }

      const fileBuffer = await file.arrayBuffer();

      const result = await mediaInfoRef.current.analyzeData(
        () => fileBuffer.byteLength,
        (chunkSize, offset) =>
          Promise.resolve(
            new Uint8Array(fileBuffer.slice(offset, offset + chunkSize))
          )
      );

      const metadata: MediaMetadata = {
        format: file.type,
      };

      // const videoTrack = result.media?.track?.find(
      //   (t: any) => t["@type"] === "Video"
      // );
      // const audioTrack = result.media?.track?.find(
      //   (t: any) => t["@type"] === "Audio"
      // );
      // const generalTrack = result.media?.track?.find(
      //   (t: any) => t["@type"] === "General"
      // );

      // if (generalTrack) {
      //   const general = generalTrack as GeneralTrack;
      //   if (general.Duration !== undefined) {
      //     metadata.duration = general.Duration * 1000;
      //   }
      //   if (general.OverallBitRate !== undefined) {
      //     metadata.bitrate = general.OverallBitRate;
      //   }
      // }

      // if (videoTrack) {
      //   metadata.width = parseInt(
      //     String((videoTrack as VideoTrack).Width ?? "0")
      //   );
      //   metadata.height = parseInt(
      //     String((videoTrack as VideoTrack).Height ?? "0")
      //   );
      //   metadata.fps = parseFloat(
      //     String((videoTrack as VideoTrack).FrameRate ?? "0")
      //   );
      // }

      // if (audioTrack) {
      //   metadata.sampleRate = parseInt(
      //     String((audioTrack as AudioTrack).SamplingRate ?? "0")
      //   );
      //   metadata.channels = parseInt(
      //     String((audioTrack as AudioTrack).Channels ?? "0")
      //   );
      // }

      return metadata;
    },
    [] // 依赖为空，确保该函数引用稳定
  );

  /**
   * 生成缩略图 (与原始代码保持一致)
   */
  const generateThumbnail = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // 截取中间一帧
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          return reject(new Error("Failed to get canvas context"));
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(video.src);
        resolve(thumbnailUrl);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video for thumbnail"));
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * 处理单个媒体文件
   */
  const processMediaFile = useCallback(
    async (file: File): Promise<MediaFile> => {
      const taskId = generateId();
      setTask({
        id: taskId,
        fileId: generateId(),
        status: "processing",
        progress: 0,
        startTime: new Date(),
      });

      try {
        updateTask({ progress: 10 });

        const mediaFile: MediaFile = {
          id: generateId(),
          name: FileUtils.sanitizeFileName(file.name),
          type: FileUtils.getMediaType(file),
          size: file.size,
          url: FileUtils.createObjectURL(file),
          createdAt: new Date(),
          lastModified: new Date(file.lastModified),
          metadata: {} as any,
        };
        setMediaFile(mediaFile);

        updateTask({ progress: 30 });
        mediaFile.metadata = await extractMetadata(file);

        updateTask({ progress: 60 });
        if (mediaFile.type === "video" || mediaFile.type === "image") {
          mediaFile.thumbnailUrl = await generateThumbnail(file);
        }

        updateTask({ progress: 90 });

        const result: MediaProcessingResult = {
          thumbnails: mediaFile.thumbnailUrl ? [mediaFile.thumbnailUrl] : [],
          keyframes: [],
          analysis: {
            hasAudio: !!mediaFile.metadata.channels,
            hasVideo: mediaFile.type === "video",
          },
        };

        setMediaFile(mediaFile);
        updateTask({
          status: "completed",
          progress: 100,
          endTime: new Date(),
          result,
        });

        return mediaFile;
      } catch (error: any) {
        updateTask({
          status: "failed",
          error: error.message || "处理失败",
          endTime: new Date(),
        });
        throw error;
      }
    },
    [updateTask, extractMetadata, generateThumbnail]
  );

  /**
   * 批量处理媒体文件
   */
  const processMediaFiles = useCallback(
    async (files: File[]): Promise<MediaFile[]> => {
      const results: MediaFile[] = [];
      for (const file of files) {
        try {
          const result = await processMediaFile(file);
          results.push(result);
        } catch (error) {
          console.error(`处理文件 ${file.name} 失败`, error);
        }
      }
      return results;
    },
    [processMediaFile]
  );

  // 暴露给外部的 API
  return {
    isReady: isReadyRef.current,
    task,
    mediaFile,
    processMediaFile,
    processMediaFiles,
  };
}
