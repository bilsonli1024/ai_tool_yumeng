import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Copy,
  Check
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ReactMarkdown from "react-markdown";
import { 
  analyzeCompetitors, 
  generateAmazonCopy, 
  type CompetitorAnalysis, 
  type ProductDetails, 
  type GeneratedCopy 
} from "../services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Step = "competitors" | "configuration" | "result";

export default function CopywriterApp() {
  const [step, setStep] = useState<Step>("competitors");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([""]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedSellingPoints, setSelectedSellingPoints] = useState<string[]>([]);
  const [selectedReviewInsights, setSelectedReviewInsights] = useState<string[]>([]);
  const [selectedImageInsights, setSelectedImageInsights] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<ProductDetails>({
    size: "",
    color: "",
    quantity: "",
    function: "",
    scenario: "",
    audience: "",
    material: "",
    sellingPoints: "",
    keywords: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedCopy | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleAddUrl = () => setCompetitorUrls([...competitorUrls, ""]);
  const handleRemoveUrl = (index: number) => {
    const newUrls = competitorUrls.filter((_, i) => i !== index);
    setCompetitorUrls(newUrls.length ? newUrls : [""]);
  };
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...competitorUrls];
    newUrls[index] = value;
    setCompetitorUrls(newUrls);
  };

  const handleSelectAllKeywords = () => {
    if (analysis) setSelectedKeywords(analysis.keywords.map(k => k.original));
  };
  const handleDeselectAllKeywords = () => setSelectedKeywords([]);
  const handleSelectAllSellingPoints = () => {
    if (analysis) setSelectedSellingPoints(analysis.sellingPoints.map(p => p.original));
  };
  const handleDeselectAllSellingPoints = () => setSelectedSellingPoints([]);

  const handleClearProductDetails = () => {
    setProductDetails({
      size: "", color: "", quantity: "", function: "", scenario: "",
      audience: "", material: "", sellingPoints: "", keywords: ""
    });
  };

  const handleAnalyze = async () => {
    const validUrls = competitorUrls.filter(url => url.trim() !== "");
    if (validUrls.length === 0) return;
    setIsAnalyzing(true);
    try {
      const data = await analyzeCompetitors(validUrls);
      setAnalysis(data);
      setSelectedKeywords(data.keywords.map(k => k.original));
      setSelectedSellingPoints(data.sellingPoints.map(p => p.original));
      setStep("configuration");
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
    );
  };
  const toggleSellingPoint = (point: string) => {
    setSelectedSellingPoints(prev => 
      prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
    );
  };
  const toggleReviewInsight = (insight: string) => {
    setSelectedReviewInsights(prev => 
      prev.includes(insight) ? prev.filter(i => i !== insight) : [...prev, insight]
    );
  };
  const toggleImageInsight = (insight: string) => {
    setSelectedImageInsights(prev => 
      prev.includes(insight) ? prev.filter(i => i !== insight) : [...prev, insight]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const data = await generateAmazonCopy(
        [...selectedKeywords, ...selectedReviewInsights, ...selectedImageInsights], 
        selectedSellingPoints, 
        productDetails
      );
      setResult(data);
      setStep("result");
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    if (!result) return;
    const allText = `
【产品标题】
${result.title}

【5点描述】
${result.bulletPoints.join("\n")}

【产品描述】
${result.description}

【搜索词】
${result.searchTerms}
    `.trim();
    copyToClipboard(allText, "all");
  };

  return (
    <div className="text-[#1A1A1A]">
      {/* Sub-header: step indicator */}
      <div className="bg-white border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 h-12 hidden md:flex items-center gap-4 text-sm font-medium text-black/40">
          <span className={cn(step === "competitors" && "text-orange-500")}>1. 竞品分析</span>
          <ArrowRight size={14} />
          <span className={cn(step === "configuration" && "text-orange-500")}>2. 文案配置</span>
          <ArrowRight size={14} />
          <span className={cn(step === "result" && "text-orange-500")}>3. 生成结果</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === "competitors" && (
            <motion.div
              key="competitors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight italic font-serif">分析竞品</h2>
                <p className="text-black/60">输入亚马逊竞品链接，我们将为您提取关键词和核心卖点。</p>
              </div>

              <div className="space-y-4">
                {competitorUrls.map((url, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="https://www.amazon.com/dp/..."
                        value={url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveUrl(index)}
                      className="p-3 text-black/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddUrl}
                  className="w-full py-3 border-2 border-dashed border-black/10 rounded-xl text-black/40 hover:text-orange-500 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={18} />
                  添加更多链接
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || competitorUrls.every(u => !u.trim())}
                className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-black/90 disabled:bg-black/20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    正在深度分析中...
                  </>
                ) : (
                  <>
                    开始分析竞品
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === "configuration" && analysis && (
            <motion.div
              key="configuration"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-7xl mx-auto space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Analysis Results */}
                <div className="space-y-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm h-fit">
                  <div className="flex items-center justify-between border-b border-black/5 pb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight italic font-serif">1. 竞品深度分析</h2>
                      <p className="text-sm text-black/40">基于 AI 对竞品文案、图片及 Review 的深度洞察。</p>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20 active:scale-95"
                    >
                      {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      重新分析
                    </button>
                  </div>

                  <div className="space-y-10">
                    {/* Keywords Section */}
                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">核心关键词 (50+)</h3>
                        <div className="flex gap-3">
                          <button onClick={handleSelectAllKeywords} className="text-[10px] font-bold uppercase tracking-wider text-orange-500">全选</button>
                          <button onClick={handleDeselectAllKeywords} className="text-[10px] font-bold uppercase tracking-wider text-black/30">清空</button>
                        </div>
                      </div>
                      
                      {(["core", "attribute", "extension"] as const).map(cat => {
                        const catKeywords = analysis.keywords.filter(k => k.category === cat);
                        if (catKeywords.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                cat === "core" ? "bg-red-500" : cat === "attribute" ? "bg-blue-500" : "bg-green-500"
                              )} />
                              <span className="text-[10px] font-bold uppercase tracking-tighter text-black/30">
                                {cat === "core" ? "核心词" : cat === "attribute" ? "属性词" : "拓展词"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {catKeywords.map((item, i) => (
                                <button
                                  key={i}
                                  onClick={() => toggleKeyword(item.original)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex flex-col items-center min-w-[60px]",
                                    selectedKeywords.includes(item.original)
                                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                      : "bg-white text-black/60 border-black/10 hover:border-orange-500"
                                  )}
                                >
                                  <span className="leading-tight">{item.original}</span>
                                  <span className={cn(
                                    "text-[9px] mt-0.5",
                                    selectedKeywords.includes(item.original) ? "text-white/70" : "text-black/30"
                                  )}>{item.translation}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </section>

                    {/* Selling Points Section */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">产品卖点总结</h3>
                        <button onClick={handleSelectAllSellingPoints} className="text-[10px] font-bold uppercase tracking-wider text-orange-500">全选</button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {analysis.sellingPoints.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => toggleSellingPoint(item.original)}
                            className={cn(
                              "w-full p-3 rounded-xl text-left transition-all border flex items-start gap-3 group",
                              selectedSellingPoints.includes(item.original)
                                ? "bg-orange-50/50 border-orange-200 text-orange-900"
                                : "bg-white border-black/10 text-black/60 hover:border-orange-500"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all",
                              selectedSellingPoints.includes(item.original)
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "border-black/20 group-hover:border-orange-500"
                            )}>
                              {selectedSellingPoints.includes(item.original) && <Check size={10} strokeWidth={3} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight">{item.original}</span>
                              <span className="text-[10px] opacity-60 mt-1 leading-relaxed">{item.translation}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Review Insights Section */}
                    <section className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">Review 消费者洞察</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {analysis.reviewInsights.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => toggleReviewInsight(item.original)}
                            className={cn(
                              "w-full p-3 rounded-xl text-left transition-all border flex items-start gap-3 group",
                              selectedReviewInsights.includes(item.original)
                                ? "bg-blue-50/50 border-blue-200 text-blue-900"
                                : "bg-white border-black/10 text-black/60 hover:border-blue-500"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all",
                              selectedReviewInsights.includes(item.original)
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-black/20 group-hover:border-blue-500"
                            )}>
                              {selectedReviewInsights.includes(item.original) && <Check size={10} strokeWidth={3} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight">{item.original}</span>
                              <span className="text-[10px] opacity-60 mt-1 leading-relaxed">{item.translation}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Image Insights Section */}
                    <section className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">图片场景与卖点</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {analysis.imageInsights.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => toggleImageInsight(item.original)}
                            className={cn(
                              "w-full p-3 rounded-xl text-left transition-all border flex items-start gap-3 group",
                              selectedImageInsights.includes(item.original)
                                ? "bg-green-50/50 border-green-200 text-green-900"
                                : "bg-white border-black/10 text-black/60 hover:border-green-500"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all",
                              selectedImageInsights.includes(item.original)
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-black/20 group-hover:border-green-500"
                            )}>
                              {selectedImageInsights.includes(item.original) && <Check size={10} strokeWidth={3} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight">{item.original}</span>
                              <span className="text-[10px] opacity-60 mt-1 leading-relaxed">{item.translation}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Right Column: Product Details Form */}
                <div className="space-y-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm h-fit">
                  <div className="flex items-center justify-between border-b border-black/5 pb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight italic font-serif">2. 您的产品信息</h2>
                      <p className="text-sm text-black/40">输入您产品的具体细节，我们将结合竞品分析为您生成文案。</p>
                    </div>
                    <button
                      onClick={handleClearProductDetails}
                      className="text-[10px] font-bold uppercase tracking-widest text-black/30 hover:text-red-500 transition-colors"
                    >
                      清空信息
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">尺寸</label>
                      <input
                        type="text"
                        placeholder="例如：10 x 5 x 2 英寸"
                        value={productDetails.size}
                        onChange={(e) => setProductDetails({ ...productDetails, size: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">颜色</label>
                      <input
                        type="text"
                        placeholder="例如：哑光黑"
                        value={productDetails.color}
                        onChange={(e) => setProductDetails({ ...productDetails, color: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">数量/规格</label>
                      <input
                        type="text"
                        placeholder="例如：2件装"
                        value={productDetails.quantity}
                        onChange={(e) => setProductDetails({ ...productDetails, quantity: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">材质</label>
                      <input
                        type="text"
                        placeholder="例如：航空级铝材"
                        value={productDetails.material}
                        onChange={(e) => setProductDetails({ ...productDetails, material: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">主要功能</label>
                      <input
                        type="text"
                        placeholder="描述产品的主要功能..."
                        value={productDetails.function}
                        onChange={(e) => setProductDetails({ ...productDetails, function: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">使用场景</label>
                      <input
                        type="text"
                        placeholder="例如：办公室、户外旅行"
                        value={productDetails.scenario}
                        onChange={(e) => setProductDetails({ ...productDetails, scenario: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">目标人群</label>
                      <input
                        type="text"
                        placeholder="例如：专业摄影师、学生"
                        value={productDetails.audience}
                        onChange={(e) => setProductDetails({ ...productDetails, audience: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">产品核心关键词 (重要)</label>
                      <textarea
                        rows={3}
                        placeholder="输入您希望埋入文案的核心关键词，用逗号分隔..."
                        value={productDetails.keywords}
                        onChange={(e) => setProductDetails({ ...productDetails, keywords: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40">核心卖点 (展示重点)</label>
                      <textarea
                        rows={4}
                        placeholder="输入您希望在文案中重点展示的卖点..."
                        value={productDetails.sellingPoints}
                        onChange={(e) => setProductDetails({ ...productDetails, sellingPoints: e.target.value })}
                        className="w-full px-4 py-3 bg-black/[0.02] border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 max-w-2xl mx-auto w-full">
                <button
                  onClick={() => setStep("competitors")}
                  className="flex-1 py-4 border border-black/10 rounded-xl font-bold hover:bg-black/5 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  返回
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-[2] py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-black/90 disabled:bg-black/20 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" />
                      正在生成文案...
                    </>
                  ) : (
                    <>
                      一键生成文案
                      <Sparkles size={20} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight italic font-serif">生成结果</h2>
                  <p className="text-black/60">为您精心打造的高转化亚马逊文案。</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyAll}
                    className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                  >
                    {copiedField === "all" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedField === "all" ? "已复制全部" : "复制全部"}
                  </button>
                  <button
                    onClick={() => setStep("configuration")}
                    className="px-4 py-2 border border-black/10 rounded-xl text-sm font-bold hover:bg-black/5 transition-all"
                  >
                    重新调整
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {/* Title */}
                <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">产品标题</h3>
                    <button 
                      onClick={() => copyToClipboard(result.title, "title")}
                      className="text-black/40 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedField === "title" ? <Check size={14} /> : <Copy size={14} />}
                      {copiedField === "title" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-lg font-bold leading-relaxed">{result.title}</p>
                  </div>
                </div>

                {/* Bullet Points */}
                <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">5点描述 (Bullet Points)</h3>
                    <button 
                      onClick={() => copyToClipboard(result.bulletPoints.join("\n"), "bullets")}
                      className="text-black/40 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedField === "bullets" ? <Check size={14} /> : <Copy size={14} />}
                      {copiedField === "bullets" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {result.bulletPoints.map((point, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-orange-500 font-bold">•</span>
                        <p className="text-black/80 leading-relaxed font-medium">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">产品描述 (Description)</h3>
                    <button 
                      onClick={() => copyToClipboard(result.description, "desc")}
                      className="text-black/40 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedField === "desc" ? <Check size={14} /> : <Copy size={14} />}
                      {copiedField === "desc" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <div className="p-6 prose prose-sm max-w-none prose-orange">
                    <ReactMarkdown>{result.description}</ReactMarkdown>
                  </div>
                </div>

                {/* Search Terms */}
                <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-black/40">搜索词 (Search Terms)</h3>
                    <button 
                      onClick={() => copyToClipboard(result.searchTerms, "st")}
                      className="text-black/40 hover:text-orange-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedField === "st" ? <Check size={14} /> : <Copy size={14} />}
                      {copiedField === "st" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-mono bg-black/[0.02] p-4 rounded-xl border border-black/5 text-black/60 break-all">
                      {result.searchTerms}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setStep("competitors");
                    setResult(null);
                    setAnalysis(null);
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-black/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10"
                >
                  开始新的生成
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

