/**
 * 视频编辑器集成测试
 * 测试核心功能是否正常工作
 */

import { VideoClipService, createVideoClipService, isSupportedFormat, getFileType } from '@/services/video-clip-service';
import { AVCanvasManager, createAVCanvasManager } from '@/lib/av-canvas-manager';
import { ActionSpriteManager, createActionSpriteManager } from '@/lib/action-sprite-manager';
import { TimelineAVCanvasIntegrator, createTimelineAVCanvasIntegrator } from '@/lib/timeline-avcanvas-integrator';
import { PlaybackSyncManager, createPlaybackSyncManager } from '@/lib/playback-sync-manager';
import { ClipOperationManager, createClipOperationManager } from '@/lib/clip-operation-manager';
import { KeyboardShortcutManager, createKeyboardShortcutManager } from '@/lib/keyboard-shortcut-manager';

/**
 * 测试结果类型
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

/**
 * 测试套件
 */
export class VideoEditorTestSuite {
  private results: TestResult[] = [];
  private mockContainer: HTMLDivElement;

  constructor() {
    // 创建模拟容器
    this.mockContainer = document.createElement('div');
    this.mockContainer.style.width = '800px';
    this.mockContainer.style.height = '600px';
    document.body.appendChild(this.mockContainer);
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 开始视频编辑器集成测试');
    
    this.results = [];

    // 基础功能测试
    await this.testFileTypeDetection();
    await this.testAVCanvasManager();
    await this.testActionSpriteManager();
    await this.testVideoClipService();
    
    // 集成测试
    await this.testTimelineIntegration();
    await this.testPlaybackSync();
    await this.testClipOperations();
    await this.testKeyboardShortcuts();
    
    // 性能测试
    await this.testPerformance();

    this.printResults();
    return this.results;
  }

  /**
   * 测试文件类型检测
   */
  private async testFileTypeDetection(): Promise<void> {
    await this.runTest('文件类型检测', async () => {
      // 创建模拟文件
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      const audioFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const unsupportedFile = new File([''], 'test.txt', { type: 'text/plain' });

      // 测试文件类型检测
      if (!isSupportedFormat(videoFile)) throw new Error('视频文件检测失败');
      if (!isSupportedFormat(audioFile)) throw new Error('音频文件检测失败');
      if (!isSupportedFormat(imageFile)) throw new Error('图片文件检测失败');
      if (isSupportedFormat(unsupportedFile)) throw new Error('不支持的文件检测失败');

      // 测试文件类型分类
      if (getFileType(videoFile) !== 'video') throw new Error('视频类型分类失败');
      if (getFileType(audioFile) !== 'audio') throw new Error('音频类型分类失败');
      if (getFileType(imageFile) !== 'image') throw new Error('图片类型分类失败');
      if (getFileType(unsupportedFile) !== 'unknown') throw new Error('未知类型分类失败');
    });
  }

  /**
   * 测试 AVCanvas 管理器
   */
  private async testAVCanvasManager(): Promise<void> {
    await this.runTest('AVCanvas 管理器', async () => {
      const manager = createAVCanvasManager();
      
      // 测试初始化
      await manager.initialize(this.mockContainer, {
        width: 800,
        height: 600,
        bgColor: '#000000'
      });

      if (!manager.getInitialized()) {
        throw new Error('AVCanvas 管理器初始化失败');
      }

      // 测试事件监听器
      let timeUpdateReceived = false;
      let playStateReceived = false;

      const unsubscribeTime = manager.onTimeUpdate(() => {
        timeUpdateReceived = true;
      });

      const unsubscribePlayState = manager.onPlayingStateChange(() => {
        playStateReceived = true;
      });

      // 清理监听器
      unsubscribeTime();
      unsubscribePlayState();

      // 销毁管理器
      await manager.destroy();

      if (manager.getInitialized()) {
        throw new Error('AVCanvas 管理器销毁失败');
      }
    });
  }

  /**
   * 测试 ActionSprite 映射管理器
   */
  private async testActionSpriteManager(): Promise<void> {
    await this.runTest('ActionSprite 映射管理器', async () => {
      const manager = createActionSpriteManager();
      
      // 创建模拟数据
      const mockAction = {
        id: 'test-action',
        start: 0,
        end: 10,
        effectId: '',
        name: 'Test Action'
      };

      const mockSprite = {} as any; // 模拟 VisibleSprite

      // 测试注册映射
      manager.register(mockAction, mockSprite);

      // 测试获取映射
      const retrievedSprite = manager.getSpriteByAction(mockAction);
      const retrievedAction = manager.getActionBySprite(mockSprite);

      if (retrievedSprite !== mockSprite) {
        throw new Error('获取 Sprite 失败');
      }

      if (retrievedAction !== mockAction) {
        throw new Error('获取 Action 失败');
      }

      // 测试验证映射
      const validation = manager.validateMappings();
      if (!validation.valid) {
        throw new Error('映射验证失败: ' + validation.errors.join(', '));
      }

      // 测试统计信息
      const stats = manager.getStats();
      if (stats.mappingCount !== 1) {
        throw new Error('统计信息错误');
      }

      // 测试取消注册
      manager.unregister(mockAction);
      
      const afterUnregister = manager.getSpriteByAction(mockAction);
      if (afterUnregister !== undefined) {
        throw new Error('取消注册失败');
      }
    });
  }

  /**
   * 测试 VideoClipService
   */
  private async testVideoClipService(): Promise<void> {
    await this.runTest('VideoClipService', async () => {
      const service = createVideoClipService();
      
      // 测试初始化
      await service.initialize(this.mockContainer, {
        width: 800,
        height: 600,
        fps: 30,
        sampleRate: 44100,
        channels: 2,
        videoBitrate: 5000,
        audioBitrate: 128,
        format: 'mp4'
      });

      // 测试获取管理器
      const avCanvasManager = service.getAVCanvasManager();
      const actionSpriteManager = service.getActionSpriteManager();

      if (!avCanvasManager) {
        throw new Error('获取 AVCanvas 管理器失败');
      }

      if (!actionSpriteManager) {
        throw new Error('获取 ActionSprite 管理器失败');
      }

      // 测试统计信息
      const stats = service.getStats();
      if (!stats.isInitialized) {
        throw new Error('服务初始化状态错误');
      }

      // 测试销毁
      await service.destroy();
    });
  }

  /**
   * 测试时间轴集成
   */
  private async testTimelineIntegration(): Promise<void> {
    await this.runTest('时间轴集成', async () => {
      const videoClipService = createVideoClipService();
      await videoClipService.initialize(this.mockContainer);

      const integrator = createTimelineAVCanvasIntegrator(videoClipService);
      
      // 创建模拟时间轴引用
      const mockTimelineRef = { current: null };
      integrator.initialize(mockTimelineRef);

      if (!integrator.getInitialized()) {
        throw new Error('时间轴集成器初始化失败');
      }

      // 测试时间变化处理
      integrator.handleTimelineTimeChange(5.0);

      // 测试播放控制
      integrator.togglePlayPause();
      integrator.seekTo(10.0);

      // 清理
      integrator.destroy();
      await videoClipService.destroy();
    });
  }

  /**
   * 测试播放同步
   */
  private async testPlaybackSync(): Promise<void> {
    await this.runTest('播放同步', async () => {
      const videoClipService = createVideoClipService();
      await videoClipService.initialize(this.mockContainer);

      const timelineIntegrator = createTimelineAVCanvasIntegrator(videoClipService);
      timelineIntegrator.initialize({ current: null });

      const playbackSync = createPlaybackSyncManager(videoClipService, timelineIntegrator);
      playbackSync.initialize();

      if (!playbackSync.getInitialized()) {
        throw new Error('播放同步管理器初始化失败');
      }

      // 测试播放状态获取
      const state = playbackSync.getPlaybackState();
      if (typeof state.isPlaying !== 'boolean') {
        throw new Error('播放状态类型错误');
      }

      // 测试播放控制
      await playbackSync.seekTo(2.5);
      await playbackSync.stop();

      // 清理
      playbackSync.destroy();
      timelineIntegrator.destroy();
      await videoClipService.destroy();
    });
  }

  /**
   * 测试片段操作
   */
  private async testClipOperations(): Promise<void> {
    await this.runTest('片段操作', async () => {
      const videoClipService = createVideoClipService();
      await videoClipService.initialize(this.mockContainer);

      const timelineIntegrator = createTimelineAVCanvasIntegrator(videoClipService);
      timelineIntegrator.initialize({ current: null });

      const clipOperations = createClipOperationManager(videoClipService, timelineIntegrator);
      clipOperations.initialize();

      if (!clipOperations.getInitialized()) {
        throw new Error('片段操作管理器初始化失败');
      }

      // 测试统计信息
      const stats = clipOperations.getStats();
      if (typeof stats.totalOperations !== 'number') {
        throw new Error('统计信息类型错误');
      }

      // 测试操作历史
      const history = clipOperations.getOperationHistory();
      if (!Array.isArray(history)) {
        throw new Error('操作历史类型错误');
      }

      // 清理
      clipOperations.destroy();
      timelineIntegrator.destroy();
      await videoClipService.destroy();
    });
  }

  /**
   * 测试键盘快捷键
   */
  private async testKeyboardShortcuts(): Promise<void> {
    await this.runTest('键盘快捷键', async () => {
      const shortcutManager = createKeyboardShortcutManager();

      // 测试获取快捷键
      const shortcuts = shortcutManager.getAllShortcuts();
      if (!Array.isArray(shortcuts) || shortcuts.length === 0) {
        throw new Error('快捷键列表为空');
      }

      // 测试分类
      const categories = shortcutManager.getCategories();
      if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error('快捷键分类为空');
      }

      // 测试格式化
      const formattedShortcut = shortcutManager.formatShortcut(shortcuts[0]);
      if (typeof formattedShortcut !== 'string') {
        throw new Error('快捷键格式化失败');
      }

      // 测试自定义快捷键
      shortcutManager.addShortcut({
        key: 'KeyT',
        modifiers: ['ctrl'],
        action: 'testAction',
        description: '测试快捷键',
        category: '测试'
      });

      const updatedShortcuts = shortcutManager.getAllShortcuts();
      if (updatedShortcuts.length !== shortcuts.length + 1) {
        throw new Error('添加自定义快捷键失败');
      }

      // 测试移除快捷键
      const removed = shortcutManager.removeShortcut('KeyT', ['ctrl']);
      if (!removed) {
        throw new Error('移除快捷键失败');
      }

      // 清理
      shortcutManager.destroy();
    });
  }

  /**
   * 测试性能
   */
  private async testPerformance(): Promise<void> {
    await this.runTest('性能测试', async () => {
      const startTime = performance.now();

      // 创建多个服务实例来测试性能
      const services: VideoClipService[] = [];
      const containers: HTMLDivElement[] = [];

      try {
        for (let i = 0; i < 5; i++) {
          const container = document.createElement('div');
          container.style.width = '400px';
          container.style.height = '300px';
          document.body.appendChild(container);
          containers.push(container);

          const service = createVideoClipService();
          await service.initialize(container);
          services.push(service);
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 性能基准：5个服务初始化应该在5秒内完成
        if (duration > 5000) {
          throw new Error(`性能测试失败：初始化时间过长 (${duration}ms)`);
        }

        console.log(`性能测试通过：5个服务初始化用时 ${duration.toFixed(2)}ms`);

      } finally {
        // 清理资源
        await Promise.all(services.map(service => service.destroy()));
        containers.forEach(container => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        });
      }
    });
  }

  /**
   * 运行单个测试
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    console.log(`🔍 测试: ${name}`);
    const startTime = performance.now();

    try {
      await testFn();
      const duration = performance.now() - startTime;
      
      this.results.push({
        name,
        passed: true,
        duration
      });
      
      console.log(`✅ ${name} - 通过 (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        name,
        passed: false,
        error: errorMessage,
        duration
      });
      
      console.error(`❌ ${name} - 失败: ${errorMessage} (${duration.toFixed(2)}ms)`);
    }
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log('\n📊 测试结果汇总:');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`总用时: ${totalDuration.toFixed(2)}ms`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }

    console.log(passedTests === totalTests ? '\n🎉 所有测试通过!' : '\n⚠️ 存在测试失败');
  }

  /**
   * 清理测试环境
   */
  cleanup(): void {
    if (this.mockContainer && this.mockContainer.parentNode) {
      this.mockContainer.parentNode.removeChild(this.mockContainer);
    }
  }
}

/**
 * 创建测试套件实例
 */
export function createVideoEditorTestSuite(): VideoEditorTestSuite {
  return new VideoEditorTestSuite();
}

/**
 * 运行快速测试（用于开发环境）
 */
export async function runQuickTest(): Promise<boolean> {
  const testSuite = createVideoEditorTestSuite();
  
  try {
    const results = await testSuite.runAllTests();
    return results.every(r => r.passed);
  } finally {
    testSuite.cleanup();
  }
}