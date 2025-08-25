'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Search, Grid, List, Filter } from 'lucide-react';
import { MediaFile } from '@/types';
import { mediaProcessingService } from '@/services';
import { Button } from '@/components/ui/button';
import { MediaItem } from './media-item';
import { cn, formatFileSize } from '@/lib/utils';

/**
 * 媒体库面板组件
 */
export function MediaLibrary() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 本地状态
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchText, setSearchText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // 文件上传处理
  const handleFileSelect = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        const validation = mediaProcessingService.validateFile(file);
        if (!validation.isValid) {
          console.warn(`File ${file.name} rejected: ${validation.error}`);
        }
        return validation.isValid;
      });

      if (validFiles.length === 0) {
        alert('没有有效的文件可以上传');
        return;
      }

      // 批量处理文件
      const processedFiles = await mediaProcessingService.processMediaFiles(validFiles);
      
      // 添加到媒体库
      setMediaFiles(prev => [...prev, ...processedFiles]);
      
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('File upload failed:', error);
      alert('文件上传失败');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 点击上传按钮
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 文件输入变化
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // 清空输入框以允许重新选择相同文件
    e.target.value = '';
  }, [handleFileSelect]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // 搜索过滤
  const filteredFiles = mediaFiles.filter(file =>
    file.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 文件选择
  const handleFileSelection = useCallback((fileId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedFiles(prev => 
        prev.includes(fileId) 
          ? prev.filter(id => id !== fileId)
          : [...prev, fileId]
      );
    } else {
      setSelectedFiles([fileId]);
    }
  }, []);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* 头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">媒体库</h2>
          
          <div className="flex items-center space-x-2">
            {/* 视图模式切换 */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* 过滤器按钮 */}
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索媒体文件..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 上传区域 */}
      <div className="p-4 border-b border-border">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragOver 
              ? "border-primary bg-primary/10" 
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            拖拽文件到此处或点击上传
          </p>
          <p className="text-xs text-muted-foreground">
            支持 MP4, WebM, MP3, WAV, JPG, PNG 等格式
          </p>
          
          {/* 上传进度 */}
          {isUploading && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                上传中... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 媒体文件列表 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">
              {mediaFiles.length === 0 ? '媒体库为空' : '没有找到匹配的文件'}
            </p>
            <p className="text-xs mt-1">
              {mediaFiles.length === 0 ? '上传一些文件开始编辑' : '尝试其他搜索词'}
            </p>
          </div>
        ) : (
          <div className="p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredFiles.map((file) => (
                  <MediaItem
                    key={file.id}
                    file={file}
                    viewMode="grid"
                    isSelected={selectedFiles.includes(file.id)}
                    onSelect={(multiSelect) => handleFileSelection(file.id, multiSelect)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <MediaItem
                    key={file.id}
                    file={file}
                    viewMode="list"
                    isSelected={selectedFiles.includes(file.id)}
                    onSelect={(multiSelect) => handleFileSelection(file.id, multiSelect)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {selectedFiles.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between text-sm">
            <span>已选择 {selectedFiles.length} 个文件</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
            >
              清除选择
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}