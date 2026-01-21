
export enum Verdict {
  BUY = 'Buy',
  HOLD = 'Hold',
  AVOID = 'Avoid',
  UNKNOWN = 'Unknown'
}

export interface GroundingSource {
  title?: string;
  uri: string;
}

export interface AnalysisSection {
  title: string;
  icon: string;
  content: string[];
}

export interface TopPerformer {
  ticker: string;
  name: string;
  gain: string;
}

export interface PSXAnalysisResult {
  ticker: string;
  companyName: string;
  verdict: Verdict;
  sections: AnalysisSection[];
  sources: GroundingSource[];
  rawResponse: string;
  keyFactors?: string[];
  graphData30Days: number[];
  graphData12Months: number[];
  price2DaysAgo?: number;
  currentPrice?: number;
  // Professional Report Data
  revenueTrend?: number[];
  epsTrend?: number[];
  roeTrend?: number[];
  peRatio?: number;
  industryPe?: number;
  riskLevel?: string;
  investorType?: string;
  marketCap?: string;
  dividendYield?: string;
  newsImpactScore?: number;
  // Usage Data
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    estimatedCostPKR: number;
  };
}

export interface LoadingStep {
  message: string;
  isComplete: boolean;
}
