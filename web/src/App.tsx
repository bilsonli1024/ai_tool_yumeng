/**
 * Amazon AI Suite — 图片生成 + 文案生成 一站式工具
 */
import React, { useState } from 'react';
import { Image as ImageIcon, FileText, Sparkles } from 'lucide-react';
import ImageProApp from './apps/ImageProApp';
import CopywriterApp from './apps/CopywriterApp';

type Tool = 'image' | 'copy';

const tools: { id: Tool; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'image',
    label: '前台图生成',
    desc: 'AI 一键生成 7 张专业亚马逊产品图 + A+ 页面',
    icon: <ImageIcon size={20} />,
  },
  {
    id: 'copy',
    label: '文案生成',
    desc: '竞品深度分析，一键输出高转化标题、五点、描述',
    icon: <FileText size={20} />,
  },
];

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('image');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* ── Global Header ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-400 rounded-lg flex items-center justify-center shadow-md shadow-orange-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">Amazon AI Suite</span>
              <span className="hidden sm:inline text-xs text-gray-400 ml-2">图片 & 文案 一站式</span>
            </div>
          </div>

          {/* Tool switcher tabs */}
          <nav className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTool === t.id
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Tool Description Banner ────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
            {tools.find(t => t.id === activeTool)?.icon}
          </div>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">
              {tools.find(t => t.id === activeTool)?.label}
            </span>
            {' — '}
            {tools.find(t => t.id === activeTool)?.desc}
          </p>
        </div>
      </div>

      {/* ── Active Tool ────────────────────────────────── */}
      <main>
        {activeTool === 'image' && <ImageProApp />}
        {activeTool === 'copy'  && <CopywriterApp />}
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-10 border-t border-gray-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm text-gray-400">© 2026 Amazon AI Suite. 专业级亚马逊 AI 视觉 & 文案解决方案.</p>
          <div className="flex justify-center gap-6 text-xs text-gray-400 uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-orange-500 transition-colors">使用协议</a>
            <a href="#" className="hover:text-orange-500 transition-colors">隐私政策</a>
            <a href="#" className="hover:text-orange-500 transition-colors">联系支持</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

