
import React, { useState, useEffect } from 'react';
import { analyzeTicker } from './services/gemini';
import { PSXAnalysisResult, LoadingStep } from './types';
import AnalysisDisplay from './components/AnalysisDisplay';
import { PSX_TICKERS } from './constants';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PSXAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("Initializing Engine...");

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticker) return;

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
      const data = await analyzeTicker(ticker.toUpperCase());
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  const selectQuickTicker = (t: string) => {
    setTicker(t);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navigation / Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-2 rounded-lg">
              <i className="fas fa-bolt"></i>
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              PSX<span className="text-emerald-600">ALPHA</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <span className="hover:text-emerald-600 cursor-pointer">Live Feed</span>
            <span className="hover:text-emerald-600 cursor-pointer">Sector Map</span>
            <span className="hover:text-emerald-600 cursor-pointer">Documentation</span>
          </div>
        </div>
      </header>

      {/* Hero Section / Search */}
      <main className="max-w-5xl mx-auto px-4 pt-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            Institutional Grade <span className="text-emerald-600">Stock Analytics</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Deep fundamental analysis, valuation models, and political impact scoring for the Pakistan Stock Exchange.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Enter PSX Ticker (e.g. UBL, LUCK, ENGRO)..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-emerald-500 outline-none transition-all text-lg font-medium shadow-sm"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
              disabled={isAnalyzing || !ticker}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PSX_TICKERS.map(t => (
              <button
                key={t}
                onClick={() => selectQuickTicker(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  ticker === t 
                  ? "bg-emerald-600 text-white border-emerald-600" 
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-12 min-h-[400px]">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-microchip text-emerald-600 animate-pulse"></i>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800">{loadingStep}</h3>
                <p className="text-sm text-gray-500 italic">This usually takes 15-30 seconds depending on data volume...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-6 rounded-2xl flex items-start gap-4 animate-shake">
              <i className="fas fa-circle-exclamation text-2xl mt-1"></i>
              <div>
                <h4 className="font-bold mb-1">Analysis Failed</h4>
                <p className="text-sm">{error}</p>
                <button 
                  onClick={() => handleSearch()} 
                  className="mt-4 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {result && <AnalysisDisplay result={result} />}

          {!result && !isAnalyzing && !error && (
            <div className="text-center py-20 opacity-40">
              <i className="fas fa-chart-line text-6xl mb-4"></i>
              <p className="text-lg font-medium">Ready to analyze the next big opportunity in PSX.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-gray-400">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> KSE100 LIVE</span>
          <span>MARKET: OPEN</span>
        </div>
        <div>
          GENAI ENGINE v2.5.0 PRO
        </div>
      </footer>
    </div>
  );
};

export default App;
