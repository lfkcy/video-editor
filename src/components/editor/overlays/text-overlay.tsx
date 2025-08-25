'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { TextOverlay as TextOverlayType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TextOverlayProps {
  overlay: TextOverlayType;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextOverlayType>) => void;
  onDelete: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  containerWidth: number;
  containerHeight: number;
}

/**
 * 文字叠加组件
 */
export function TextOverlay({
  overlay,
  isSelected,
  isEditing,
  onSelect,
  onUpdate,
  onDelete,
  onStartEditing,
  onStopEditing,
  containerWidth,
  containerHeight,
}: TextOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 计算实际位置和大小
  const actualX = (overlay.position.x / 100) * containerWidth;
  const actualY = (overlay.position.y / 100) * containerHeight;
  const actualFontSize = Math.max(12, Math.min(120, overlay.fontSize * (containerWidth / 1920)));

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onSelect();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition({ x: actualX, y: actualY });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const newX = Math.max(0, Math.min(containerWidth - 100, initialPosition.x + deltaX));
    const newY = Math.max(0, Math.min(containerHeight - 50, initialPosition.y + deltaY));
    
    onUpdate({
      position: {
        x: (newX / containerWidth) * 100,
        y: (newY / containerHeight) * 100,
      },
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    if (!isSelected) {
      onSelect();
    }
    onStartEditing();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ text: e.target.value });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onStopEditing();
    } else if (e.key === 'Escape') {
      onStopEditing();
    }
  };

  const handleInputBlur = () => {
    onStopEditing();
  };

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    left: actualX,
    top: actualY,
    fontSize: actualFontSize,
    fontFamily: overlay.fontFamily,
    fontWeight: overlay.fontWeight,
    fontStyle: overlay.fontStyle,
    color: overlay.color,
    textAlign: overlay.textAlign,
    textShadow: overlay.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
    background: overlay.background || 'transparent',
    padding: overlay.background ? '4px 8px' : '0',
    borderRadius: overlay.background ? '4px' : '0',
    opacity: overlay.opacity / 100,
    transform: `rotate(${overlay.rotation}deg)`,
    cursor: isEditing ? 'text' : 'move',
    userSelect: isEditing ? 'text' : 'none',
    whiteSpace: 'nowrap',
    zIndex: 1000 + overlay.zIndex,
  };

  return (
    <div
      ref={textRef}
      className={cn(
        "text-overlay",
        isSelected && "selected",
        isDragging && "dragging"
      )}
      style={textStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* 文字内容 */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={overlay.text}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          className="bg-transparent border-dashed border-primary text-inherit font-inherit text-inherit"
          style={{
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
            textAlign: 'inherit',
          }}
        />
      ) : (
        <span>{overlay.text || '请输入文字'}</span>
      )}

      {/* 选中状态的控制点 */}
      {isSelected && !isEditing && (
        <>
          {/* 边框 */}
          <div className="absolute inset-0 border-2 border-primary border-dashed pointer-events-none" />
          
          {/* 删除按钮 */}
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-8 -right-8 h-6 w-6 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
          
          {/* 调整大小控制点 */}
          <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-primary border border-white cursor-se-resize" />
        </>
      )}
    </div>
  );
}

interface TextOverlayControlsProps {
  overlay: TextOverlayType | null;
  onUpdate: (updates: Partial<TextOverlayType>) => void;
}

/**
 * 文字叠加控制面板
 */
export function TextOverlayControls({ overlay, onUpdate }: TextOverlayControlsProps) {
  if (!overlay) {
    return (
      <div className="text-center text-muted-foreground p-4">
        选择一个文字层来编辑属性
      </div>
    );
  }

  const fontFamilies = [
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    '宋体, SimSun, serif',
    '微软雅黑, Microsoft YaHei, sans-serif',
    '黑体, SimHei, sans-serif',
    'Times New Roman, serif',
    'Georgia, serif',
    'Courier New, monospace',
  ];

  const textAlignOptions = [
    { value: 'left', icon: AlignLeft, label: '左对齐' },
    { value: 'center', icon: AlignCenter, label: '居中' },
    { value: 'right', icon: AlignRight, label: '右对齐' },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* 文字内容 */}
      <div>
        <Label htmlFor="text-content">文字内容</Label>
        <Input
          id="text-content"
          value={overlay.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="请输入文字"
        />
      </div>

      {/* 字体设置 */}
      <div className="space-y-2">
        <Label>字体设置</Label>
        
        {/* 字体族 */}
        <select
          value={overlay.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full p-2 border border-border rounded-md bg-background"
        >
          {fontFamilies.map((font) => (
            <option key={font} value={font}>
              {font.split(',')[0]}
            </option>
          ))}
        </select>
        
        {/* 字体大小 */}
        <div>
          <Label>字体大小: {overlay.fontSize}px</Label>
          <Slider
            value={[overlay.fontSize]}
            onValueChange={([value]) => onUpdate({ fontSize: value })}
            min={12}
            max={120}
            step={1}
            className="mt-2"
          />
        </div>
        
        {/* 字体样式 */}
        <div className="flex items-center space-x-2">
          <Button
            variant={overlay.fontWeight === 'bold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdate({ 
              fontWeight: overlay.fontWeight === 'bold' ? 'normal' : 'bold' 
            })}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={overlay.fontStyle === 'italic' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onUpdate({ 
              fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic' 
            })}
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 文字颜色 */}
      <div>
        <Label htmlFor="text-color">文字颜色</Label>
        <Input
          id="text-color"
          type="color"
          value={overlay.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-full h-10"
        />
      </div>

      {/* 文字对齐 */}
      <div>
        <Label>文字对齐</Label>
        <div className="flex items-center space-x-1 mt-2">
          {textAlignOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={overlay.textAlign === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onUpdate({ textAlign: option.value as any })}
                title={option.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* 背景色 */}
      <div>
        <Label htmlFor="text-background">背景色（可选）</Label>
        <div className="flex items-center space-x-2 mt-2">
          <Input
            id="text-background"
            type="color"
            value={overlay.background || '#000000'}
            onChange={(e) => onUpdate({ background: e.target.value })}
            className="w-20 h-10"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate({ background: overlay.background ? null : '#000000' })}
          >
            {overlay.background ? '移除背景' : '添加背景'}
          </Button>
        </div>
      </div>

      {/* 透明度 */}
      <div>
        <Label>透明度: {overlay.opacity}%</Label>
        <Slider
          value={[overlay.opacity]}
          onValueChange={([value]) => onUpdate({ opacity: value })}
          min={0}
          max={100}
          step={1}
          className="mt-2"
        />
      </div>

      {/* 旋转角度 */}
      <div>
        <Label>旋转角度: {overlay.rotation}°</Label>
        <Slider
          value={[overlay.rotation]}
          onValueChange={([value]) => onUpdate({ rotation: value })}
          min={-180}
          max={180}
          step={1}
          className="mt-2"
        />
      </div>

      {/* 文字阴影 */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="text-shadow"
          checked={overlay.shadow}
          onChange={(e) => onUpdate({ shadow: e.target.checked })}
        />
        <Label htmlFor="text-shadow">添加阴影</Label>
      </div>
    </div>
  );
}