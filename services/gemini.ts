
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { PSXAnalysisResult, Verdict, GroundingSource, AnalysisSection, TopPerformer } from "../types";

const API_KEY = process.env.API_KEY || '';

// Pricing Constants (Gemini Pro Approx)
const USD_TO_PKR = 280;
const INPUT_COST_PER_M = 1.25;
const OUTPUT_COST_PER_M = 5.00;

export const getTopPerformers = async (): Promise<{ list: TopPerformer[], costPKR: number }> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Identify the top 20 performing stocks on the Pakistan Stock Exchange (PSX) based on percentage gain over the last 7 trading days. Provide the list in JSON format with fields: ticker, name, and gain (percentage).",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            performers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ticker: { type: Type.STRING },
                  name: { type: Type.STRING },
                  gain: { type: Type.STRING }
                },
                required: ["ticker", "name", "gain"]
              }
            }
          }
        }
      },
    });

    const data = JSON.parse(response.text || "{}");
    const usage = response.usageMetadata;
    let costPKR = 0;
    
    if (usage) {
      const inputCostUSD = (usage.promptTokenCount / 1000000) * INPUT_COST_PER_M;
      const outputCostUSD = (usage.candidatesTokenCount / 1000000) * OUTPUT_COST_PER_M;
      costPKR = (inputCostUSD + outputCostUSD) * USD_TO_PKR;
    }

    return { 
      list: data.performers || [], 
      costPKR 
    };
  } catch (error) {
    console.error("Error fetching top performers:", error);
    return { list: [], costPKR: 0 };
  }
};

export const analyzeTicker = async (ticker: string): Promise<PSXAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `Perform a deep dive analysis of PSX stock ${ticker}. Include the requested JSON block with 3-year revenue and EPS trends. Focus on institutional-grade data for the 2024-2025 period.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const usage = response.usageMetadata;
    
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri || "",
      }));

    const result = parseGeminiResponse(text, ticker, sources);

    // Calculate PKR Cost
    if (usage) {
      const inputCostUSD = (usage.promptTokenCount / 1000000) * INPUT_COST_PER_M;
      const outputCostUSD = (usage.candidatesTokenCount / 1000000) * OUTPUT_COST_PER_M;
      const totalCostPKR = (inputCostUSD + outputCostUSD) * USD_TO_PKR;

      result.usage = {
        promptTokens: usage.promptTokenCount,
        candidatesTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
        estimatedCostPKR: totalCostPKR
      };
    }

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze ticker. Please check your connection or try a different stock.");
  }
};

const parseGeminiResponse = (text: string, ticker: string, sources: GroundingSource[]): PSXAnalysisResult => {
  const sections: AnalysisSection[] = [];
  let graphData30Days: number[] = [];
  let graphData12Months: number[] = [];
  let price2DaysAgo: number | undefined;
  let currentPrice: number | undefined;
  let keyFactors: string[] = [];
  let jsonVerdict: Verdict | null = null;
  let extraData: Partial<PSXAnalysisResult> = {};

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]);
      graphData30Days = data.historical_30_days || [];
      graphData12Months = data.historical_12_months || [];
      price2DaysAgo = data.price_2_days_ago;
      currentPrice = data.current_price;
      keyFactors = data.key_buy_factors || [];
      
      if (data.verdict) {
        const v = data.verdict.toUpperCase();
        if (v.includes("BUY")) jsonVerdict = Verdict.BUY;
        else if (v.includes("AVOID")) jsonVerdict = Verdict.AVOID;
        else if (v.includes("HOLD")) jsonVerdict = Verdict.HOLD;
      }

      extraData = {
        revenueTrend: data.revenue_trend,
        epsTrend: data.eps_trend,
        peRatio: data.pe_ratio,
        industryPe: data.industry_pe,
        riskLevel: data.risk_level,
        investorType: data.investor_type,
        marketCap: data.market_cap,
        dividendYield: data.dividend_yield,
        newsImpactScore: data.news_impact_score
      };
    } catch (e) {
      console.warn("JSON block parsing failed");
    }
  }

  const sectionHeaders = [
    { title: "Company Snapshot", icon: "fa-building", regex: /Company Snapshot/i },
    { title: "Fundamental & Valuation", icon: "fa-chart-line", regex: /Fundamental & Valuation/i },
    { title: "Cash Flow & Liquidity", icon: "fa-money-bill-transfer", regex: /Cash Flow/i },
    { title: "Industry Context", icon: "fa-industry", regex: /Industry & Market/i },
    { title: "News & Signals", icon: "fa-newspaper", regex: /News & Political/i },
    { title: "Future Outlook", icon: "fa-crystal-ball", regex: /Outlook/i }
  ];

  const lines = text.split('\n');
  let currentSection: AnalysisSection | null = null;

  lines.forEach(line => {
    if (line.trim().startsWith('{')) return;
    const cleanLine = line.replace(/^[#*•\s📊📈🏦🏭📰🔮✅⚠️]+/, '').trim();
    if (!cleanLine) return;
    const matchingHeader = sectionHeaders.find(h => h.regex.test(line));
    if (matchingHeader) {
      currentSection = { title: matchingHeader.title, icon: matchingHeader.icon, content: [] };
      sections.push(currentSection);
    } else if (currentSection && (line.startsWith('*') || line.startsWith('-') || line.startsWith('•'))) {
      currentSection.content.push(cleanLine);
    }
  });

  let verdict = jsonVerdict || Verdict.HOLD;
  if (!jsonVerdict) {
    const upper = text.toUpperCase();
    if (upper.includes("VERDICT: BUY") || upper.includes("FINAL VERDICT: BUY") || upper.includes("✅ BUY") || upper.includes("VERDICT:BUY")) verdict = Verdict.BUY;
    else if (upper.includes("VERDICT: AVOID") || upper.includes("FINAL VERDICT: AVOID") || upper.includes("✅ AVOID") || upper.includes("VERDICT:AVOID")) verdict = Verdict.AVOID;
  }

  return {
    ticker,
    companyName: ticker,
    verdict,
    sections,
    sources,
    rawResponse: text,
    keyFactors: keyFactors.length > 0 ? keyFactors : undefined,
    graphData30Days,
    graphData12Months,
    price2DaysAgo,
    currentPrice,
    ...extraData
  };
};
