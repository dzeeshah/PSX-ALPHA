
import React, { useEffect, useRef } from 'react';
import { PSXAnalysisResult, Verdict } from '../types';
import * as docx from 'docx';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface AnalysisDisplayProps {
  result: PSXAnalysisResult;
}

const PriceChart: React.FC<{ data: number[]; label: string; color: string; height?: number }> = ({ data, label, color, height = 200 }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y.toFixed(2)} PKR`
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [data, label, color]);

  return (
    <div style={{ height }} className="w-full">
      <canvas ref={chartRef} />
    </div>
  );
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  const brandBlue = "#0A2A66";
  const brandGreen = "#1FBF75";

  const investmentAmount = 100000;
  let profitLoss = 0;
  let profitLossPercent = 0;
  let currentValue = 0;

  if (result.price2DaysAgo && result.currentPrice) {
    const sharesOwned = investmentAmount / result.price2DaysAgo;
    currentValue = sharesOwned * result.currentPrice;
    profitLoss = currentValue - investmentAmount;
    profitLossPercent = (profitLoss / investmentAmount) * 100;
  }

  const getVerdictStyles = (v: Verdict) => {
    switch (v) {
      case Verdict.BUY: return "bg-[#91e1cc] text-[#1c7a5f]";
      case Verdict.AVOID: return "bg-[#f8d7da] text-[#721c24]";
      default: return "bg-[#fff3cd] text-[#856404]";
    }
  };

  const generateChartImage = async (data: number[], label: string, color: string, showYAxis = true): Promise<Uint8Array | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{ 
          label, 
          data, 
          borderColor: color, 
          backgroundColor: color + '15', 
          fill: true, 
          tension: 0.4, 
          pointRadius: 3,
          borderWidth: 3
        }]
      },
      options: {
        responsive: false, 
        animation: false, 
        plugins: { 
          legend: { display: true, labels: { font: { size: 14, weight: 'bold' } } } 
        },
        scales: { 
          x: { display: false }, 
          y: { 
            display: showYAxis,
            ticks: { font: { size: 12 }, color: '#333' },
            grid: { color: '#eee' }
          } 
        }
      }
    });

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  };

  const handleDownloadDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, HeadingLevel, BorderStyle } = docx;

    // Generate chart images
    const trend30Img = await generateChartImage(result.graphData30Days, '30-Day Pricing Trend (PKR)', brandGreen);
    const trend12Img = await generateChartImage(result.graphData12Months, '12-Month Price Fluctuation (PKR)', brandBlue);
    const revenueImg = result.revenueTrend ? await generateChartImage(result.revenueTrend, 'Annual Revenue (PKR)', brandBlue) : null;
    const epsImg = result.epsTrend ? await generateChartImage(result.epsTrend, 'Annual EPS (PKR)', brandGreen) : null;

    const doc = new Document({
      sections: [{
        children: [
          // Branding Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000, after: 400 },
            children: [
              new TextRun({ text: "PSX", bold: true, size: 72, color: "0A2A66" }),
              new TextRun({ text: "ALPHA", bold: true, size: 72, color: "1FBF75" }),
            ],
          }),
          new Paragraph({ 
            alignment: AlignmentType.CENTER, 
            spacing: { after: 200 },
            children: [new TextRun({ text: "Equity Analysis Research Report", size: 36, bold: true, color: "333333" })] 
          }),
          new Paragraph({ 
            alignment: AlignmentType.CENTER, 
            spacing: { after: 800 },
            children: [new TextRun({ text: `Ticker: ${result.ticker} | Generated: ${new Date().toLocaleDateString()}`, size: 24, color: "666666" })] 
          }),

          // 1. Executive Summary
          new Paragraph({ text: "1. Executive Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "FINAL VERDICT: ", bold: true }),
              new TextRun({ 
                text: result.verdict.toUpperCase(), 
                bold: true, 
                color: result.verdict === Verdict.BUY ? "1FBF75" : (result.verdict === Verdict.AVOID ? "FF0000" : "D97706")
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "Estimated Analysis Cost: ", bold: true }), new TextRun({ text: `PKR ${result.usage?.estimatedCostPKR.toFixed(4) || "0.00"}` })] }),
          new Paragraph({ children: [new TextRun({ text: "News Impact Score: ", bold: true }), new TextRun({ text: `${result.newsImpactScore || 0}%` })] }),
          new Paragraph({ children: [new TextRun({ text: "Risk Level: ", bold: true }), new TextRun({ text: result.riskLevel || "N/A" })] }),

          // 2. Performance Simulation
          new Paragraph({ text: "2. Investment Simulation (100,000 PKR Capital)", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Metric")] }), new TableCell({ children: [new Paragraph("Value")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Entry Price (2 Days Ago)")] }), new TableCell({ children: [new Paragraph(`${result.price2DaysAgo?.toFixed(2) || 'N/A'} PKR`)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Current Exit Price")] }), new TableCell({ children: [new Paragraph(`${result.currentPrice?.toFixed(2) || 'N/A'} PKR`)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Net Profit / Loss")] }), new TableCell({ children: [new Paragraph(`${profitLoss.toLocaleString()} PKR (${profitLossPercent.toFixed(2)}%)`)] })] }),
            ]
          }),

          // 3. Market Snapshot
          new Paragraph({ text: "3. Market Snapshot Metrics", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Market Capitalization")] }), new TableCell({ children: [new Paragraph(result.marketCap || "N/A")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("P/E Ratio")] }), new TableCell({ children: [new Paragraph(result.peRatio?.toString() || "N/A")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Industry P/E Median")] }), new TableCell({ children: [new Paragraph(result.industryPe?.toString() || "N/A")] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Dividend Yield")] }), new TableCell({ children: [new Paragraph(result.dividendYield || "N/A")] })] }),
            ]
          }),

          // 4. Key Factors
          ...(result.keyFactors ? [
            new Paragraph({ text: "4. Primary Growth Drivers (Key Buy Factors)", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            ...result.keyFactors.map(f => new Paragraph({ text: `• ${f}`, spacing: { after: 50 } }))
          ] : []),

          // 5. Technical Charts
          new Paragraph({ text: "5. Technical Price Movement", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          ...(trend30Img ? [new Paragraph({ text: "30-Day Closing Prices", bold: true }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: trend30Img, transformation: { width: 500, height: 250 } })] })] : []),
          ...(trend12Img ? [new Paragraph({ text: "12-Month Price Cycle", bold: true, spacing: { before: 400 } }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: trend12Img, transformation: { width: 500, height: 250 } })] })] : []),

          // 6. Fundamental Performance
          new Paragraph({ text: "6. Fundamental Performance", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          ...(revenueImg ? [new Paragraph({ text: "Annual Revenue Trend", bold: true }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: revenueImg, transformation: { width: 500, height: 200 } })] })] : []),
          ...(epsImg ? [new Paragraph({ text: "Earnings Per Share (EPS)", bold: true, spacing: { before: 400 } }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: epsImg, transformation: { width: 500, height: 200 } })] })] : []),

          // 7. Detailed Analysis
          new Paragraph({ text: "7. Institutional-Grade Qualitative Analysis", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
          ...result.sections.map(section => ([
            new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
            ...section.content.map(p => new Paragraph({ text: `• ${p}`, spacing: { after: 50 } }))
          ])).flat(),

          // 8. Grounding Sources
          ...(result.sources.length > 0 ? [
            new Paragraph({ text: "8. Data Verification & Sources", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
            ...result.sources.map(s => new Paragraph({ text: `• ${s.title || 'Official Source'}: ${s.uri}`, spacing: { after: 50 } }))
          ] : []),

          // Legal Disclaimer
          new Paragraph({
            spacing: { before: 1000 },
            children: [
              new TextRun({ 
                text: "OFFICIAL DISCLOSURE: This report is a simulated analysis generated by the PSXALPHA Intelligence Engine. Stock market investments in Pakistan carry inherent risks. Historical performance data and AI-generated signals are estimates and do not guarantee future returns. PSXALPHA assumes no liability for trading decisions. Always verify data via the official PSX Data Portal and consult with a licensed financial advisor.", 
                italics: true, 
                color: "666666", 
                size: 16 
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PSXALPHA_Report_${result.ticker}_${new Date().toISOString().split('T')[0]}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const newsImpactColor = (score: number) => {
    if (score > 30) return "text-emerald-500";
    if (score < -30) return "text-red-500";
    return "text-yellow-500";
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Redesigned Institutional Header */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#a7b4c4] rounded-full flex items-center justify-center text-2xl font-black text-[#566e8a] shadow-sm">
            {result.ticker.slice(0, 2)}
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-[#566e8a] uppercase">{result.ticker}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getVerdictStyles(result.verdict)}`}>
                Verdict: {result.verdict}
              </span>
              <p className="text-[9px] font-bold text-[#b0bec5] uppercase tracking-widest">Institutional AI Core v2.5</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
            <div className="text-[9px] font-black text-[#b0bec5] uppercase tracking-widest mb-0.5">Price Signal</div>
            <div className="text-4xl font-black text-[#566e8a]">{result.currentPrice?.toFixed(2)} <span className="text-sm font-medium text-gray-400">PKR</span></div>
        </div>

        <button 
          onClick={handleDownloadDocx}
          className="bg-[#8e9aaf] hover:bg-[#7a869a] text-white px-6 py-4 rounded-xl font-bold text-[11px] tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 uppercase"
        >
          <i className="fas fa-file-word text-base"></i>
          Download Docx Report
        </button>
      </div>

      {/* Institutional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Market Cap", val: result.marketCap },
          { label: "Risk Profile", val: result.riskLevel },
          { label: "News Sentiment", val: `${result.newsImpactScore}%`, color: "text-[#4db6ac]" },
          { label: "Div. Yield", val: result.dividendYield }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-50 shadow-sm">
            <p className="text-[9px] font-black text-[#b0bec5] uppercase tracking-widest mb-2">{item.label}</p>
            <p className={`text-xl font-black ${item.color || 'text-[#566e8a]'}`}>{item.val || '---'}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white/50 rounded-[2.5rem] p-1 shadow-sm border border-white">
        <div className="bg-white rounded-[2.3rem] p-8 space-y-10">
          
          {/* API Cost Metric */}
          {result.usage && (
            <div className="bg-gray-50/80 p-6 rounded-2xl border border-dashed border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <i className="fas fa-microchip"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engine Data Consumed</p>
                  <p className="text-sm font-bold text-gray-700">{result.usage.totalTokens.toLocaleString()} Total Tokens</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Estimated Analysis Cost</p>
                <div className="text-2xl font-black text-emerald-700">PKR {result.usage.estimatedCostPKR.toFixed(4)}</div>
              </div>
            </div>
          )}

          {/* Key Buy Factors */}
          {result.keyFactors && (
            <div className="bg-[#f2fcf9] p-8 rounded-3xl border border-[#e0f2f1] relative">
              <h3 className="text-[#1c7a5f] font-black mb-8 flex items-center gap-3 text-sm tracking-widest uppercase">
                <i className="fas fa-star text-[#80cbc4]"></i> Key Buy Factors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                {result.keyFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#80cbc4] flex items-center justify-center mt-0.5 flex-shrink-0">
                      <i className="fas fa-check text-[10px] text-white"></i>
                    </div>
                    <span className="text-sm font-semibold text-[#1c7a5f] leading-relaxed">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Simulation Section */}
          {result.price2DaysAgo && result.currentPrice && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 relative group overflow-hidden">
              <div className="absolute -top-10 -right-10 text-gray-50 group-hover:text-emerald-50/50 transition-colors pointer-events-none">
                <i className="fas fa-coins text-[12rem]"></i>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-8 tracking-tight">2-Day Performance Simulation <span className="text-emerald-500">(100k PKR)</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Simulated Entry</p>
                  <p className="text-3xl font-black">100,000 <span className="text-xs font-medium text-gray-400">PKR</span></p>
                  <p className="text-[11px] font-bold text-gray-400">At {result.price2DaysAgo.toFixed(2)} PKR / Share</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Market Value Today</p>
                  <p className="text-3xl font-black">{currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-medium text-gray-400">PKR</span></p>
                  <p className="text-[11px] font-bold text-gray-400">At {result.currentPrice.toFixed(2)} PKR / Share</p>
                </div>
                <div className={`p-6 rounded-3xl border ${profitLoss >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                  <p className="text-[10px] uppercase font-black mb-1 opacity-70 tracking-widest">P&L Result</p>
                  <p className="text-4xl font-black">{profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-sm font-black mt-1">({profitLossPercent.toFixed(2)}%)</p>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50/30 p-8 rounded-[2rem] border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-gray-800 tracking-tight">30-Day Trend</h3>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100/50 px-2 py-1 rounded-full uppercase tracking-tighter">Pricing in PKR</span>
               </div>
               <PriceChart data={result.graphData30Days} label="Price" color="#10b981" />
            </div>
            <div className="bg-gray-50/30 p-8 rounded-[2rem] border border-gray-100">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-gray-800 tracking-tight">12-Month Fluctuation</h3>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-100/50 px-2 py-1 rounded-full uppercase tracking-tighter">Pricing in PKR</span>
               </div>
               <PriceChart data={result.graphData12Months} label="Price" color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {result.sections.map((section, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#566e8a]">
                <i className={`fas ${section.icon} text-lg`}></i>
              </div>
              <h3 className="font-black text-gray-800 leading-none">{section.title}</h3>
            </div>
            <ul className="space-y-4">
              {section.content.map((point, pIdx) => {
                const parts = point.split(/(\*\*.*?\*\*)/g);
                return (
                  <li key={pIdx} className="text-[13px] text-gray-600 flex gap-3 leading-relaxed">
                    <span className="text-emerald-500 font-black">•</span>
                    <span>
                      {parts.map((part, i) => part.startsWith('**') ? <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong> : part)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisDisplay;
