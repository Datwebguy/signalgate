'use client';

import React, { useState } from 'react';
import { Radio } from 'lucide-react';

export default function RoutingExperiments() {
  const [probeAddress, setProbeAddress] = useState('');
  const [probeAction, setProbeAction] = useState('');
  const [minConfidence, setMinConfidence] = useState(0.6);
  const [deadlineMs, setDeadlineMs] = useState(8000);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  const runLiveProbe = async () => {
    if (!probeAddress.trim()) {
      setProbeError('Enter a wallet. This pays Telegraph Engine once at the confidence and deadline you set.');
      return;
    }
    setIsProbing(true);
    setProbeError(null);
    setProbeResult(null);
    try {
      const res = await fetch('/api/experiments/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: probeAddress.trim(),
          action: probeAction.trim() || 'Routing envelope probe',
          minConfidence,
          deadlineMs,
        }),
      });
      const data = await res.json();
      if (data.success) setProbeResult(data);
      else setProbeError(data.error || 'Live probe failed');
    } catch (err: any) {
      setProbeError(err.message || 'Live probe failed');
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 shadow-xl space-y-3">
        <h2 className="text-lg font-extrabold text-white tracking-wide">Routing envelope probe</h2>
        <p className="text-xs text-gray-400 max-w-3xl">
          Telegraph routes by intent, minimum confidence, and deadline — the app does not pick a miner.
          This page runs <strong>one live paid Engine ask</strong> at the envelope you choose so you can see who the network actually routed to. It is not a simulated heatmap.
        </p>
      </div>

      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={probeAddress}
            onChange={(e) => setProbeAddress(e.target.value)}
            placeholder="Wallet to probe (0x...)"
            className="bg-[#070a12] border border-[#1d2538] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-600"
          />
          <input
            type="text"
            value={probeAction}
            onChange={(e) => setProbeAction(e.target.value)}
            placeholder="Proposed action text"
            className="bg-[#070a12] border border-[#1d2538] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-gray-600"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="text-xs text-gray-300">
            Min confidence {minConfidence}
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 mt-1"
            />
          </label>
          <label className="text-xs text-gray-300">
            Deadline {deadlineMs}ms
            <input
              type="range"
              min="3000"
              max="20000"
              step="1000"
              value={deadlineMs}
              onChange={(e) => setDeadlineMs(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 mt-1"
            />
          </label>
        </div>
        <button
          onClick={runLiveProbe}
          disabled={isProbing}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
        >
          <Radio className={`w-3.5 h-3.5 ${isProbing ? 'animate-pulse' : ''}`} />
          {isProbing ? 'Paying Engine...' : 'Run one live Engine probe'}
        </button>
        {probeError && <div className="text-xs text-rose-400 font-mono">{probeError}</div>}
        {probeResult && (
          <div className="text-xs font-mono space-y-2">
            <div className="text-emerald-400 font-bold">
              [{probeResult.data?.verdict}] paid={String(probeResult.data?.paymentSettled)}
            </div>
            <div className="text-gray-400">{probeResult.data?.reason}</div>
            <div className="flex flex-wrap gap-2">
              {(probeResult.routedMiners || []).map((m: any) => (
                <span
                  key={`${m.minerId}-${m.intent}`}
                  className="px-2 py-1 rounded bg-[#101524] border border-[#1f283d] text-gray-300"
                >
                  {m.minerName} [{m.intent}] {m.status} paid={String(m.paid)} {m.latencyMs}ms
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
