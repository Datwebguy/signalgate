'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Activity, CheckCircle2, RefreshCw } from 'lucide-react';
import type { FlywheelStats } from '@/lib/telegraph/types';

export default function FlywheelBanner() {
  const [stats, setStats] = useState<FlywheelStats | null>(null);
  const [isPumping, setIsPumping] = useState(false);
  const [lastBatchMsg, setLastBatchMsg] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/flywheel');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load flywheel stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const triggerBatch = async (count = 5) => {
    setIsPumping(true);
    setLastBatchMsg(null);
    try {
      const res = await fetch('/api/flywheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLastBatchMsg(`Dispatched ${data.batchDispatched} real asks to live Telegraph miners.`);
        setTimeout(() => setLastBatchMsg(null), 5000);
      }
    } catch (err: any) {
      setLastBatchMsg(`Error: ${err.message}`);
    } finally {
      setIsPumping(false);
    }
  };

  if (!stats) return null;

  const pct = Math.min(100, Math.round((stats.totalAsksDispatched / stats.targetFlywheelGoal) * 100));

  return (
    <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-5 mb-8 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Telegraph Network Demand Flywheel
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Live Miner Demand
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-xl">
            Track 3 apps drive verifiable demand to live miners. Every gate check and batch run sends real requests to live miners on the network. Target: $\ge 100$ requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerBatch(5)}
            disabled={isPumping}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPumping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Dispatch +5 Asks</span>
          </button>
          <button
            onClick={() => triggerBatch(10)}
            disabled={isPumping}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isPumping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>Dispatch +10 Asks</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Stats */}
      <div className="mt-4 pt-4 border-t border-[#181f2e] grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400 font-mono">Demand Flywheel Target ($\ge 100$ asks)</span>
            <span className="font-bold text-white font-mono">
              {stats.totalAsksDispatched} / {stats.targetFlywheelGoal} ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#151b29] overflow-hidden border border-[#232b3e]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs">
            <div className="text-gray-400 font-mono">Total Runs</div>
            <div className="text-sm font-bold text-white font-mono">{stats.totalGateRuns}</div>
          </div>
          <div className="text-xs">
            <div className="text-gray-400 font-mono">Miners Engaged</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{stats.activeMinersEngaged}</div>
          </div>
        </div>

        <div className="text-xs text-right">
          {lastBatchMsg ? (
            <span className="text-emerald-400 font-mono flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {lastBatchMsg}
            </span>
          ) : (
            <span className="text-gray-400 font-mono">Live traffic recorded in SQLite</span>
          )}
        </div>
      </div>
    </div>
  );
}
