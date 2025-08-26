"use client";

import { useCallback, useRef, useState } from "react";
import { useProjectStore, useTimelineStore, useHistoryStore } from "@/stores";
import { Clip, DragOperation, Point } from "@/types";
import { pixelToTime, timeToPixel, clamp } from "@/lib/utils";

/**
 * 时间轴交互处理的自定义 Hook
 */
export function useTimelineInteraction() {
  const {
    currentProject,
    updateClip,
    removeClip,
    splitClip,
    moveClip,
    duplicateClip,
  } = useProjectStore();

  const {
    scale,
    scrollPosition,
    selectedClips,
    selectClip,
    selectClips,
    clearSelection,
    startDrag,
    updateDrag,
    endDrag,
    snapToGrid,
    gridSize,
    setPlayhead,
  } = useTimelineStore();

  const { pushAction } = useHistoryStore();

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOperation, setDragOperation] = useState<DragOperation | null>(
    null
  );
  const dragStartRef = useRef<{
    startPosition: Point;
    originalClipData: Map<string, { startTime: number; duration: number }>;
  } | null>(null);

  /**
   * 开始拖拽片段
   */
  const startClipDrag = useCallback(
    (
      clipId: string,
      operation: DragOperation,
      startPosition: Point,
      multiSelect = false
    ) => {
      if (!currentProject) return;

      // 处理选择
      if (!selectedClips.includes(clipId)) {
        if (multiSelect) {
          selectClip(clipId, true);
        } else {
          clearSelection();
          selectClip(clipId);
        }
      }

      // 获取要拖拽的片段列表
      const dragClipIds = selectedClips.includes(clipId)
        ? selectedClips
        : [clipId];

      // 保存原始数据
      const originalData = new Map();
      dragClipIds.forEach((id) => {
        const clip = getClipById(id);
        if (clip) {
          originalData.set(id, {
            startTime: clip.startTime,
            duration: clip.duration,
          });
        }
      });

      dragStartRef.current = {
        startPosition,
        originalClipData: originalData,
      };

      setIsDragging(true);
      setDragOperation(operation);
      startDrag(operation, startPosition, dragClipIds);
    },
    [currentProject, selectedClips, selectClip, clearSelection, startDrag]
  );

  /**
   * 更新拖拽
   */
  const updateClipDrag = useCallback(
    (currentPosition: Point) => {
      if (!isDragging || !dragStartRef.current || !dragOperation) return;

      const deltaX = currentPosition.x - dragStartRef.current.startPosition.x;
      const deltaTime = pixelToTime(deltaX, scale) - pixelToTime(0, scale);

      updateDrag(currentPosition);

      // 根据操作类型处理拖拽
      switch (dragOperation) {
        case "move":
          handleMoveOperation(deltaTime);
          break;
        case "trim-start":
          handleTrimStartOperation(deltaTime);
          break;
        case "trim-end":
          handleTrimEndOperation(deltaTime);
          break;
      }
    },
    [isDragging, dragOperation, scale, updateDrag]
  );

  /**
   * 结束拖拽
   */
  const endClipDrag = useCallback(() => {
    if (!isDragging || !dragStartRef.current) return;

    // 记录历史操作
    if (
      dragOperation === "move" &&
      dragStartRef.current.originalClipData.size > 0
    ) {
      pushAction({
        type: "move-clip",
        description: `移动 ${dragStartRef.current.originalClipData.size} 个片段`,
        data: {
          clipIds: Array.from(dragStartRef.current.originalClipData.keys()),
        },
        undoData: {
          oldValues: Object.fromEntries(
            dragStartRef.current.originalClipData
          ),
        },
      });
    }

    setIsDragging(false);
    setDragOperation(null);
    dragStartRef.current = null;
    endDrag();
  }, [isDragging, dragOperation, pushAction, endDrag]);

  /**
   * 处理移动操作
   */
  const handleMoveOperation = useCallback(
    (deltaTime: number) => {
      if (!dragStartRef.current || !currentProject) return;

      dragStartRef.current.originalClipData.forEach((originalData, clipId) => {
        let newStartTime = originalData.startTime + deltaTime;

        // 网格对齐
        if (snapToGrid) {
          newStartTime = Math.round(newStartTime / gridSize) * gridSize;
        }

        // 确保不小于0
        newStartTime = Math.max(0, newStartTime);

        updateClip(clipId, { startTime: newStartTime });
      });
    },
    [currentProject, snapToGrid, gridSize, updateClip]
  );

  /**
   * 处理开始修剪操作
   */
  const handleTrimStartOperation = useCallback(
    (deltaTime: number) => {
      if (
        !dragStartRef.current ||
        !currentProject ||
        selectedClips.length !== 1
      )
        return;

      const clipId = selectedClips[0];
      const originalData = dragStartRef.current.originalClipData.get(clipId);
      if (!originalData) return;

      let newStartTime = originalData.startTime + deltaTime;
      let newDuration = originalData.duration - deltaTime;

      // 确保最小时长
      const minDuration = 100; // 100ms
      if (newDuration < minDuration) {
        newDuration = minDuration;
        newStartTime =
          originalData.startTime + originalData.duration - minDuration;
      }

      // 确保不小于0
      newStartTime = Math.max(0, newStartTime);

      updateClip(clipId, {
        startTime: newStartTime,
        duration: newDuration,
        trimStart: originalData.startTime - newStartTime,
      });
    },
    [currentProject, selectedClips, updateClip]
  );

  /**
   * 处理结束修剪操作
   */
  const handleTrimEndOperation = useCallback(
    (deltaTime: number) => {
      if (
        !dragStartRef.current ||
        !currentProject ||
        selectedClips.length !== 1
      )
        return;

      const clipId = selectedClips[0];
      const originalData = dragStartRef.current.originalClipData.get(clipId);
      if (!originalData) return;

      let newDuration = originalData.duration + deltaTime;

      // 确保最小时长
      const minDuration = 100; // 100ms
      newDuration = Math.max(minDuration, newDuration);

      updateClip(clipId, {
        duration: newDuration,
        trimEnd: originalData.duration - newDuration,
      });
    },
    [currentProject, selectedClips, updateClip]
  );

  /**
   * 分割片段
   */
  const splitClipAt = useCallback(
    (clipId: string, splitTime: number) => {
      if (!currentProject) return;

      const clip = getClipById(clipId);
      if (!clip) return;

      // 检查分割时间是否在片段范围内
      if (
        splitTime <= clip.startTime ||
        splitTime >= clip.startTime + clip.duration
      ) {
        return;
      }

      const newClipIds = splitClip(clipId, splitTime);

      // 记录历史操作
      pushAction({
        type: "split-clip",
        description: `分割片段 ${clip.source.name}`,
        data: {
          clipIds: newClipIds,
          properties: {
            originalClipId: clipId,
            splitTime,
          },
        },
        undoData: {
          oldValues: {
            clipData: clip,
          },
        },
      });

      // 选择新创建的片段
      if (newClipIds.length === 2) {
        clearSelection();
        selectClips(newClipIds);
      }
    },
    [currentProject, splitClip, pushAction, clearSelection, selectClips]
  );

  /**
   * 删除选中的片段
   */
  const deleteSelectedClips = useCallback(() => {
    if (!currentProject || selectedClips.length === 0) return;

    const clipsToDelete = selectedClips
      .map((clipId) => getClipById(clipId))
      .filter(Boolean);

    // 删除片段
    selectedClips.forEach((clipId) => {
      removeClip(clipId);
    });

    // 记录历史操作
    pushAction({
      type: "remove-clip",
      description: `删除 ${selectedClips.length} 个片段`,
      data: {
        clipIds: selectedClips,
      },
      undoData: {
        oldValues: {
          clipsData: clipsToDelete,
        },
      },
    });

    clearSelection();
  }, [currentProject, selectedClips, removeClip, pushAction, clearSelection]);

  /**
   * 复制选中的片段
   */
  const duplicateSelectedClips = useCallback(() => {
    if (!currentProject || selectedClips.length === 0) return;

    const newClipIds: string[] = [];

    selectedClips.forEach((clipId) => {
      const newId = duplicateClip(clipId);
      if (newId) {
        newClipIds.push(newId);
      }
    });

    // 记录历史操作
    pushAction({
      type: "add-clip",
      description: `复制 ${selectedClips.length} 个片段`,
      data: {
        clipIds: newClipIds,
      },
      undoData: {
        clipIds: newClipIds,
      },
    });

    // 选择新复制的片段
    if (newClipIds.length > 0) {
      clearSelection();
      selectClips(newClipIds);
    }
  }, [
    currentProject,
    selectedClips,
    duplicateClip,
    pushAction,
    clearSelection,
    selectClips,
  ]);

  /**
   * 在播放头位置分割片段
   */
  const splitAtPlayhead = useCallback(() => {
    if (!currentProject) return;

    const playheadTime = useTimelineStore.getState().playhead;

    // 找到播放头位置的片段
    for (const track of currentProject.tracks) {
      for (const clip of track.clips) {
        if (
          playheadTime >= clip.startTime &&
          playheadTime < clip.startTime + clip.duration
        ) {
          splitClipAt(clip.id, playheadTime);
          return;
        }
      }
    }
  }, [currentProject, splitClipAt]);

  /**
   * 选择全部片段
   */
  const selectAllClips = useCallback(() => {
    if (!currentProject) return;

    const allClipIds: string[] = [];
    currentProject.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        allClipIds.push(clip.id);
      });
    });

    selectClips(allClipIds);
  }, [currentProject, selectClips]);

  /**
   * 获取片段通过ID
   */
  const getClipById = useCallback(
    (clipId: string): Clip | undefined => {
      if (!currentProject) return undefined;

      for (const track of currentProject.tracks) {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) return clip;
      }
      return undefined;
    },
    [currentProject]
  );

  /**
   * 检查片段碰撞
   */
  const checkClipCollision = useCallback(
    (
      clipId: string,
      newStartTime: number,
      duration: number,
      trackId: string
    ): boolean => {
      if (!currentProject) return false;

      const track = currentProject.tracks.find((t) => t.id === trackId);
      if (!track) return false;

      const clipEndTime = newStartTime + duration;

      return track.clips.some((clip) => {
        if (clip.id === clipId) return false; // 忽略自己

        const existingEndTime = clip.startTime + clip.duration;

        return !(
          clipEndTime <= clip.startTime || newStartTime >= existingEndTime
        );
      });
    },
    [currentProject]
  );

  /**
   * 自动对齐到其他片段
   */
  const snapToClips = useCallback(
    (time: number, threshold = 500): number => {
      if (!currentProject || !snapToGrid) return time;

      let closestTime = time;
      let minDistance = threshold;

      currentProject.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          // 检查片段开始时间
          const startDistance = Math.abs(time - clip.startTime);
          if (startDistance < minDistance) {
            minDistance = startDistance;
            closestTime = clip.startTime;
          }

          // 检查片段结束时间
          const endTime = clip.startTime + clip.duration;
          const endDistance = Math.abs(time - endTime);
          if (endDistance < minDistance) {
            minDistance = endDistance;
            closestTime = endTime;
          }
        });
      });

      return closestTime;
    },
    [currentProject, snapToGrid]
  );

  return {
    // 拖拽相关
    isDragging,
    dragOperation,
    startClipDrag,
    updateClipDrag,
    endClipDrag,

    // 编辑操作
    splitClipAt,
    deleteSelectedClips,
    duplicateSelectedClips,
    splitAtPlayhead,
    selectAllClips,

    // 工具方法
    getClipById,
    checkClipCollision,
    snapToClips,
    clearSelection,
    selectedClips,
  };
}
