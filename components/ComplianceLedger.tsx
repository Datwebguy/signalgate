'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, CheckCircle2, XCircle, Unlock, Lock, Clock, ExternalLink } from 'lucide-react';
import type { QuarantinedWallet, ExecutedAction } from '@/lib/telegraph/types';

export default function ComplianceLedger() {
  const [quarantined, setQuarantined] = useState<QuarantinedWallet[]>([]);
  const [actions, setActions] = useState<ExecutedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [releasingAddr, setReleasingAddr] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [qRes, aRes] = await Promise.all([
        fetch('/api/compliance/quarantine'),
        fetch('/api/compliance/actions'),
      ]);
      const qData = await qRes.json();
      const aData = await aRes.json();
      if (qData.success) setQuarantined(qData.quarantined || []);
      if (aData.success) setActions(aData.actions || []);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const releaseQuarantine = async (address: string) => {
    setReleasingAddr(address);
    try {
      const res = await fetch('/api/compliance/quarantine', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to release quarantine:', err);
    } finally {
      setReleasingAddr(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-extrabold text-white tracking-wide">
              Compliance Quarantine & Action Execution Ledger
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400">
              State-Changing Engine
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-2xl">
            After a live gate, BLOCK quarantines that address in this instance; ALLOW is approved-for-broadcast only. Signalgate never signs a tx. Rows from old hardcoded allowlists are not current policy.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-[#141b2b] hover:bg-[#1d263b] border border-[#222c42] text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Section 1: Quarantined Wallets (Compliance Halts) */}
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#181f2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Active Compliance Halts & Quarantines ({quarantined.length})
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Downstream broadcasts halted on BLOCK
          </span>
        </div>

        <div className="overflow-x-auto">
          {quarantined.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-mono text-xs">
              <ShieldCheck className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
              No active compliance quarantines. All audited addresses cleared or pending.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#181f2e] bg-[#070a12] text-gray-400 font-mono">
                  <th className="p-3.5">Target Address</th>
                  <th className="p-3.5">Halt Trigger / Evidence</th>
                  <th className="p-3.5">Risk Score</th>
                  <th className="p-3.5">Halted At</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141a27]">
                {quarantined.map((q) => (
                  <tr key={q.address} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>{q.address}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-300 max-w-md">
                      <div className="line-clamp-2">{q.reason}</div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                        {(q.riskScore * 100).toFixed(0)}% Risk
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                      {new Date(q.haltedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => releaseQuarantine(q.address)}
                        disabled={releasingAddr === q.address}
                        className="px-2.5 py-1 rounded bg-[#161f30] hover:bg-rose-500/20 border border-[#24314d] hover:border-rose-500/40 text-rose-300 text-[11px] font-bold font-mono transition-all flex items-center gap-1 ml-auto disabled:opacity-50"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>{releasingAddr === q.address ? 'Releasing...' : 'Release'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 2: Executed Actions Pipeline */}
      <div className="bg-[#0b0f19] border border-[#1f2638] rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#181f2e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Action Execution Pipeline ({actions.length})
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            Cryptographically verified state transitions
          </span>
        </div>

        <div className="overflow-x-auto">
          {actions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 font-mono text-xs">
              <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              No actions recorded yet. Actions will execute here once gate runs complete.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#181f2e] bg-[#070a12] text-gray-400 font-mono">
                  <th className="p-3.5">Action ID</th>
                  <th className="p-3.5">Target Address</th>
                  <th className="p-3.5">Proposed Action</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141a27]">
                {actions.map((act) => {
                  const isExecuted = act.status === 'EXECUTED';
                  return (
                    <tr key={act.actionId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-gray-400">
                        {act.actionId}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        {act.targetAddress}
                      </td>
                      <td className="p-3.5 text-gray-300">
                        {act.actionType}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            isExecuted
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                          }`}
                        >
                          {act.status === 'EXECUTED' ? 'APPROVED FOR BROADCAST' : 'COMPLIANCE HALT'}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                        {new Date(act.executedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
