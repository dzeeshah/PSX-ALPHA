
import React, { useState, useEffect } from 'react';
import { analyzeTicker, getTopPerformers } from './services/gemini';
import { PSXAnalysisResult, LoadingStep, TopPerformer } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';
import { PSX_TICKERS } from './constants';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PSXAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("Initializing Engine...");
  
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [isFetchingPerformers, setIsFetchingPerformers] = useState(false);
  const [performerCost, setPerformerCost] = useState<number | null>(null);

  useEffect(() => {
    const loadTopPerformers = async () => {
      setIsFetchingPerformers(true);
      const { list, costPKR } = await getTopPerformers();
      setTopPerformers(list);
      setPerformerCost(costPKR);
      setIsFetchingPerformers(false);
    };
    loadTopPerformers();
  }, []);

  const handleSearch = async (e?: React.FormEvent, manualTicker?: string) => {
    e?.preventDefault();
    const targetTicker = manualTicker || ticker;
    if (!targetTicker) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const steps = [
      "Connecting to PSX Data Streams...",
      "Fetching SECP Filings...",
      "Analyzing Cash Flow & ROE...",
      "Scanning 2024-2025 Political News...",
      "Generating Risk-Adjusted Verdict..."
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setLoadingStep(steps[currentStepIndex]);
        currentStepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    try {
      const data = await analyzeTicker(targetTicker.toUpperCase());
      setResult(data);
      setTicker(targetTicker.toUpperCase());
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  const selectQuickTicker = (t: string) => {
    setTicker(t);
    handleSearch(undefined, t);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Navigation / Header */}
      <header className="bg-transparent backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#009688] text-white p-2 rounded-xl shadow-sm">
              <i className="fas fa-bolt"></i>
            </div>
            <h1 className="text-xl font-black tracking-tight text-[#2c3e50]">
              PSX<span className="text-[#009688]">ALPHA</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-[#7f8c8d]">
            <span className="hover:text-[#009688] cursor-pointer transition-colors">Live Feed</span>
            <span className="hover:text-[#009688] cursor-pointer transition-colors">Sector Map</span>
            <span className="hover:text-[#009688] cursor-pointer transition-colors">Documentation</span>
          </div>
        </div>
      </header>

      {/* Hero Section / Search */}
      <main className="max-w-7xl mx-auto px-4 pt-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black text-[#2c3e50] mb-6 tracking-tighter">
            Institutional Grade <span className="text-[#009688]">Stock Analytics</span>
          </h2>
          <p className="text-[#7f8c8d] max-w-2xl mx-auto font-medium leading-relaxed">
            Deep fundamental analysis, valuation models, and political impact scoring for the Pakistan Stock Exchange.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-16">
          <form onSubmit={handleSearch} className="flex gap-4 p-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input
                type="text"
                placeholder="Enter PSX Ticker..."
                className="w-full pl-14 pr-6 py-5 rounded-2xl border-none outline-none transition-all text-xl font-bold text-[#2c3e50] placeholder:text-gray-300"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <button
              type="submit"
              className="bg-[#009688] hover:bg-[#00796b] text-white px-10 py-5 rounded-2xl font-black text-base transition-all shadow-lg active:scale-95 disabled:opacity-50 uppercase tracking-widest"
              disabled={isAnalyzing || !ticker}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </form>

          {/* Quick Suggestions Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {PSX_TICKERS.map(t => (
              <button
                key={t}
                onClick={() => selectQuickTicker(t)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${
                  ticker === t 
                  ? "bg-[#009688] text-white border-[#009688]" 
                  : "bg-white text-[#7f8c8d] border-gray-100 hover:border-[#009688] hover:text-[#009688]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Top Performers Section */}
        {!result && !isAnalyzing && (
          <div className="mb-20 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#e0f2f1] text-[#009688] rounded-xl flex items-center justify-center">
                  <i className="fas fa-arrow-trend-up"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#2c3e50] tracking-tight">Top Performers (Last 7 Days)</h3>
                  <p className="text-[10px] font-bold text-[#b0bec5] uppercase tracking-widest">Real-time market scanning active</p>
                </div>
              </div>
              {performerCost !== null && (
                <div className="text-right">
                  <p className="text-[9px] font-black text-[#b0bec5] uppercase tracking-widest">Scanning Cost</p>
                  <p className="text-sm font-black text-[#009688]">PKR {performerCost.toFixed(4)}</p>
                </div>
              )}
            </div>

            {isFetchingPerformers ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {topPerformers.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => selectQuickTicker(p.ticker)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#009688] transition-all group text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <i className="fas fa-chart-line text-4xl"></i>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-[#009688] bg-[#e0f2f1] px-2 py-0.5 rounded uppercase tracking-tighter">{p.ticker}</span>
                      <span className="text-[11px] font-black text-emerald-600">+{p.gain}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#2c3e50] truncate">{p.name}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-[#b0bec5] uppercase tracking-widest group-hover:text-[#009688] transition-colors">
                      Analyze Now <i className="fas fa-chevron-right text-[7px]"></i>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Area */}
        <div className="min-h-[400px]">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-fadeIn">
              <div className="relative">
                <div className="w-24 h-24 border-[3px] border-[#e0f2f1] border-t-[#009688] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-microchip text-2xl text-[#009688] animate-pulse"></i>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-[#2c3e50] tracking-tight mb-2">{loadingStep}</h3>
                <p className="text-xs text-[#7f8c8d] font-bold uppercase tracking-widest opacity-60">This usually takes 15-30 seconds depending on data volume...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-8 rounded-[2rem] flex items-start gap-6 animate-fadeIn max-w-2xl mx-auto">
              <div className="bg-red-100 p-4 rounded-2xl">
                <i className="fas fa-circle-exclamation text-2xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-black mb-1 tracking-tight">Analysis Failed</h4>
                <p className="text-sm font-medium opacity-80">{error}</p>
                <button 
                  onClick={() => handleSearch()} 
                  className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {result && <AnalysisDisplay result={result} />}

          {!result && !isAnalyzing && !error && (
            <div className="text-center py-20 opacity-10">
              <i className="fas fa-magnifying-glass-chart text-9xl mb-8"></i>
              <p className="text-xl font-black tracking-tight text-[#2c3e50]">Select a performer or search to begin deep analysis.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex justify-between items-center text-[10px] uppercase font-black tracking-[0.2em] text-[#b0bec5]">
        <div className="flex gap-8">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#4db6ac] rounded-full shadow-[0_0_8px_rgba(77,182,172,0.5)] animate-pulse"></span> KSE100 LIVE</span>
          <span>MARKET: OPEN</span>
        </div>
        <div>
          GENAI ENGINE V2.5.0 PRO
        </div>
      </footer>
    </div>
  );
};

export default App;
