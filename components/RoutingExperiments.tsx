'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Cpu, CheckCircle2, AlertTriangle, XCircle, Zap, Shield } from 'lucide-react';

export default function RoutingExperiments() {
  const [sweepResult, setSweepResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any | null>(null);

  const runSweep = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/experiments/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confidenceSteps: [0.3, 0.5, 0.6, 0.75, 0.9],
          deadlineStepsMs: [1500, 3000, 5000, 8000],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSweepResult(data);
        if (data.grid && data.grid.length > 0) {
          setSelectedCell(data.grid[2] || data.grid[0]);
        }
      }
    } catch (err) {
      console.error('Sweep experiment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSweep();
  }, []);

  const confidenceLevels = [0.3, 0.5, 0.6, 0.75, 0.9];
  const deadlineLevels = [1500, 3000, 5000, 8000];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-extrabold text-white tracking-wide">
              Routing Experiments & Threshold Sweeper
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
              Probabilistic Routing
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-2xl">
            Sweep confidence thresholds and latency deadlines across all active Telegraph miners. Demonstrates how routing paths adapt, how qualification shifts, and where consensus flips.
          </p>
        </div>

        <button
          onClick={runSweep}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Sweeping Network...' : 'Run Parameter Sweep'}</span>
        </button>
      </div>

      {sweepResult && (
        <>
          {/* Operating Envelope Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-4">
              <div className="text-xs text-gray-400 font-mono mb-1">Active Miner Pool</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span>{sweepResult.totalActiveMiners} Live Miners</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Queried from devnode.telegraphprotocol.com</div>
            </div>

            <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-4">
              <div className="text-xs text-gray-400 font-mono mb-1">Current Configured Threshold</div>
              <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2 font-mono">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>GATE_MIN_CONFIDENCE = {sweepResult.currentConfigThreshold}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Fail-closed policy threshold</div>
            </div>

            <div className="bg-[#0b0f19] border border-cyan-500/20 bg-cyan-950/10 rounded-xl p-4">
              <div className="text-xs text-cyan-400 font-mono mb-1">Recommended Envelope</div>
              <div className="text-sm font-bold text-white">
                Confidence ≥ {sweepResult.optimalEnvelope?.recommendedConfidence} &bull; Deadline {sweepResult.optimalEnvelope?.recommendedDeadlineMs}ms
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Yields {sweepResult.optimalEnvelope?.expectedQualifiedMiners} qualified multi-intent miners
              </div>
            </div>
          </div>

          {/* 2D Sweep Heatmap Grid */}
          <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Confidence vs. Deadline Routing Matrix
              </h3>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" /> ALLOW (Consensus Met)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500" /> WAIT (Starvation / Tight Deadline)
                </span>
              </div>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-[#1f2638] text-xs text-gray-400 font-mono">
                    <th className="p-3 text-left">Confidence \ Deadline</th>
                    {deadlineLevels.map((dl) => (
                      <th key={dl} className="p-3 font-semibold text-gray-300">
                        {dl}ms
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {confidenceLevels.map((conf) => (
                    <tr key={conf} className="border-b border-[#141b2b]">
                      <td className="p-3 text-left font-mono text-xs font-bold text-gray-300">
                        Min Conf: {conf}
                      </td>
                      {deadlineLevels.map((dl) => {
                        const cell = sweepResult.grid?.find(
                          (c: any) => c.confidenceThreshold === conf && c.deadlineMs === dl
                        );
                        if (!cell) return <td key={dl} className="p-3">-</td>;

                        const isAllow = cell.projectedVerdict === 'ALLOW';
                        const isSelected =
                          selectedCell?.confidenceThreshold === conf &&
                          selectedCell?.deadlineMs === dl;

                        return (
                          <td key={dl} className="p-2">
                            <button
                              onClick={() => setSelectedCell(cell)}
                              className={`w-full p-3 rounded-lg border transition-all text-xs flex flex-col items-center gap-1 ${
                                isSelected ? 'ring-2 ring-emerald-400' : ''
                              } ${
                                isAllow
                                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              <div className="font-bold font-mono">
                                [{cell.projectedVerdict}]
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {cell.qualifiedMinersCount} miners
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Cell Inspector */}
            {selectedCell && (
              <div className="mt-6 pt-5 border-t border-[#181f2e] bg-[#070a12] p-4 rounded-lg border border-[#1b2336]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span>Cell Analysis: Confidence {selectedCell.confidenceThreshold} &bull; Deadline {selectedCell.deadlineMs}ms</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      selectedCell.projectedVerdict === 'ALLOW'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {selectedCell.projectedVerdict}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    Status: {selectedCell.routingStatus}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0b0f19] p-3 rounded border border-[#1b2336]">
                    <div className="text-gray-400 text-[11px]">Qualified Miners</div>
                    <div className="font-bold text-white font-mono text-sm">{selectedCell.qualifiedMinersCount} miners</div>
                  </div>
                  <div className="bg-[#0b0f19] p-3 rounded border border-[#1b2336]">
                    <div className="text-gray-400 text-[11px]">Security & Fraud Miners</div>
                    <div className="font-bold text-cyan-400 font-mono text-sm">{selectedCell.securityMinersCount} active</div>
                  </div>
                  <div className="bg-[#0b0f19] p-3 rounded border border-[#1b2336]">
                    <div className="text-gray-400 text-[11px]">Multi-Intent Coverage</div>
                    <div className={`font-bold font-mono text-sm ${selectedCell.multiIntentCoverage ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedCell.multiIntentCoverage ? 'Complete (Security + State)' : 'Partial'}
                    </div>
                  </div>
                </div>

                {selectedCell.topQualifiedMiners?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-gray-400 mb-1 font-mono">Top Qualified Miners on Route:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCell.topQualifiedMiners.map((m: any) => (
                        <span key={m.id} className="px-2 py-1 rounded bg-[#101524] border border-[#1f283d] text-[11px] text-gray-300 font-mono">
                          {m.name} ({m.intent})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
