'use client';

import { VideoEditor } from '@/components/editor/video-editor';

export default function Home() {
  return (
    <main className="h-screen overflow-hidden">
      <VideoEditor />
    </main>
  );
}