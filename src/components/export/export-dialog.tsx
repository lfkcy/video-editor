'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Download, 
  Settings, 
  Play, 
  Smartphone, 
  Monitor, 
  Globe, 
  Users,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportSettings } from '@/types';
import { useProjectStore } from '@/stores';
import { videoExportService, ExportResult } from '@/services/video-export-service';
import { formatFileSize, formatTime } from '@/lib/utils';

interface ExportDialogProps {
  textOverlays?: any[];
  imageOverlays?: any[];
  onExportComplete?: (result: ExportResult) => void;
}

/**
 * 视频导出对话框组件
 */
export function ExportDialog({ 
  textOverlays = [], 
  imageOverlays = [],
  onExportComplete 
}: ExportDialogProps) {
  const { currentProject } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  
  // 导出设置
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'medium',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 5000000, // 5Mbps
    audioCodec: 'aac',
    videoCodec: 'h264',
  });

  // 初始化设置
  useEffect(() => {
    if (currentProject) {
      setExportSettings(prev => ({
        ...prev,
        width: currentProject.settings.width,
        height: currentProject.settings.height,
        fps: currentProject.settings.fps,
      }));
    }
  }, [currentProject]);

  // 预设配置
  const presets = [
    {
      id: 'web',
      name: 'Web视频',
      description: '适合网页播放的视频',
      icon: Globe,
      settings: videoExportService.getRecommendedSettings('web'),
    },
    {
      id: 'mobile',
      name: '移动设备',
      description: '适合手机播放的视频',
      icon: Smartphone,
      settings: videoExportService.getRecommendedSettings('mobile'),
    },
    {
      id: 'desktop',
      name: '桌面播放',
      description: '高质量桌面播放',
      icon: Monitor,
      settings: videoExportService.getRecommendedSettings('desktop'),
    },
    {
      id: 'social',
      name: '社交媒体',
      description: '适合社交平台的方形视频',
      icon: Users,
      settings: videoExportService.getRecommendedSettings('social'),
    },
  ];

  // 质量设置
  const qualityOptions = [
    { value: 'low', label: '低质量', bitrate: 1000000 },
    { value: 'medium', label: '中等质量', bitrate: 5000000 },
    { value: 'high', label: '高质量', bitrate: 10000000 },
    { value: 'ultra', label: '超高质量', bitrate: 20000000 },
  ];

  // 格式选项
  const formatOptions = videoExportService.getSupportedFormats();

  // 估算文件大小
  const estimatedSize = currentProject ? 
    videoExportService.estimateFileSize(currentProject, exportSettings) : 0;

  // 验证设置
  const validationErrors = videoExportService.validateExportSettings(exportSettings);
  const isSettingsValid = validationErrors.length === 0;

  // 应用预设
  const applyPreset = useCallback((presetSettings: Partial<ExportSettings>) => {
    setExportSettings(prev => ({ ...prev, ...presetSettings }));
  }, []);

  // 更新设置
  const updateSetting = useCallback((key: keyof ExportSettings, value: any) => {
    setExportSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 开始导出
  const startExport = useCallback(async () => {
    if (!currentProject || !isSettingsValid) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('开始导出...');
    setExportResult(null);

    try {
      const result = await videoExportService.exportVideo(
        currentProject,
        exportSettings,
        textOverlays,
        imageOverlays,
        (progress, status) => {
          setExportProgress(progress);
          setExportStatus(status);
        }
      );

      setExportResult(result);

      if (result.success && result.blob) {
        // 自动下载文件
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name}.${exportSettings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onExportComplete?.(result);
      }

    } catch (error) {
      console.error('Export failed:', error);
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      });
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, exportSettings, textOverlays, imageOverlays, isSettingsValid, onExportComplete]);

  // 取消导出
  const cancelExport = useCallback(async () => {
    await videoExportService.cancelExport();
    setIsExporting(false);
    setExportProgress(0);
    setExportStatus('');
  }, []);

  // 重置对话框
  const resetDialog = useCallback(() => {
    setExportProgress(0);
    setExportStatus('');
    setExportResult(null);
  }, []);

  if (!currentProject) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetDialog();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>导出视频</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>导出视频</span>
          </DialogTitle>
          <DialogDescription>
            配置导出设置并生成最终视频文件
          </DialogDescription>
        </DialogHeader>

        {/* 导出进行中 */}
        {isExporting && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{exportStatus}</div>
              <Progress value={exportProgress} className="mt-2" />
              <div className="text-sm text-muted-foreground mt-1">
                {Math.round(exportProgress)}%
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" onClick={cancelExport}>
                取消导出
              </Button>
            </div>
          </div>
        )}

        {/* 导出结果 */}
        {exportResult && (
          <div className="space-y-4">
            {exportResult.success ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>导出成功！</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>导出失败：{exportResult.error}</span>
              </div>
            )}

            {exportResult.success && exportResult.fileSize && (
              <div className="text-sm text-muted-foreground">
                文件大小: {formatFileSize(exportResult.fileSize)}
              </div>
            )}

            <div className="flex justify-center space-x-2">
              <Button onClick={() => setExportResult(null)}>
                继续编辑
              </Button>
              {exportResult.success && (
                <Button onClick={startExport}>
                  重新导出
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 导出设置 */}
        {!isExporting && !exportResult && (
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">预设</TabsTrigger>
              <TabsTrigger value="custom">自定义</TabsTrigger>
              <TabsTrigger value="advanced">高级</TabsTrigger>
            </TabsList>

            {/* 预设选项 */}
            <TabsContent value="presets" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <Card 
                      key={preset.id}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => applyPreset(preset.settings)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5" />
                          <CardTitle className="text-sm">{preset.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs">
                          {preset.description}
                        </CardDescription>
                        <div className="text-xs text-muted-foreground mt-2">
                          {preset.settings.width}×{preset.settings.height} • {preset.settings.fps}fps
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* 自定义设置 */}
            <TabsContent value="custom" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 分辨率 */}
                <div className="space-y-2">
                  <Label>分辨率</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      value={exportSettings.width}
                      onChange={(e) => updateSetting('width', parseInt(e.target.value) || 1920)}
                      placeholder="宽度"
                    />
                    <span className="self-center">×</span>
                    <Input
                      type="number"
                      value={exportSettings.height}
                      onChange={(e) => updateSetting('height', parseInt(e.target.value) || 1080)}
                      placeholder="高度"
                    />
                  </div>
                </div>

                {/* 帧率 */}
                <div className="space-y-2">
                  <Label>帧率</Label>
                  <Input
                    type="number"
                    value={exportSettings.fps}
                    onChange={(e) => updateSetting('fps', parseInt(e.target.value) || 30)}
                    placeholder="帧率"
                  />
                </div>

                {/* 格式 */}
                <div className="space-y-2">
                  <Label>格式</Label>
                  <select
                    value={exportSettings.format}
                    onChange={(e) => updateSetting('format', e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    {formatOptions.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 质量 */}
                <div className="space-y-2">
                  <Label>质量</Label>
                  <select
                    value={exportSettings.quality}
                    onChange={(e) => {
                      const quality = e.target.value as any;
                      const option = qualityOptions.find(opt => opt.value === quality);
                      updateSetting('quality', quality);
                      if (option) {
                        updateSetting('bitrate', option.bitrate);
                      }
                    }}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    {qualityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* 高级设置 */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                {/* 比特率 */}
                <div className="space-y-2">
                  <Label>比特率: {Math.round(exportSettings.bitrate / 1000000)} Mbps</Label>
                  <Slider
                    value={[exportSettings.bitrate]}
                    onValueChange={([value]) => updateSetting('bitrate', value)}
                    min={500000}
                    max={50000000}
                    step={500000}
                    className="w-full"
                  />
                </div>

                {/* 视频编解码器 */}
                <div className="space-y-2">
                  <Label>视频编解码器</Label>
                  <select
                    value={exportSettings.videoCodec}
                    onChange={(e) => updateSetting('videoCodec', e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="h264">H.264</option>
                    <option value="h265">H.265</option>
                    <option value="vp8">VP8</option>
                    <option value="vp9">VP9</option>
                  </select>
                </div>

                {/* 音频编解码器 */}
                <div className="space-y-2">
                  <Label>音频编解码器</Label>
                  <select
                    value={exportSettings.audioCodec}
                    onChange={(e) => updateSetting('audioCodec', e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="aac">AAC</option>
                    <option value="mp3">MP3</option>
                    <option value="opus">Opus</option>
                  </select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* 预览信息和操作按钮 */}
        {!isExporting && !exportResult && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>预估文件大小: {formatFileSize(estimatedSize)}</div>
                <div>项目时长: {formatTime(currentProject.duration)}</div>
                {validationErrors.length > 0 && (
                  <div className="text-red-500">
                    错误: {validationErrors.join(', ')}
                  </div>
                )}
              </div>

              <Button 
                onClick={startExport}
                disabled={!isSettingsValid}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>开始导出</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}