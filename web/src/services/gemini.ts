/**
 * 合并后的 Gemini AI 服务
 * 包含图片生成工具（Amazon Image Pro）和文案生成工具（一键生成文案）的所有 AI 接口
 */
import { GoogleGenAI, Type } from "@google/genai";

// ─────────────────────────────────────────────
// 共用类型定义（文案生成工具）
// ─────────────────────────────────────────────

export interface Keyword {
  original: string;
  translation: string;
  category: "core" | "attribute" | "extension";
}

export interface CompetitorAnalysis {
  keywords: Keyword[];
  sellingPoints: { original: string; translation: string }[];
  reviewInsights: { original: string; translation: string }[];
  imageInsights: { original: string; translation: string }[];
}

export interface ProductDetails {
  size: string;
  color: string;
  quantity: string;
  function: string;
  scenario: string;
  audience: string;
  material: string;
  sellingPoints: string;
  keywords: string;
}

export interface GeneratedCopy {
  title: string;
  bulletPoints: string[];
  description: string;
  searchTerms: string;
}

// ─────────────────────────────────────────────
// 图片生成工具 — Amazon Image Pro
// ─────────────────────────────────────────────

/** 分析产品卖点，返回 9 条卖点（含中英文） */
export const analyzeSellingPoints = async (
  keywords: string,
  sellingPoints: string,
  competitorLink?: string,
  sku?: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const prompt = `
    你是一个资深的亚马逊运营专家。请根据以下信息，提炼出9个最具吸引力的产品卖点（Selling Points）。
    SKU: ${sku || "未提供"}
    核心关键词: ${keywords}
    用户提供的卖点: ${sellingPoints}
    ${competitorLink ? `竞品参考: ${competitorLink}` : ""}

    请为每个卖点提供：
    1. 英文标题 (title) 和 英文描述 (description) - 用于生成图片。描述中必须包含指令，要求生成模型"严格保留原产品的纹理、材质和细节特征"，确保产品看起来真实且与原图一致。
    2. 中文标题 (title_cn) 和 中文描述 (description_cn) - 用于用户在网页上快速浏览。

    请以JSON格式返回，包含一个数组，每个元素包含上述四个字段。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sellingPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                title_cn: { type: Type.STRING },
                description_cn: { type: Type.STRING },
              },
              required: ["title", "description", "title_cn", "description_cn"],
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text || "{}").sellingPoints;
};

/** 生成亚马逊产品图 */
export const generateAmazonImage = async (
  prompt: string,
  aspectRatio: "1:1" | "4:5",
  baseImages?: string[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const ratio = aspectRatio === "1:1" ? "1:1" : "3:4";

  const enhancedPrompt = `${prompt}. Photorealistic, high quality, maintain the original product's texture, material, and fine details exactly as in the reference images. Ensure the product appears consistent across all generated views. No distortion of product features.`;

  const imageParts =
    baseImages?.map((img) => ({
      inlineData: { data: img.split(",")[1], mimeType: "image/png" },
    })) || [];

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: {
      parts: [...imageParts, { text: enhancedPrompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: ratio,
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/** AI 图片编辑（抠图 / 扩图） */
export const editImage = async (
  baseImage: string,
  instruction: string,
  aspectRatio: "1:1" | "4:5" = "1:1"
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const ratio = aspectRatio === "1:1" ? "1:1" : "3:4";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: {
      parts: [
        { inlineData: { data: baseImage.split(",")[1], mimeType: "image/png" } },
        { text: instruction },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: ratio,
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

/** 生成高级 A+ 页面内容方案 */
export const generateAPlusContent = async (
  keywords: string,
  sellingPoints: string[],
  sku?: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const prompt = `
    你是一个亚马逊高级A+页面设计专家。请根据以下产品卖点，策划一套符合亚马逊"高级A+ (Premium A+)"要求的页面方案。
    SKU: ${sku || "未提供"}
    关键词: ${keywords}
    核心卖点: ${sellingPoints.join(", ")}

    要求：
    1. 展示逻辑清晰：从品牌心智到核心功能，再到场景体验和细节参数。
    2. 文字简洁有力：包含必要的关键词、卖点和属性词，符合亚马逊合规要求。
    3. 视觉引导：为每个模块提供高质量的图片生成指令。

    请策划以下5个模块的内容：
    1. 品牌故事/顶部大图 (Full Width Image): 品牌Slogan，建立第一印象。
    2. 核心功能展示 (Image with Text): 突出1-2个最核心的技术或功能优势。
    3. 场景化展示 (Lifestyle Image): 描述产品在实际生活中的使用状态，引发情感共鸣。
    4. 细节/材质展示 (Technical Specs): 放大展示产品的材质、工艺或核心组件。
    5. 底部对比表 (Comparison Table): 策划3个对比项，突出本产品的优越性。

    请以JSON格式返回，包含：
    - modules: 数组，每个模块包含 type, title, description, imagePrompt (用于生成该模块图片的提示词)。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modules: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ["type", "title", "description", "imagePrompt"],
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text || "{}").modules;
};

// ─────────────────────────────────────────────
// 文案生成工具 — 一键生成文案
// ─────────────────────────────────────────────

/** 分析竞品 URL，提取关键词、卖点、Review 洞察、图片卖点 */
export async function analyzeCompetitors(
  urls: string[]
): Promise<CompetitorAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const prompt = `
    Analyze the following Amazon competitor product pages. 
    Tasks:
    1. Extract at least 50 high-traffic keywords based on Amazon search logic. Categorize them into:
       - "core": Main product name and high-volume search terms.
       - "attribute": Words describing features, materials, sizes, colors.
       - "extension": Long-tail keywords, usage scenarios, and related search terms.
    2. Summarize the main product selling points (benefits and features) from listing copy.
    3. Analyze customer reviews to identify what consumers care about most (pain points, desired features, common praise).
    4. Analyze visual elements (implied from listing context) to identify key scenes and selling points shown in images.
    5. For each item, provide a precise Chinese translation.
    
    Return the result in JSON format with the following structure:
    {
      "keywords": [{"original": "keyword", "translation": "关键词", "category": "core|attribute|extension"}, ...],
      "sellingPoints": [{"original": "selling point", "translation": "卖点翻译"}, ...],
      "reviewInsights": [{"original": "insight", "translation": "洞察翻译"}, ...],
      "imageInsights": [{"original": "insight", "translation": "图片卖点翻译"}, ...]
    }
    
    URLs: ${urls.join(", ")}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          keywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ["core", "attribute", "extension"],
                },
              },
              required: ["original", "translation", "category"],
            },
          },
          sellingPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING },
              },
              required: ["original", "translation"],
            },
          },
          reviewInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING },
              },
              required: ["original", "translation"],
            },
          },
          imageInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING },
              },
              required: ["original", "translation"],
            },
          },
        },
        required: ["keywords", "sellingPoints", "reviewInsights", "imageInsights"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse analysis response", e);
    return {
      keywords: [],
      sellingPoints: [],
      reviewInsights: [],
      imageInsights: [],
    };
  }
}

/** 生成亚马逊高转化文案（标题、5点描述、产品描述、搜索词） */
export async function generateAmazonCopy(
  selectedKeywords: string[],
  selectedSellingPoints: string[],
  productDetails: ProductDetails
): Promise<GeneratedCopy> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const prompt = `
    You are an expert Amazon copywriter. Based on the following information, generate a high-converting Amazon product listing.
    
    Selected Competitor Keywords: ${selectedKeywords.join(", ")}
    Selected Competitor Selling Points: ${selectedSellingPoints.join(", ")}
    
    My Product Details:
    - Size: ${productDetails.size}
    - Color: ${productDetails.color}
    - Quantity: ${productDetails.quantity}
    - Function: ${productDetails.function}
    - Usage Scenario: ${productDetails.scenario}
    - Target Audience: ${productDetails.audience}
    - Material: ${productDetails.material}
    - Main Selling Points: ${productDetails.sellingPoints}
    - Target Keywords: ${productDetails.keywords}
    
    Requirements:
    1. Title: Catchy, keyword-rich (200 characters max), and follows Amazon best practices. Prioritize the most important keywords at the beginning.
    2. 5 Bullet Points: Each point should start with a bolded summary. Highlight benefits, use selected keywords naturally, and address customer pain points.
    3. Description: Detailed, persuasive, and formatted for readability using HTML-like tags (e.g., <p>, <b>, <br>) or Markdown. Focus on storytelling and emotional connection.
    4. Search Terms (ST): A list of relevant keywords for backend search, optimized for maximum traffic. Do not repeat keywords from the title or bullets. Limit to 249 bytes.
    
    Return the result in JSON format with the following structure:
    {
      "title": "Product Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
      "description": "Product Description",
      "searchTerms": "keyword1 keyword2 keyword3 ..."
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bulletPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 5,
            maxItems: 5,
          },
          description: { type: Type.STRING },
          searchTerms: { type: Type.STRING },
        },
        required: ["title", "bulletPoints", "description", "searchTerms"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse generation response", e);
    return {
      title: "",
      bulletPoints: [],
      description: "",
      searchTerms: "",
    };
  }
}

