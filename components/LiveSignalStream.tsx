'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Pause, Trash2, Cpu, ExternalLink, Activity, Terminal } from 'lucide-react';

interface StreamEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

export default function LiveSignalStream() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [signalCount, setSignalCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const es = new EventSource('/api/gate/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    const handleEvent = (type: string, e: MessageEvent) => {
      if (isPausedRef.current) return;
      try {
        const parsed = JSON.parse(e.data);
        const newEvent: StreamEvent = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type,
          data: parsed,
          timestamp: new Date().toLocaleTimeString(),
        };

        setEvents((prev) => [newEvent, ...prev].slice(0, 100));

        if (type === 'live_signals' && parsed?.signals) {
          setSignalCount((c) => c + parsed.signals.length);
        }
      } catch (err) {
        console.error('Error parsing stream event:', err);
      }
    };

    es.addEventListener('connected', (e) => handleEvent('connected', e));
    es.addEventListener('heartbeat', (e) => handleEvent('heartbeat', e));
    es.addEventListener('live_signals', (e) => handleEvent('live_signals', e));
    es.addEventListener('gate_telemetry', (e) => handleEvent('gate_telemetry', e));

    return () => {
      es.close();
    };
  }, []);

  const clearEvents = () => setEvents([]);

  return (
    <div className="space-y-6">
      {/* Stream Control Header */}
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Radio className={`w-4 h-4 ${isConnected ? 'animate-pulse' : ''}`} />
            </span>
            <h2 className="text-lg font-extrabold text-white tracking-wide">
              Real-Time Telegraph Signal Stream
            </h2>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}
            >
              {isConnected ? 'LIVE STREAM ACTIVE' : 'CONNECTING...'}
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-2xl">
            Continuous streaming consumption of live signals across Telegraph miners and daemon feeds. Demonstrates real-time verification without click-based polling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#121724] border border-[#232b3e] text-xs text-gray-300 font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Signals: {signalCount}</span>
          </div>
          <button
            onClick={() => setIsPaused((p) => !p)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
              isPaused
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1.5 rounded-lg bg-[#121724] hover:bg-[#1a2133] border border-[#232b3e] text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Live Stream Terminal Window */}
      <div className="bg-[#05070c] border border-[#181f2e] rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#0b0f19] border-b border-[#181f2e] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1 ml-2">
              <Terminal className="w-3 h-3 text-emerald-400" />
              sse://devnode.telegraphprotocol.com/daemon/stream
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-400">
            BUFFER: {events.length} / 100 EVENTS
          </div>
        </div>

        <div className="p-4 font-mono text-xs max-h-[600px] overflow-y-auto space-y-3">
          {events.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Radio className="w-8 h-8 text-emerald-500/40 animate-pulse mx-auto mb-2" />
              <p>Subscribing to live Telegraph signals...</p>
            </div>
          ) : (
            events.map((ev) => {
              if (ev.type === 'live_signals') {
                return (
                  <div key={ev.id} className="bg-[#0c101b] border border-cyan-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        [LIVE_SIGNAL_BURST] {ev.data?.signals?.length || 0} signals from Daemon feed
                      </span>
                      <span className="text-gray-400 text-[10px]">{ev.timestamp}</span>
                    </div>

                    <div className="space-y-1.5">
                      {(ev.data?.signals || []).map((s: any, idx: number) => (
                        <div key={idx} className="bg-[#070a12] p-2 rounded border border-[#161d2d] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              Subnet {s.subnetId || 'AUTO'}
                            </span>
                            <span className="text-white font-semibold text-xs truncate">
                              {s.subnetName || 'Telegraph Miner'}
                            </span>
                            <span className="text-gray-400 text-[10px] uppercase">
                              [{s.intent}]
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] shrink-0">
                            <span className="text-gray-400 font-mono">{s.durationMs}ms</span>
                            <span className="text-emerald-400 font-mono">${s.costUsd} USDC</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase">
                              {s.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (ev.type === 'gate_telemetry') {
                return (
                  <div key={ev.id} className="bg-[#0c101b] border border-purple-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-purple-400 font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        [GATE_TELEMETRY] Monitored Wallets & Active Runs
                      </span>
                      <span className="text-gray-400 text-[10px]">{ev.timestamp}</span>
                    </div>
                    <div className="text-gray-400 text-[11px] space-y-1">
                      <div>Quarantined Wallets (Compliance Halts): <span className="text-amber-400 font-bold">{ev.data?.quarantinedCount}</span></div>
                      <div>Recent Runs: {ev.data?.recentRuns?.length || 0} recorded in SQLite ledger</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={ev.id} className="bg-[#090d16] border border-[#161c2b] rounded-lg px-3 py-2 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400 uppercase font-bold">[{ev.type}]</span>
                    <span>Node heartbeat OK — Telegraph network responsive</span>
                  </span>
                  <span className="text-gray-400 text-[10px]">{ev.timestamp}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
