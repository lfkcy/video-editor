'use client';

import React from 'react';
import { useProjectStore, useTimelineStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverlayPanel } from './overlay-panel';
import { Settings, Info, Palette, Volume2, Layers } from 'lucide-react';

/**
 * 属性面板组件
 */
export function PropertyPanel() {
  const { currentProject } = useProjectStore();
  const { selectedClips } = useTimelineStore();

  // 获取选中的片段
  const selectedClipObjects = selectedClips.map(clipId => {
    if (!currentProject) return null;
    
    for (const track of currentProject.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) return clip;
    }
    return null;
  }).filter(Boolean);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="text-4xl mb-3">🎛️</div>
      <h3 className="text-lg font-medium mb-2">属性面板</h3>
      <p className="text-sm text-muted-foreground mb-4">
        选择一个片段或轨道来查看和编辑其属性
      </p>
    </div>
  );

  const renderProjectProperties = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">项目设置</h3>
      </div>

      {/* 项目基本信息 */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">项目名称</label>
          <input
            type="text"
            value={currentProject?.name || ''}
            className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            placeholder="项目名称"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">宽度</label>
            <input
              type="number"
              value={currentProject?.settings.width || 1920}
              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">高度</label>
            <input
              type="number"
              value={currentProject?.settings.height || 1080}
              className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">帧率</label>
            <select className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background">
              <option value={24}>24 fps</option>
              <option value={25}>25 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">质量</label>
            <select className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="ultra">超高</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClipProperties = () => {
    if (selectedClipObjects.length === 0) return null;

    const clip = selectedClipObjects[0]; // 显示第一个选中片段的属性

    return (
      clip?<div className="p-4 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="h-5 w-5" />
          <h3 className="text-lg font-semibold">片段属性</h3>
        </div>

        {/* 基本信息 */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">名称</label>
            <div className="mt-1 p-2 text-sm bg-muted rounded-md">
              {clip.source.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">开始时间</label>
              <input
                type="text"
                value={`${(clip.startTime / 1000).toFixed(2)}s`}
                className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium">时长</label>
              <input
                type="text"
                value={`${(clip.duration / 1000).toFixed(2)}s`}
                className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 变换属性 */}
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <Palette className="h-4 w-4" />
            <h4 className="font-medium">变换</h4>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">X 位置</label>
                <input
                  type="number"
                  value={clip.transform.x}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Y 位置</label>
                <input
                  type="number"
                  value={clip.transform.y}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">宽度</label>
                <input
                  type="number"
                  value={clip.transform.width}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">高度</label>
                <input
                  type="number"
                  value={clip.transform.height}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">旋转角度</label>
              <input
                type="range"
                min="-180"
                max="180"
                value={clip.transform.rotation}
                className="w-full mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {clip.transform.rotation}°
              </div>
            </div>
          </div>
        </div>

        {/* 音频属性（视频和音频片段） */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Volume2 className="h-4 w-4" />
              <h4 className="font-medium">音频</h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">音量</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={1}
                  className="w-full mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  100%
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="mute" className="rounded" />
                <label htmlFor="mute" className="text-sm">静音</label>
              </div>
            </div>
          </div>
        )}

        {/* 效果列表 */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">效果</h4>
          
          {clip.effects.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无效果</p>
          ) : (
            <div className="space-y-2">
              {clip.effects.map((effect, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-sm">{effect.type}</span>
                  <Button variant="ghost" size="sm">
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full mt-3">
            添加效果
          </Button>
        </div>
      </div>:null
    );
  };

  return (
    <div className="property-panel h-full flex flex-col">
      <Tabs defaultValue="properties" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-2">
          <TabsTrigger value="properties" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>属性</span>
          </TabsTrigger>
          <TabsTrigger value="overlays" className="flex items-center space-x-2">
            <Layers className="h-4 w-4" />
            <span>叠加层</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="properties" className="flex-1 overflow-y-auto mt-0">
          <div className="h-full flex flex-col bg-card">
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold">属性</h2>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {selectedClipObjects.length > 0 ? (
                renderClipProperties()
              ) : currentProject ? (
                renderProjectProperties()
              ) : (
                renderEmptyState()
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="overlays" className="flex-1 mt-0">
          <OverlayPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
