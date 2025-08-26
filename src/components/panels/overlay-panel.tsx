'use client';

import React, { useState } from 'react';
import { Layers, Type, Image, Plus } from 'lucide-react';
import { OverlayManager } from '../editor/overlays/overlay-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProjectStore, useTimelineStore } from '@/stores';
import { ImageOverlay, TextOverlay } from '@/types';

/**
 * 叠加层面板组件
 */
export function OverlayPanel() {
  const { currentProject } = useProjectStore();
  const { playhead } = useTimelineStore();
  const [overlayData, setOverlayData] = useState<{textOverlays:TextOverlay[],imageOverlays:ImageOverlay[]}>({ textOverlays: [], imageOverlays: [] });

  if (!currentProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5" />
            <span>叠加层</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            请先创建或打开项目
          </div>
        </CardContent>
      </Card>
    );
  }

  const projectSettings = currentProject.settings;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5" />
            <span>叠加层</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {overlayData.textOverlays.length + overlayData.imageOverlays.length} 个图层
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <OverlayManager
          containerWidth={projectSettings.width}
          containerHeight={projectSettings.height}
          currentTime={playhead}
          onOverlaysUpdate={(textOverlays, imageOverlays) => {
            setOverlayData({ textOverlays, imageOverlays });
          }}
        />
      </CardContent>
    </Card>
  );
}