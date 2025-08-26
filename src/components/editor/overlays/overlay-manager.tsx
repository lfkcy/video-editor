'use client';
// Fixed imports

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Type, Image, Layers, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { TextOverlay as TextOverlayType, ImageOverlay } from '@/types';
import { TextOverlay, TextOverlayControls } from './text-overlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, generateId } from '@/lib/utils';
import { videoClipService } from '@/services';

interface OverlayManagerProps {
  containerWidth: number;
  containerHeight: number;
  currentTime: number; // 当前播放时间（毫秒）
  onOverlaysUpdate?: (textOverlays: TextOverlayType[], imageOverlays: ImageOverlay[]) => void;
}

/**
 * 叠加层管理器组件
 */
export function OverlayManager({ 
  containerWidth, 
  containerHeight, 
  currentTime,
  onOverlaysUpdate 
}: OverlayManagerProps) {
  const [textOverlays, setTextOverlays] = useState<TextOverlayType[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取选中的文字叠加
  const selectedTextOverlay = textOverlays.find(overlay => overlay.id === selectedOverlayId);

  // 通知父组件叠加层更新
  useEffect(() => {
    onOverlaysUpdate?.(textOverlays, imageOverlays);
  }, [textOverlays, imageOverlays, onOverlaysUpdate]);

  // 添加文字叠加
  const addTextOverlay = useCallback(() => {
    const newOverlay: TextOverlayType = {
      id: generateId(),
      text: '新文字',
      position: { x: 50, y: 50 },
      fontSize: 32,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      background: null,
      textAlign: 'center',
      opacity: 100,
      rotation: 0,
      shadow: true,
      zIndex: textOverlays.length,
      startTime: currentTime,
      duration: 5000, // 默认5秒
    };

    setTextOverlays(prev => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setEditingOverlayId(newOverlay.id);

    // 添加到画布服务
    videoClipService.addTextSprite(newOverlay.text, {
      fontSize: newOverlay.fontSize,
      fontFamily: newOverlay.fontFamily,
      fontWeight: newOverlay.fontWeight,
      color: newOverlay.color,
      backgroundColor: newOverlay.background || 'transparent',
      textAlign: newOverlay.textAlign,
      lineHeight: 1.2,
      letterSpacing: '0px',
      shadow: {
        enabled: newOverlay.shadow,
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: 'rgba(0,0,0,0.5)',
      },
    }, newOverlay.id);
  }, [currentTime, textOverlays.length]);

  // 添加图片叠加
  const addImageOverlay = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // 处理图片文件选择
  const handleImageFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 创建URL
    const imageUrl = URL.createObjectURL(file);

    const newOverlay: ImageOverlay = {
      id: generateId(),
      imageUrl,
      position: { x: 50, y: 50 },
      size: { width: 20, height: 20 },
      opacity: 100,
      rotation: 0,
      zIndex: imageOverlays.length,
      startTime: currentTime,
      duration: 5000, // 默认5秒
    };

    setImageOverlays(prev => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);

    // 添加到画布服务
    videoClipService.addImageSpriteFromUrl(imageUrl, newOverlay.id);

    // 清空文件输入
    event.target.value = '';
  }, [currentTime, imageOverlays.length]);

  // 更新文字叠加
  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlayType>) => {
    setTextOverlays(prev => 
      prev.map(overlay => 
        overlay.id === id ? { ...overlay, ...updates } : overlay
      )
    );

    // 更新画布服务中的精灵
    const overlay = textOverlays.find(o => o.id === id);
    if (overlay) {
      // if (updates.text !== undefined) {
      //   videoClipService.updateTextSprite(id, {
      //     ...overlay,
      //     ...updates,
      //   });
      // }
      
      if (updates.position) {
        const transform = {
          x: (updates.position.x / 100) * containerWidth,
          y: (updates.position.y / 100) * containerHeight,
        };
        videoClipService.updateSpriteTransform(id, transform);
      }

      if (updates.opacity !== undefined) {
        videoClipService.updateSpriteOpacity(id, updates.opacity / 100);
      }

      if (updates.rotation !== undefined) {
        videoClipService.updateSpriteTransform(id, { rotation: updates.rotation });
      }
    }
  }, [textOverlays, containerWidth, containerHeight]);

  // 更新图片叠加
  const updateImageOverlay = useCallback((id: string, updates: Partial<ImageOverlay>) => {
    setImageOverlays(prev => 
      prev.map(overlay => 
        overlay.id === id ? { ...overlay, ...updates } : overlay
      )
    );

    // 更新画布服务中的精灵
    if (updates.position || updates.size) {
      const overlay = imageOverlays.find(o => o.id === id);
      if (overlay) {
        const transform = {
          x: updates.position ? (updates.position.x / 100) * containerWidth : undefined,
          y: updates.position ? (updates.position.y / 100) * containerHeight : undefined,
          width: updates.size ? (updates.size.width / 100) * containerWidth : undefined,
          height: updates.size ? (updates.size.height / 100) * containerHeight : undefined,
          rotation: updates.rotation,
        };
        videoClipService.updateSpriteTransform(id, transform);
      }
    }

    if (updates.opacity !== undefined) {
      videoClipService.updateSpriteOpacity(id, updates.opacity / 100);
    }
  }, [imageOverlays, containerWidth, containerHeight]);

  // 删除叠加层
  const deleteOverlay = useCallback((id: string) => {
    setTextOverlays(prev => prev.filter(overlay => overlay.id !== id));
    setImageOverlays(prev => prev.filter(overlay => overlay.id !== id));
    
    if (selectedOverlayId === id) {
      setSelectedOverlayId(null);
    }
    if (editingOverlayId === id) {
      setEditingOverlayId(null);
    }

    // 从画布服务中移除
    videoClipService.removeSprite(id);
  }, [selectedOverlayId, editingOverlayId]);

  // 调整层级
  const moveOverlayLayer = useCallback((id: string, direction: 'up' | 'down') => {
    const isTextOverlay = textOverlays.some(o => o.id === id);
    
    if (isTextOverlay) {
      setTextOverlays(prev => {
        const index = prev.findIndex(o => o.id === id);
        if (index === -1) return prev;

        const newArray = [...prev];
        const newZIndex = direction === 'up' ? prev[index].zIndex + 1 : prev[index].zIndex - 1;
        
        // 限制范围
        if (newZIndex < 0 || newZIndex >= prev.length) return prev;

        newArray[index] = { ...prev[index], zIndex: newZIndex };
        videoClipService.setSpriteZIndex(id, newZIndex);
        
        return newArray;
      });
    } else {
      setImageOverlays(prev => {
        const index = prev.findIndex(o => o.id === id);
        if (index === -1) return prev;

        const newArray = [...prev];
        const newZIndex = direction === 'up' ? prev[index].zIndex + 1 : prev[index].zIndex - 1;
        
        if (newZIndex < 0 || newZIndex >= prev.length) return prev;

        newArray[index] = { ...prev[index], zIndex: newZIndex };
        videoClipService.setSpriteZIndex(id, newZIndex);
        
        return newArray;
      });
    }
  }, [textOverlays, imageOverlays]);

  // 获取当前时间显示的叠加层
  const getVisibleOverlays = useCallback(() => {
    const visibleTextOverlays = textOverlays.filter(overlay => 
      currentTime >= overlay.startTime && 
      currentTime <= overlay.startTime + overlay.duration
    );

    const visibleImageOverlays = imageOverlays.filter(overlay => 
      currentTime >= overlay.startTime && 
      currentTime <= overlay.startTime + overlay.duration
    );

    return { textOverlays: visibleTextOverlays, imageOverlays: visibleImageOverlays };
  }, [textOverlays, imageOverlays, currentTime]);

  const { textOverlays: visibleTextOverlays, imageOverlays: visibleImageOverlays } = getVisibleOverlays();

  return (
    <div className="overlay-manager h-full flex flex-col">
      {/* 叠加层预览区域 */}
      <div 
        className="relative flex-1 bg-black/20 border border-border rounded-lg overflow-hidden"
        style={{ aspectRatio: `${containerWidth}/${containerHeight}` }}
      >
        {/* 当前时间可见的文字叠加 */}
        {visibleTextOverlays.map(overlay => (
          <TextOverlay
            key={overlay.id}
            overlay={overlay}
            isSelected={selectedOverlayId === overlay.id}
            isEditing={editingOverlayId === overlay.id}
            onSelect={() => setSelectedOverlayId(overlay.id)}
            onUpdate={(updates) => updateTextOverlay(overlay.id, updates)}
            onDelete={() => deleteOverlay(overlay.id)}
            onStartEditing={() => setEditingOverlayId(overlay.id)}
            onStopEditing={() => setEditingOverlayId(null)}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
          />
        ))}

        {/* 当前时间可见的图片叠加 */}
        {visibleImageOverlays.map(overlay => (
          <div
            key={overlay.id}
            className={cn(
              "absolute cursor-move",
              selectedOverlayId === overlay.id && "ring-2 ring-primary"
            )}
            style={{
              left: `${overlay.position.x}%`,
              top: `${overlay.position.y}%`,
              width: `${overlay.size.width}%`,
              height: `${overlay.size.height}%`,
              opacity: overlay.opacity / 100,
              transform: `rotate(${overlay.rotation}deg)`,
              zIndex: 1000 + overlay.zIndex,
            }}
            onClick={() => setSelectedOverlayId(overlay.id)}
          >
            <img
              src={overlay.imageUrl}
              alt="Overlay"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}

        {/* 添加按钮 */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={addTextOverlay}
            className="h-8"
          >
            <Type className="h-4 w-4 mr-1" />
            文字
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={addImageOverlay}
            className="h-8"
          >
            <Image className="h-4 w-4 mr-1" />
            图片
          </Button>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="h-64 border-t border-border">
        <Tabs defaultValue="properties" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties">属性</TabsTrigger>
            <TabsTrigger value="layers">图层</TabsTrigger>
          </TabsList>
          
          <TabsContent value="properties" className="h-full overflow-y-auto">
            {selectedTextOverlay ? (
              <TextOverlayControls
                overlay={selectedTextOverlay}
                onUpdate={(updates) => updateTextOverlay(selectedTextOverlay.id, updates)}
              />
            ) : (
              <div className="text-center text-muted-foreground p-4">
                选择一个叠加层来编辑属性
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="layers" className="h-full overflow-y-auto p-4">
            <div className="space-y-2">
              {/* 文字叠加层列表 */}
              {textOverlays.map(overlay => (
                <Card 
                  key={overlay.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedOverlayId === overlay.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedOverlayId(overlay.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Type className="h-4 w-4" />
                        <span className="text-sm font-medium truncate">
                          {overlay.text || '空文字'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOverlayLayer(overlay.id, 'up');
                          }}
                          className="h-6 w-6"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOverlayLayer(overlay.id, 'down');
                          }}
                          className="h-6 w-6"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* 图片叠加层列表 */}
              {imageOverlays.map(overlay => (
                <Card 
                  key={overlay.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedOverlayId === overlay.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedOverlayId(overlay.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4" />
                        <span className="text-sm font-medium">图片叠加</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOverlayLayer(overlay.id, 'up');
                          }}
                          className="h-6 w-6"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOverlayLayer(overlay.id, 'down');
                          }}
                          className="h-6 w-6"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {textOverlays.length === 0 && imageOverlays.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  还没有叠加层
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />
    </div>
  );
}