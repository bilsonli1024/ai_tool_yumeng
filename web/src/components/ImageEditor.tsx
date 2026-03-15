import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { 
  Type as TypeIcon, 
  Trash2, 
  X, 
  Check,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scissors,
  Sun,
  Contrast,
  Loader2,
  Sparkles
} from 'lucide-react';
import { editImage } from '../services/gemini';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = async () => {
      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: '#1a1a1a',
      });

      fabricRef.current = canvas;

      try {
        const img = await fabric.FabricImage.fromURL(imageUrl, {
          crossOrigin: 'anonymous'
        });
        
        const scale = Math.min(
          (canvas.width! * 0.8) / img.width!,
          (canvas.height! * 0.8) / img.height!
        );
        
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (canvas.width! - img.width! * scale) / 2,
          top: (canvas.height! - img.height! * scale) / 2,
          selectable: true,
          hasControls: true,
          name: 'mainImage'
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch (error) {
        console.error('Error loading image:', error);
      }

      canvas.on('selection:created', (e) => setActiveObject(e.selected[0]));
      canvas.on('selection:updated', (e) => setActiveObject(e.selected[0]));
      canvas.on('selection:cleared', () => setActiveObject(null));
    };

    initCanvas();

    return () => {
      fabricRef.current?.dispose();
    };
  }, [imageUrl]);

  const addText = () => {
    if (!fabricRef.current) return;
    const text = new fabric.IText('点击输入文字', {
      left: 100,
      top: 100,
      fontFamily: 'sans-serif',
      fontSize: 40,
      fill: '#ffffff',
    });
    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
  };

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    fabricRef.current.remove(...activeObjects);
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  };

  const handleZoom = (delta: number) => {
    if (!fabricRef.current) return;
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    setZoom(newZoom);
    fabricRef.current.setZoom(newZoom);
  };

  const applyFilters = () => {
    if (!fabricRef.current) return;
    const mainImage = fabricRef.current.getObjects().find(obj => obj.name === 'mainImage') as fabric.FabricImage;
    if (mainImage) {
      mainImage.filters = [
        new fabric.filters.Brightness({ brightness: brightness / 100 }),
        new fabric.filters.Contrast({ contrast: contrast / 100 })
      ];
      mainImage.applyFilters();
      fabricRef.current.renderAll();
    }
  };

  useEffect(() => {
    applyFilters();
  }, [brightness, contrast]);

  const handleAiAction = async (action: 'remove_bg' | 'outpaint') => {
    if (!fabricRef.current || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const dataUrl = fabricRef.current.toDataURL({ format: 'png' });
      const instruction = action === 'remove_bg' 
        ? 'Remove the background of this image, keep only the main product.' 
        : 'Expand this image, outpaint the surroundings to create a wider view while maintaining consistency.';
      
      const resultUrl = await editImage(dataUrl, instruction);
      
      if (resultUrl) {
        const canvas = fabricRef.current;
        const oldImg = canvas.getObjects().find(obj => obj.name === 'mainImage');
        if (oldImg) canvas.remove(oldImg);

        const newImg = await fabric.FabricImage.fromURL(resultUrl);
        const scale = Math.min(
          (canvas.width! * 0.8) / newImg.width!,
          (canvas.height! * 0.8) / newImg.height!
        );
        newImg.set({
          scaleX: scale,
          scaleY: scale,
          left: (canvas.width! - newImg.width! * scale) / 2,
          top: (canvas.height! - newImg.height! * scale) / 2,
          selectable: true,
          name: 'mainImage'
        });
        canvas.add(newImg);
        canvas.sendObjectToBack(newImg);
        canvas.renderAll();
      }
    } catch (error) {
      console.error('AI Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveImage = () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({
      format: 'jpeg',
      quality: 0.9,
    });
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
          <h3 className="font-bold">高级图片编辑器</h3>
          {isProcessing && (
            <div className="flex items-center gap-2 text-orange-500 text-sm font-medium animate-pulse">
              <Loader2 className="animate-spin" size={16} />
              AI 正在处理中...
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={saveImage}
            className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            <Check size={18} />
            保存修改
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-20 bg-white border-r flex flex-col items-center py-6 gap-6">
          <button onClick={addText} className="p-3 hover:bg-orange-50 text-gray-600 hover:text-orange-500 rounded-xl transition-all flex flex-col items-center gap-1">
            <TypeIcon size={24} />
            <span className="text-[10px] font-bold">文字</span>
          </button>
          
          <div className="h-px w-10 bg-gray-100" />

          <button 
            onClick={() => handleAiAction('remove_bg')}
            disabled={isProcessing}
            className="p-3 hover:bg-orange-50 text-gray-600 hover:text-orange-500 rounded-xl transition-all flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <Scissors size={24} />
            <span className="text-[10px] font-bold">抠图</span>
          </button>

          <button 
            onClick={() => handleAiAction('outpaint')}
            disabled={isProcessing}
            className="p-3 hover:bg-orange-50 text-gray-600 hover:text-orange-500 rounded-xl transition-all flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <Maximize size={24} />
            <span className="text-[10px] font-bold">扩图</span>
          </button>

          <div className="h-px w-10 bg-gray-100" />

          <button 
            onClick={deleteSelected}
            disabled={!activeObject}
            className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 ${
              activeObject ? 'hover:bg-red-50 text-red-500' : 'text-gray-200 cursor-not-allowed'
            }`}
          >
            <Trash2 size={24} />
            <span className="text-[10px] font-bold">删除</span>
          </button>
        </div>

        {/* Main Canvas Area */}
        <div ref={containerRef} className="flex-1 relative bg-[#0f0f0f] flex items-center justify-center p-12">
          <div className="shadow-2xl bg-white leading-[0] relative">
            <canvas ref={canvasRef} />
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
            <button onClick={() => handleZoom(-0.1)} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomOut size={20} /></button>
            <span className="text-white text-xs font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomIn size={20} /></button>
          </div>
        </div>

        {/* Right Sidebar - Properties & Filters */}
        <div className="w-72 bg-white border-l p-6 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">图像调整</h4>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Sun size={16} />
                    <span className="text-sm font-medium">亮度</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400">{brightness}</span>
                </div>
                <input 
                  type="range" min="-100" max="100" value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Contrast size={16} />
                    <span className="text-sm font-medium">对比度</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400">{contrast}</span>
                </div>
                <input 
                  type="range" min="-100" max="100" value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          </div>

          {activeObject && activeObject instanceof fabric.IText && (
            <div className="space-y-4 pt-8 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">文字编辑</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">颜色</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['#ffffff', '#000000', '#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d'].map(color => (
                      <button 
                        key={color}
                        onClick={() => {
                          activeObject.set('fill', color);
                          fabricRef.current?.renderAll();
                        }}
                        className="w-full aspect-square rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">字号</label>
                  <input 
                    type="range" min="10" max="200" value={activeObject.fontSize}
                    onChange={(e) => {
                      activeObject.set('fontSize', parseInt(e.target.value));
                      fabricRef.current?.renderAll();
                      setActiveObject({...activeObject});
                    }}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-gray-100">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-2">
              <div className="flex items-center gap-2 text-orange-600">
                <Sparkles size={16} />
                <span className="text-xs font-bold">AI 提示</span>
              </div>
              <p className="text-[10px] text-orange-700 leading-relaxed">
                使用"抠图"功能可以快速移除背景；使用"扩图"功能可以让 AI 智能补全画面周边环境。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

