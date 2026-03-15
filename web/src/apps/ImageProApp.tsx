/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  Tag, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Trash2,
  Plus,
  Key,
  Hash,
  Edit,
  Monitor,
  Smartphone,
  Layout,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeSellingPoints, generateAmazonImage, generateAPlusContent } from '../services/gemini';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageEditor } from '../components/ImageEditor';

type Step = 'input' | 'selling-points' | 'generate' | 'aplus';

interface SellingPoint {
  title: string;
  description: string;
  title_cn: string;
  description_cn: string;
}

interface APlusModule {
  type: string;
  title: string;
  description: string;
  imagePrompt: string;
  url?: string;
  status: 'idle' | 'generating' | 'done' | 'error';
}

interface GeneratedImage {
  id: number;
  url: string;
  type: string;
  prompt: string;
  status: 'idle' | 'generating' | 'done' | 'error';
}

export default function ImageProApp() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const checkKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        try {
          const has = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(has);
        } catch (e) {
          setHasKey(true);
        }
      } else {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error(e);
      }
    }
  };
  
  // Form State
  const [competitorLink, setCompetitorLink] = useState('');
  const [sku, setSku] = useState('');
  const [keywords, setKeywords] = useState('');
  const [userSellingPoints, setUserSellingPoints] = useState('');
  const [baseImages, setBaseImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5'>('1:1');

  // AI State
  const [aiSellingPoints, setAiSellingPoints] = useState<SellingPoint[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [aplusModules, setAplusModules] = useState<APlusModule[]>([]);
  const [isGeneratingAPlus, setIsGeneratingAPlus] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([
    { id: 1, url: '', type: '场景图 1 (室内使用)', prompt: 'Lifestyle image of the product being used in a modern home setting, cinematic lighting, realistic, preserving original product texture and materials.', status: 'idle' },
    { id: 2, url: '', type: '场景图 2 (户外/特定环境)', prompt: 'Lifestyle image of the product in its natural environment, high quality, professional photography, maintain original product material details.', status: 'idle' },
    { id: 3, url: '', type: '场景图 3 (多角度展示)', prompt: 'Professional product photography from a dynamic angle in a stylish environment, premium feel, high fidelity to original product texture.', status: 'idle' },
    { id: 4, url: '', type: '场景图 4 (细节氛围)', prompt: 'Atmospheric shot of the product highlighting its design and aesthetic in a real-world context, photorealistic materials.', status: 'idle' },
    { id: 5, url: '', type: '细节图 (特写)', prompt: 'Close-up macro shot of the product showing high-quality materials and texture, professional studio lighting, exact material reproduction.', status: 'idle' },
    { id: 6, url: '', type: '功能图 (信息图)', prompt: 'Infographic style image showing product features, clean layout, modern design, realistic product representation.', status: 'idle' },
    { id: 7, url: '', type: '尺寸图', prompt: 'Product image with dimension lines and text showing size, professional and clear, maintaining product visual integrity.', status: 'idle' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const regenFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBaseImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const startAnalysis = async () => {
    if (!keywords || !userSellingPoints) {
      alert('请填写核心关键词和卖点信息');
      return;
    }
    setLoading(true);
    try {
      const points = await analyzeSellingPoints(keywords, userSellingPoints, competitorLink, sku);
      setAiSellingPoints(points);
      setSelectedPoints([0, 1, 2, 3, 4]);
      setStep('generate');
      generateAllImages();
    } catch (error: any) {
      console.error(error);
      alert('处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const togglePoint = (index: number) => {
    if (selectedPoints.includes(index)) {
      setSelectedPoints(selectedPoints.filter(i => i !== index));
    } else if (selectedPoints.length < 5) {
      setSelectedPoints([...selectedPoints, index]);
    }
  };

  const startGeneration = async () => {
    setStep('generate');
    generateAllImages();
  };

  const generateAllImages = async () => {
    if (baseImages.length === 0) {
      alert('请至少上传一张产品图');
      return;
    }
    const updatedImages = [...images];
    
    for (let i = 0; i < updatedImages.length; i++) {
      updatedImages[i].status = 'generating';
      setImages([...updatedImages]);

      try {
        const selectedText = selectedPoints.map(idx => aiSellingPoints[idx]?.title ?? '').join(', ');
        const finalPrompt = `${updatedImages[i].prompt}. Product features: ${selectedText}. Keywords: ${keywords}`;
        
        const url = await generateAmazonImage(finalPrompt, aspectRatio, baseImages);
        if (url) {
          updatedImages[i].url = url;
          updatedImages[i].status = 'done';
        } else {
          updatedImages[i].status = 'error';
        }
      } catch (error: any) {
        console.error(error);
        updatedImages[i].status = 'error';
        if (error?.message?.includes('Requested entity was not found') || error?.message?.includes('permission denied')) {
          alert('API Key 无效或没有权限访问该模型，请重新选择。');
          setHasKey(false);
        }
      }
      setImages([...updatedImages]);
    }
    
    if (updatedImages.every(img => img.status === 'done')) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const regenerateImage = async (id: number, customDirection?: string, refImage?: string) => {
    const index = images.findIndex(img => img.id === id);
    if (index === -1) return;

    const updatedImages = [...images];
    updatedImages[index].status = 'generating';
    setImages([...updatedImages]);

    try {
      const selectedText = selectedPoints.map(idx => aiSellingPoints[idx]?.title ?? '').join(', ');
      const directionPrompt = customDirection ? ` Direction: ${customDirection}.` : '';
      const finalPrompt = `${updatedImages[index].prompt}.${directionPrompt} Product features: ${selectedText}. Keywords: ${keywords}`;
      
      const imagesToUse = refImage ? [refImage] : baseImages;
      const url = await generateAmazonImage(finalPrompt, aspectRatio, imagesToUse);
      
      if (url) {
        updatedImages[index].url = url;
        updatedImages[index].status = 'done';
      } else {
        updatedImages[index].status = 'error';
      }
    } catch (error: any) {
      updatedImages[index].status = 'error';
      if (error?.message?.includes('Requested entity was not found') || error?.message?.includes('permission denied')) {
        alert('API Key 无效或没有权限访问该模型，请重新选择。');
        setHasKey(false);
      }
    }
    setImages([...updatedImages]);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const folderName = `${sku || 'Product'}AI前台图`;
    const folder = zip.folder(folderName);
    if (!folder) return;

    const downloadPromises = images.map(async (img, index) => {
      if (img.url) {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const fileName = `${img.type.replace(/\s+/g, '_')}_${index + 1}.jpg`;
        folder.file(fileName, blob);
      }
    });

    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${folderName}.zip`);
  };

  const handleGenerateAPlus = async () => {
    setIsGeneratingAPlus(true);
    setStep('aplus');
    try {
      const selectedText = selectedPoints.map(idx => aiSellingPoints[idx]?.title ?? '');
      const modules = await generateAPlusContent(keywords, selectedText, sku);
      
      const initialModules = modules.map((m: any) => ({ ...m, status: 'generating' }));
      setAplusModules(initialModules);

      for (let i = 0; i < initialModules.length; i++) {
        try {
          const url = await generateAmazonImage(initialModules[i].imagePrompt, '1:1', baseImages);
          setAplusModules(prev => {
            const next = [...prev];
            next[i].url = url || '';
            next[i].status = url ? 'done' : 'error';
            return next;
          });
        } catch (e) {
          setAplusModules(prev => {
            const next = [...prev];
            next[i].status = 'error';
            return next;
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate A+ content:', error);
    } finally {
      setIsGeneratingAPlus(false);
    }
  };

  const handleSaveEditedImage = (newUrl: string) => {
    if (editingImageIndex === null) return;
    const updatedImages = [...images];
    updatedImages[editingImageIndex].url = newUrl;
    setImages(updatedImages);
    setEditingImageIndex(null);
  };

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (hasKey === false) {
    return (
      <div className="flex items-center justify-center py-32 px-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md w-full space-y-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-500">
            <Key size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">需要配置 API Key</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              为了生成高质量的亚马逊产品图，本应用使用了高级图像生成模型 (Gemini Flash Image)。这需要您提供自己的 Gemini API Key（需关联已启用计费的 Google Cloud 项目）。
            </p>
          </div>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noreferrer"
            className="text-orange-500 text-sm hover:underline block"
          >
            了解计费详情
          </a>
          <button 
            onClick={handleSelectKey} 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            选择 API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#1A1A1A]">
      {/* Sub-header: step indicator */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-4 text-sm text-gray-400">
          <span className={step === 'input' ? 'text-orange-600 font-semibold' : ''}>1. 输入信息</span>
          <ChevronRight size={14} />
          <span className={step === 'selling-points' ? 'text-orange-600 font-semibold' : ''}>2. 卖点确认</span>
          <ChevronRight size={14} />
          <span className={step === 'generate' ? 'text-orange-600 font-semibold' : ''}>3. 生成图片</span>
          <ChevronRight size={14} />
          <span className={step === 'aplus' ? 'text-orange-600 font-semibold' : ''}>4. A+ 页面</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">开始您的产品视觉之旅</h2>
                <p className="text-gray-500">提供基本信息，AI 将为您打造专业级的亚马逊前台图片</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Hash size={16} className="text-gray-400" />
                      SKU
                    </label>
                    <input 
                      type="text" 
                      placeholder="例如: CHAIR-001-BLK"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <LinkIcon size={16} className="text-gray-400" />
                      竞品链接 (可选)
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://amazon.com/..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      value={competitorLink}
                      onChange={(e) => setCompetitorLink(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" />
                      核心关键词
                    </label>
                    <input 
                      type="text" 
                      placeholder="例如: Ergonomic Office Chair"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">产品卖点 & 描述</label>
                  <textarea 
                    rows={4}
                    placeholder="描述您的产品优势，AI 将基于此提炼核心卖点..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none"
                    value={userSellingPoints}
                    onChange={(e) => setUserSellingPoints(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold">产品白底图 (可多选)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-orange-500 hover:bg-orange-50/50 transition-all cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageUpload} 
                    />
                    
                    {baseImages.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {baseImages.map((img, idx) => (
                          <div key={idx} className="relative group/img">
                            <img src={img} alt={`Preview ${idx}`} className="aspect-square object-cover rounded-lg shadow-sm" />
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setBaseImages(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 group-hover:border-orange-500 group-hover:text-orange-500 transition-all">
                          <Plus size={24} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                          <Upload className="text-orange-500" size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-700">点击或拖拽上传产品图</p>
                          <p className="text-sm text-gray-500">支持多张上传，AI 将自动识别产品特征</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={startAnalysis}
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                    一键生成 7 张前台图
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'selling-points' && (
            <motion.div 
              key="selling-points"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">确认核心卖点</h2>
                <p className="text-gray-500">请从以下 9 个 AI 提炼的卖点中选择最多 5 个</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiSellingPoints.map((point, idx) => (
                  <div 
                    key={idx}
                    onClick={() => togglePoint(idx)}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative group ${
                      selectedPoints.includes(idx) 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-100 bg-white hover:border-orange-200'
                    }`}
                  >
                    {selectedPoints.includes(idx) && (
                      <div className="absolute top-3 right-3 text-orange-500">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                    <h3 className="font-bold mb-1">{point.title_cn}</h3>
                    <p className="text-xs text-orange-600 font-medium mb-2 uppercase tracking-tight">{point.title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed mb-2">{point.description_cn}</p>
                    <p className="text-[10px] text-gray-400 leading-tight italic">{point.description}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-200 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <ImageIcon size={18} />
                    选择图片比例
                  </h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setAspectRatio('1:1')}
                      className={`flex-1 py-4 rounded-xl border-2 transition-all ${
                        aspectRatio === '1:1' ? 'border-orange-500 bg-orange-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="font-bold">1:1 (1000x1000)</div>
                      <div className="text-xs text-gray-500">亚马逊标准正方形</div>
                    </button>
                    <button 
                      onClick={() => setAspectRatio('4:5')}
                      className={`flex-1 py-4 rounded-xl border-2 transition-all ${
                        aspectRatio === '4:5' ? 'border-orange-500 bg-orange-50' : 'border-gray-100'
                      }`}
                    >
                      <div className="font-bold">4:5 (1600x2000)</div>
                      <div className="text-xs text-gray-500">移动端优化长方形</div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('input')}
                    className="flex-1 py-4 rounded-xl border border-gray-200 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    返回修改
                  </button>
                  <button 
                    onClick={startGeneration}
                    disabled={selectedPoints.length === 0}
                    className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    生成 7 张前台图片
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'generate' && (
            <motion.div 
              key="generate"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">生成您的视觉资产</h2>
                  <p className="text-gray-500">AI 正在为您生成符合亚马逊标准的 7 张图片</p>
                </div>
                <button 
                  onClick={downloadAll}
                  disabled={images.some(img => img.status === 'generating')}
                  className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  <Download size={18} />
                  一键下载全部 (JPG)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {images.map((img) => (
                  <div key={img.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                    <div className="aspect-square bg-gray-50 relative flex items-center justify-center overflow-hidden">
                      {img.status === 'generating' ? (
                        <div className="text-center space-y-4">
                          <Loader2 className="animate-spin text-orange-500 mx-auto" size={40} />
                          <p className="text-sm font-medium text-gray-400">正在生成 {img.type}...</p>
                        </div>
                      ) : img.url ? (
                        <img src={img.url} alt={img.type} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-gray-300">
                          <ImageIcon size={64} />
                        </div>
                      )}
                      
                      {img.status === 'done' && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 p-6">
                          <div className="w-full space-y-3">
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="输入重新生成方向 (如: 换成木质背景)"
                                className="w-full bg-white/90 backdrop-blur pl-3 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    regenerateImage(img.id, (e.target as HTMLInputElement).value);
                                  }
                                }}
                              />
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  regenFileInputRef.current?.click();
                                  (window as any).currentRegenId = img.id;
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                                title="上传参考图"
                              >
                                <ImageIcon size={18} />
                              </button>
                              <input 
                                type="file"
                                ref={regenFileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const id = (window as any).currentRegenId;
                                      const inputEl = e.target.parentElement?.querySelector('input[type="text"]') as HTMLInputElement;
                                      regenerateImage(id, inputEl?.value, reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                            <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => regenerateImage(img.id)}
                                className="bg-white text-black px-4 py-2 rounded-lg hover:scale-105 transition-transform flex items-center gap-2 font-bold text-sm"
                              >
                                <RefreshCw size={16} />
                                直接重试
                              </button>
                              <button 
                                onClick={() => {
                                  const index = images.findIndex(i => i.id === img.id);
                                  setEditingImageIndex(index);
                                }}
                                className="bg-white text-black px-4 py-2 rounded-lg hover:scale-105 transition-transform flex items-center gap-2 font-bold text-sm"
                              >
                                <Edit size={16} />
                                编辑
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Image {img.id}</span>
                        <h4 className="font-bold">{img.type}</h4>
                      </div>
                      {img.status === 'done' && (
                        <div className="bg-green-100 text-green-600 p-1 rounded-full">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8 gap-4">
                <button 
                  onClick={() => setStep('selling-points')}
                  className="text-gray-500 hover:text-black transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  返回修改卖点
                </button>
                <button 
                  onClick={handleGenerateAPlus}
                  className="bg-orange-100 text-orange-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-200 transition-all"
                >
                  <Layout size={18} />
                  生成高级 A+ 页面
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'aplus' && (
            <motion.div 
              key="aplus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 max-w-7xl mx-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">高级 A+ 页面策划</h2>
                  <p className="text-gray-500">同步生成网页版与手机版预览，符合亚马逊 Premium A+ 规范</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('generate')}
                    className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                  >
                    返回前台图
                  </button>
                  <button 
                    onClick={() => {
                      const zip = new JSZip();
                      const desktopFolder = zip.folder(`${sku || 'Product'}_A+网页版`);
                      const mobileFolder = zip.folder(`${sku || 'Product'}_A+手机版`);
                      
                      aplusModules.forEach((m, i) => {
                        if (m.url) {
                          const base64 = m.url.split(',')[1];
                          desktopFolder?.file(`module_${i+1}_desktop.jpg`, base64, { base64: true });
                          mobileFolder?.file(`module_${i+1}_mobile.jpg`, base64, { base64: true });
                        }
                      });
                      
                      zip.generateAsync({ type: 'blob' }).then(content => {
                        saveAs(content, `${sku || 'Product'}_A+全套资产.zip`);
                      });
                    }}
                    className="px-6 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download size={18} />
                    一键导出全套 A+ 资产
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Desktop View */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    <Monitor size={14} />
                    网页版预览 (1464px)
                  </div>
                  <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    {aplusModules.length === 0 ? (
                      <div className="p-20 text-center space-y-4">
                        <Loader2 className="animate-spin text-orange-500 mx-auto" size={40} />
                        <p className="text-gray-500 font-medium">正在策划 A+ 模块内容...</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {aplusModules.map((module, idx) => (
                          <div key={idx} className="relative group border-b border-gray-50 last:border-0">
                            <div className="relative bg-gray-100 flex items-center justify-center overflow-hidden aspect-[1464/600]">
                              {module.status === 'generating' ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin text-orange-500" size={24} />
                                  <span className="text-[10px] text-gray-400">正在生成视觉资产...</span>
                                </div>
                              ) : module.url ? (
                                <img src={module.url} alt={module.title} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="text-gray-300" size={48} />
                              )}
                              
                              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent flex items-center px-16">
                                <div className="max-w-lg text-white space-y-3">
                                  <h3 className="text-3xl font-bold leading-tight">{module.title}</h3>
                                  <p className="text-base text-white/90 leading-relaxed font-medium">{module.description}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile View */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    <Smartphone size={14} />
                    手机版预览 (600px)
                  </div>
                  <div className="bg-white shadow-xl rounded-[2.5rem] overflow-hidden border-[8px] border-gray-900 aspect-[9/19] flex flex-col">
                    <div className="h-6 bg-gray-900 flex items-center justify-center">
                      <div className="w-16 h-1 bg-gray-800 rounded-full" />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {aplusModules.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-12 text-center">
                          <Loader2 className="animate-spin text-orange-500" size={32} />
                        </div>
                      ) : (
                        <div className="space-y-0">
                          {aplusModules.map((module, idx) => (
                            <div key={idx} className="border-b border-gray-100 last:border-0">
                              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                {module.url ? (
                                  <img src={module.url} alt={module.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" size={32} /></div>
                                )}
                              </div>
                              <div className="p-5 space-y-2">
                                <h3 className="text-lg font-bold text-gray-900">{module.title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{module.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="h-6 bg-gray-900" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Editor Modal */}
      {editingImageIndex !== null && (
        <ImageEditor 
          imageUrl={images[editingImageIndex].url}
          onSave={handleSaveEditedImage}
          onClose={() => setEditingImageIndex(null)}
        />
      )}
    </div>
  );
}

