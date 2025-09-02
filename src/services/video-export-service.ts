import { canvasCompositionService } from "./canvas-composition-service";
import {
  ProjectData,
  ExportSettings,
  TextOverlay,
  ImageOverlay,
} from "@/types";

/**
 * 导出进度回调类型
 */
export type ExportProgressCallback = (progress: number, status: string) => void;

/**
 * 导出结果类型
 */
export interface ExportResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  duration?: number;
  fileSize?: number;
}

/**
 * 视频导出服务类
 */
export class VideoExportService {
  private isExporting = false;
  private currentExportId: string | null = null;

  /**
   * 导出视频
   */
  async exportVideo(
    project: ProjectData,
    settings: ExportSettings,
    textOverlays: TextOverlay[] = [],
    imageOverlays: ImageOverlay[] = [],
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    if (this.isExporting) {
      throw new Error("Export already in progress");
    }

    const exportId = this.generateExportId();
    this.currentExportId = exportId;
    this.isExporting = true;

    try {
      onProgress?.(0, "准备导出...");

      // 1. 初始化视频合成器
      await canvasCompositionService.initialize(
        settings.width,
        settings.height,
        settings.fps
      );

      onProgress?.(10, "构建项目...");

      // 2. 从项目数据构建合成器
      await canvasCompositionService.buildFromProject(project);

      onProgress?.(30, "添加叠加层...");

      // 3. 添加文字叠加层
      for (const textOverlay of textOverlays) {
        await this.addTextOverlayToExport(textOverlay);
      }

      onProgress?.(50, "开始视频合成...");

      // 5. 导出视频流
      const stream = await canvasCompositionService.exportVideo(settings);

      onProgress?.(70, "处理视频数据...");

      // 6. 将流转换为Blob
      const blob = await this.streamToBlob(stream, onProgress);

      onProgress?.(100, "导出完成");

      const result: ExportResult = {
        success: true,
        blob,
        fileSize: blob.size,
        duration: project.duration,
      };

      return result;
    } catch (error) {
      console.error("Export failed:", error);

      const result: ExportResult = {
        success: false,
        error: error instanceof Error ? error.message : "导出失败",
      };

      return result;
    } finally {
      this.isExporting = false;
      this.currentExportId = null;

      // 清理资源
      try {
        await canvasCompositionService.destroy();
      } catch (error) {
        console.error("Failed to cleanup after export:", error);
      }
    }
  }

  /**
   * 取消当前导出
   */
  async cancelExport(): Promise<void> {
    if (!this.isExporting) return;

    this.isExporting = false;
    this.currentExportId = null;

    try {
      await canvasCompositionService.destroy();
    } catch (error) {
      console.error("Failed to cleanup after cancel:", error);
    }
  }

  /**
   * 获取导出状态
   */
  isExportInProgress(): boolean {
    return this.isExporting;
  }

  /**
   * 获取当前导出ID
   */
  getCurrentExportId(): string | null {
    return this.currentExportId;
  }

  /**
   * 添加文字叠加到导出
   */
  private async addTextOverlayToExport(overlay: TextOverlay): Promise<void> {
    try {
      await canvasCompositionService.addTextSprite(overlay.text, {
        fontSize: overlay.fontSize,
        fontFamily: overlay.fontFamily,
        fontWeight: overlay.fontWeight,
        color: overlay.color,
        backgroundColor: overlay.background || "transparent",
        textAlign: overlay.textAlign,
        lineHeight: 1.2,
        letterSpacing: "0px",
        // shadow: {
        //   enabled: overlay.shadow,
        //   offsetX: 2,
        //   offsetY: 2,
        //   blur: 4,
        //   color: "rgba(0,0,0,0.5)",
        // },
      });

      // 设置变换属性
      // 注意：这里需要将百分比转换为像素
      // canvasCompositionService.updateSpriteTransform(overlay.id, {
      //   x: overlay.position.x,
      //   y: overlay.position.y,
      //   rotation: overlay.rotation,
      // });
    } catch (error) {
      console.error("Failed to add text overlay to export:", error);
    }
  }

  /**
   * 将ReadableStream转换为Blob
   */
  private async streamToBlob(
    stream: ReadableStream,
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          chunks.push(value);
          receivedLength += value.length;

          // 更新进度（这里只是估算）
          onProgress?.(
            70 + (receivedLength / (receivedLength + 1000000)) * 25,
            "处理视频数据..."
          );
        }
      }

      // 合并所有chunks
      const mergedArray = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        mergedArray.set(chunk, position);
        position += chunk.length;
      }

      return new Blob([mergedArray], { type: "video/mp4" });
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 生成导出ID
   */
  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 估算导出文件大小
   */
  estimateFileSize(project: ProjectData, settings: ExportSettings): number {
    // 基础估算：分辨率 × 时长 × 比特率
    const pixels = settings.width * settings.height;
    const durationSeconds = project.duration / 1000;

    // 根据质量设置估算比特率
    let estimatedBitrate = 0; // bps

    switch (settings.quality) {
      case "low":
        estimatedBitrate = pixels * 0.05; // 低质量
        break;
      case "medium":
        estimatedBitrate = pixels * 0.1; // 中等质量
        break;
      case "high":
        estimatedBitrate = pixels * 0.2; // 高质量
        break;
      case "ultra":
        estimatedBitrate = pixels * 0.4; // 超高质量
        break;
    }

    // 文件大小 = 比特率 × 时长 / 8（转换为字节）
    const estimatedSize = (estimatedBitrate * durationSeconds) / 8;

    return Math.round(estimatedSize);
  }

  /**
   * 验证导出设置
   */
  validateExportSettings(settings: ExportSettings): string[] {
    const errors: string[] = [];

    // 检查分辨率
    if (settings.width <= 0 || settings.height <= 0) {
      errors.push("分辨率必须大于0");
    }

    if (settings.width > 7680 || settings.height > 4320) {
      errors.push("分辨率不能超过8K (7680×4320)");
    }

    // 检查帧率
    if (settings.fps <= 0 || settings.fps > 120) {
      errors.push("帧率必须在1-120之间");
    }

    // 检查比特率
    if (settings.bitrate <= 0) {
      errors.push("比特率必须大于0");
    }

    return errors;
  }

  /**
   * 获取支持的导出格式
   */
  getSupportedFormats(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: "mp4",
        label: "MP4",
        description: "最兼容的视频格式，支持大多数设备和平台",
      },
      {
        value: "webm",
        label: "WebM",
        description: "适用于Web的开源视频格式",
      },
      // 注意：实际支持的格式取决于WebAV的实现
    ];
  }

  /**
   * 获取推荐的导出设置
   */
  getRecommendedSettings(
    purpose: "web" | "mobile" | "desktop" | "social"
  ): Partial<ExportSettings> {
    switch (purpose) {
      case "web":
        return {
          format: "mp4",
          quality: "medium",
          width: 1280,
          height: 720,
          fps: 30,
          videoCodec: "h264",
          audioCodec: "aac",
        };

      case "mobile":
        return {
          format: "mp4",
          quality: "medium",
          width: 720,
          height: 1280,
          fps: 30,
          videoCodec: "h264",
          audioCodec: "aac",
        };

      case "desktop":
        return {
          format: "mp4",
          quality: "high",
          width: 1920,
          height: 1080,
          fps: 60,
          videoCodec: "h264",
          audioCodec: "aac",
        };

      case "social":
        return {
          format: "mp4",
          quality: "medium",
          width: 1080,
          height: 1080,
          fps: 30,
          videoCodec: "h264",
          audioCodec: "aac",
        };

      default:
        return {
          format: "mp4",
          quality: "medium",
          width: 1920,
          height: 1080,
          fps: 30,
          videoCodec: "h264",
          audioCodec: "aac",
        };
    }
  }
}

// 创建单例实例
export const videoExportService = new VideoExportService();
