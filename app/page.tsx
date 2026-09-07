'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Server,
  Cpu,
  Database,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Terminal,
  Layers,
  ArrowRight,
  Code2,
  Lock,
  Unlock,
  Zap,
  Check,
  Copy,
  ChevronRight,
  Activity,
  FileCode2,
  Eye,
  Sliders,
  Globe,
  Share2,
} from 'lucide-react';
import type { GateRunResult, WatchlistEntry, MinerReceipt } from '@/lib/telegraph/types';
import LiveSignalStream from '@/components/LiveSignalStream';
import RoutingExperiments from '@/components/RoutingExperiments';
import ComplianceLedger from '@/components/ComplianceLedger';

export default function Home() {
  // Navigation view
  const [activeView, setActiveView] = useState<
    'landing' | 'console' | 'catalog' | 'watchlist' | 'history' | 'stream' | 'experiments' | 'compliance'
  >('landing');

  // Gate execution state
  const [address, setAddress] = useState('');
  const [actionText, setActionText] = useState('');
  const [minConfidence, setMinConfidence] = useState<number>(0.6);
  const [deadlineMs, setDeadlineMs] = useState<number>(20000);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<GateRunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Network & Status state
  const [status, setStatus] = useState<any>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [newWatchAddress, setNewWatchAddress] = useState('');
  const [newWatchLabel, setNewWatchLabel] = useState('');
  const [newWatchAction, setNewWatchAction] = useState('Standard transaction proposal');
  const [isPollingWatchlist, setIsPollingWatchlist] = useState(false);

  // Run History & Audit Ledger state
  const [history, setHistory] = useState<GateRunResult[]>([]);
  const [quarantined, setQuarantined] = useState<any[]>([]);
  const [executedActions, setExecutedActions] = useState<any[]>([]);
  const [auditTab, setAuditTab] = useState<'all' | 'quarantined' | 'executed'>('all');
  const [releasingAddr, setReleasingAddr] = useState<string | null>(null);

  // Catalog state
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Expanded receipt payloads
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [copiedCodeTab, setCopiedCodeTab] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<'curl' | 'ts' | 'python'>('curl');
  const [appOrigin, setAppOrigin] = useState('http://localhost:3000');
  const [shareCopied, setShareCopied] = useState(false);

  const minerCount = catalog.length || status?.catalog?.activeMiners || 0;
  const navItems: { id: typeof activeView; label: string; icon: typeof Shield }[] = [
    { id: 'console', label: 'Firewall', icon: Shield },
    { id: 'catalog', label: 'Catalog', icon: Cpu },
    { id: 'watchlist', label: 'Watchlist', icon: Eye },
    { id: 'stream', label: 'Stream', icon: Radio },
    { id: 'experiments', label: 'Routing', icon: Sliders },
    { id: 'history', label: 'Audit', icon: Clock },
    { id: 'compliance', label: 'Halt Ledger', icon: Lock },
  ];

  const toggleExpandReceipt = (id: string) => {
    setExpandedReceipts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Load status and initial data
  const refreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      if (data.success) {
        setWatchlist(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    }
  };

  const [auditRefreshing, setAuditRefreshing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const loadAuditData = async () => {
    setAuditRefreshing(true);
    setAuditError(null);
    try {
      const [hRes, qRes, aRes] = await Promise.all([
        fetch('/api/gate/history', { cache: 'no-store' }),
        fetch('/api/compliance/quarantine', { cache: 'no-store' }),
        fetch('/api/compliance/actions', { cache: 'no-store' }),
      ]);
      const hData = await hRes.json();
      const qData = await qRes.json();
      const aData = await aRes.json();
      if (!hRes.ok || hData.success === false) {
        setAuditError(hData.error || 'Audit history request failed');
      }
      if (hData.success) setHistory(hData.data || []);
      if (qData.success) setQuarantined(qData.quarantined || []);
      if (aData.success) setExecutedActions(aData.actions || []);
    } catch (err: any) {
      setAuditError(err.message || 'Failed to fetch audit data');
    } finally {
      setAuditRefreshing(false);
    }
  };

  const releaseQuarantine = async (targetAddr: string) => {
    setReleasingAddr(targetAddr);
    try {
      const res = await fetch('/api/compliance/quarantine', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: targetAddr }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAuditData();
      }
    } catch (err) {
      console.error('Failed to release quarantine:', err);
    } finally {
      setReleasingAddr(null);
    }
  };

  const loadCatalog = async (forceRefresh = false) => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch(`/api/catalog${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.success) {
        setCatalog(data.miners);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    loadWatchlist();
    loadAuditData();
    loadCatalog();
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') as typeof activeView | null;
      const runId = params.get('run');
      if (view) setActiveView(view);
      if (runId) {
        fetch(`/api/gate/${encodeURIComponent(runId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setCurrentRun(data.data);
              setActiveView('console');
            }
          })
          .catch(() => {});
      }
    }
    const interval = setInterval(() => {
      refreshStatus();
      loadWatchlist();
      loadAuditData();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Run gate check
  const handleRunGate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address.trim()) {
      setErrorMsg('Please enter a target wallet address.');
      return;
    }

    setErrorMsg(null);
    setIsRunning(true);

    try {
      const res = await fetch('/api/gate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          action: actionText.trim(),
          minConfidence,
          deadlineMs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentRun(data.data);
        loadAuditData();
        loadWatchlist();
        if (typeof window !== 'undefined' && data.data?.runId) {
          const url = new URL(window.location.href);
          url.searchParams.set('run', data.data.runId);
          url.searchParams.set('view', 'console');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        setErrorMsg(data.error || 'Failed to execute gate run');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during gate execution');
    } finally {
      setIsRunning(false);
    }
  };

  // Add to watchlist
  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchAddress.trim()) return;

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newWatchAddress.trim(),
          label: newWatchLabel.trim() || 'Watched Wallet',
          action: newWatchAction.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewWatchAddress('');
        setNewWatchLabel('');
        loadWatchlist();
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err);
    }
  };

  // Remove from watchlist
  const handleRemoveWatchlist = async (id: number) => {
    try {
      await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
      loadWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  const handlePollWatchlist = async () => {
    setIsPollingWatchlist(true);
    try {
      await fetch('/api/watchlist/poll', { method: 'POST' });
      await loadWatchlist();
      await loadAuditData();
    } catch (err) {
      console.error('Failed to poll watchlist:', err);
    } finally {
      setIsPollingWatchlist(false);
    }
  };

  const copyShareLink = async () => {
    if (!currentRun?.runId || typeof window === 'undefined') return;
    const url = `${window.location.origin}/?run=${encodeURIComponent(currentRun.runId)}&view=console`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Filtered catalog
  const filteredCatalog = catalog.filter((m) => {
    const q = catalogSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.slug.toLowerCase().includes(q) ||
      (m.intents || []).some((i: string) => i.toLowerCase().includes(q))
    );
  });

  const copySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeTab(true);
    setTimeout(() => setCopiedCodeTab(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f3f4f6] flex flex-col selection:bg-emerald-500/20">
      {/* Top Protocol Header */}
      <header className="border-b border-[#181d28] bg-[#090c13]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveView('landing')}>
              <img
                src="/logo.png"
                alt="Signalgate"
                className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]"
              />
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base text-white">SIGNALGATE</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Protocol
                </span>
              </div>
            </div>

            {activeView !== 'landing' && (
              <>
                <div className="h-5 w-px bg-[#1f2638] hidden sm:block" />

                <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${item.id === 'stream' && active ? 'animate-pulse text-cyan-400' : ''}`} />
                        <span className="hidden lg:inline">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeView === 'landing' ? (
              <>
                <a
                  href="#architecture"
                  className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide text-gray-400 hover:text-white transition-colors hidden md:inline-block"
                >
                  Architecture
                </a>
                <a
                  href="#capabilities"
                  className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide text-gray-400 hover:text-white transition-colors hidden md:inline-block"
                >
                  Capabilities
                </a>
                <button
                  onClick={() => setActiveView('console')}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold tracking-wider uppercase transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Launch Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">{minerCount} Miners Online</span>
                  <span className="sm:hidden">{minerCount} Live</span>
                </div>
                <button
                  onClick={() => setActiveView('landing')}
                  className="px-3 py-1.5 rounded-lg border border-[#232b3e] bg-[#0c101a] hover:bg-[#141b29] text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  &larr; Overview
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* VIEW 1: FULL INCLINED LANDING PAGE */}
      {activeView === 'landing' && (
        <div className="flex-1 space-y-24 pb-20">
          {/* HERO SECTION */}
          <section className="relative overflow-hidden pt-16 sm:pt-24 pb-12 border-b border-[#141822] bg-radial-hero">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
              <div className="text-center max-w-3xl mx-auto space-y-6">
                {/* Live Protocol Status Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DECENTRALIZED INTELLIGENCE &bull; LIVE MINER CONSENSUS</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
                  Actions do not fire until <span className="text-gradient-emerald">live miners agree.</span>
                </h1>

                <p className="text-base sm:text-lg text-gray-300 font-sans leading-relaxed">
                  Autonomous pre-action risk gate for Web3 &amp; AI agents. Signalgate intercepts wallet actions,
                  dispatches parallel intelligence asks to live Telegraph miners, settles payments via x402, and returns
                  cryptographically proven verdicts before keys sign.
                </p>

                {/* Primary Hero CTAs */}
                <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
                  <button
                    onClick={() => setActiveView('console')}
                    className="px-6 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wider uppercase transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Launch Risk Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveView('catalog')}
                    className="px-6 py-3.5 rounded-lg bg-[#121620] hover:bg-[#1a202e] text-white border border-[#22293a] font-bold text-sm tracking-wider transition-colors flex items-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Inspect Live Miners</span>
                  </button>
                </div>

                {/* Live Stats Matrix */}
                <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left font-mono">
                  <div className="bg-[#0b0e15]/80 border border-[#1b2230] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider">Live Miners</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{minerCount}+ Active</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Discovered runtime</div>
                  </div>
                  <div className="bg-[#0b0e15]/80 border border-[#1b2230] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider">Consensus Latency</div>
                    <div className="text-2xl font-bold text-white mt-1">&lt; 1.2s</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Parallel dispatch</div>
                  </div>
                  <div className="bg-[#0b0e15]/80 border border-[#1b2230] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider">Security Policy</div>
                    <div className="text-2xl font-bold text-amber-400 mt-1">Fail-Closed</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Deterministic evaluation</div>
                  </div>
                  <div className="bg-[#0b0e15]/80 border border-[#1b2230] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider">Settlement</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">x402 / EIP-3009</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Base Sepolia USDC</div>
                  </div>
                </div>
              </div>

              {/* Interactive Visual Interception Architecture */}
              <div className="mt-16 max-w-4xl mx-auto rounded-xl border border-[#1e2535] bg-[#0c1018] p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-[#1a2130] text-xs font-mono text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-bold text-gray-200">signalgate-runtime-engine v1.0.0</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Live Protocol Interception
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5 font-mono text-xs">
                  <div className="bg-[#07090e] border border-[#181e2b] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Incoming Intent</span>
                    <div className="font-bold text-white text-sm">Agent Proposal</div>
                    <p className="text-gray-400 text-[11px] mt-2">
                      Target: <code>0x7a250d56...</code>
                    </p>
                    <p className="text-gray-400 text-[11px]">
                      Action: <code>Approve Unlimited DEX</code>
                    </p>
                  </div>

                  <div className="bg-[#07090e] border border-[#181e2b] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 block mb-1">Telegraph Miners</span>
                    <div className="font-bold text-white text-sm">Multi-Intent Parallel Ask</div>
                    <p className="text-gray-400 text-[11px] mt-2 flex items-center justify-between">
                      <span>Security &amp; Fraud Subnet</span> <span className="text-emerald-400">Fraud Check</span>
                    </p>
                    <p className="text-gray-400 text-[11px] flex items-center justify-between">
                      <span>On-Chain State Subnet</span> <span className="text-emerald-400">State / RPC</span>
                    </p>
                    <p className="text-gray-400 text-[11px] flex items-center justify-between">
                      <span>Telegraph Engine Router</span> <span className="text-emerald-400">Safety Consensus</span>
                    </p>
                  </div>

                  <div className="bg-[#07090e] border border-emerald-500/30 p-4 rounded-lg glow-brand">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 block mb-1">Gate Enforcement</span>
                    <div className="font-bold text-emerald-400 text-sm">Cryptographic Verdict</div>
                    <div className="mt-2 text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>ALLOW / WAIT / BLOCK</span>
                    </div>
                    <p className="text-gray-400 text-[10px] mt-2">
                      Receipts stored on SQLite &bull; Explorer hashes published
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: HOW IT WORKS (THE 3-STEP FIREWALL) */}
          <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold font-mono">
                Security Architecture
              </h2>
              <h3 className="text-3xl font-extrabold text-white">
                How Signalgate Protects Every Action
              </h3>
              <p className="text-sm text-gray-400 font-sans">
                Never sign blind. Three decoupled stages ensure zero transactions execute without paid miner consensus.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0d111a] border border-[#1a2130] rounded-xl p-6 relative hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mb-4 font-mono">
                  01
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Propose Action</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  A user or autonomous agent prepares an on-chain interaction: a large token transfer, contract approval,
                  cross-chain bridge, or contract call. Instead of broadcasting directly to an RPC, it routes to Signalgate.
                </p>
              </div>

              <div className="bg-[#0d111a] border border-[#1a2130] rounded-xl p-6 relative hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mb-4 font-mono">
                  02
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Decentralized Consensus</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Signalgate queries live Telegraph miners in parallel. Miners analyze bytecode vulnerabilities, fraud registries,
                  drainer signatures, and solvency. Each ask is settled via x402 USDC micropayments.
                </p>
              </div>

              <div className="bg-[#0d111a] border border-[#1a2130] rounded-xl p-6 relative hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mb-4 font-mono">
                  03
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Enforced Verdict &amp; Proof</h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  The fail-closed policy engine computes consensus. If clean, it emits <strong>ALLOW</strong> with receipts.
                  If danger is found, it immediately emits <strong>BLOCK</strong>. If payment or miners fail, it defaults to <strong>WAIT</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: CORE CAPABILITIES MATRIX */}
          <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold font-mono">
                Enterprise Hardening
              </h2>
              <h3 className="text-3xl font-extrabold text-white">
                Built for High-Stakes Agent Autonomy
              </h3>
              <p className="text-sm text-gray-400 font-sans">
                Engineered with enterprise rigor: dynamic miner discovery, decentralized consensus, and zero custody.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <Lock className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">Zero Key Custody</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Signalgate never requests or stores signing keys. It operates strictly as an advisory gatekeeper.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <ShieldAlert className="w-6 h-6 text-amber-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">Strict Fail-Closed Policy</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  If the network is unreachable, catalog lacks required intents, or payment fails, execution stops at WAIT.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <Zap className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">EIP-3009 x402 Micropayments</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Automatic cryptographic settlement with Base Sepolia USDC. Every gate run produces economic miner demand.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <Activity className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">24/7 Watchlist Poller</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Background worker constantly monitors your multisigs, hot wallets, and vault contracts on interval.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <Database className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">Append-Only Audit Ledger</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Every decision stores raw miner payloads, payment hashes, and latency metrics in a local SQLite ledger.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#0c1017] border border-[#1b2230] hover:border-gray-700 transition-colors">
                <ExternalLink className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1.5">Explorer Hash Grounding</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Direct links to Telegraph block explorer for every queried miner, eliminating hallucinated verdicts.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 4: DEVELOPER & AGENT INTEGRATION HUB */}
          <section id="developers" className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="bg-[#0a0d14] border border-[#1c2332] rounded-2xl p-6 sm:p-10">
              <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-[#181f2c]">
                <div>
                  <h3 className="text-xl font-bold text-white">Developer &amp; Agent Integration</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Connect Signalgate directly into LangChain, ElizaOS, Claude Desktop, or your backend pipeline.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveDevTab('curl')}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold ${activeDevTab === 'curl' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
                  >
                    REST cURL
                  </button>
                  <button
                    onClick={() => setActiveDevTab('ts')}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold ${activeDevTab === 'ts' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
                  >
                    TypeScript SDK
                  </button>
                  <button
                    onClick={() => setActiveDevTab('python')}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold ${activeDevTab === 'python' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
                  >
                    Python Agent
                  </button>
                </div>
              </div>

              <div className="mt-6 relative">
                <button
                  onClick={() => {
                    const code =
                      activeDevTab === 'curl'
                        ? `curl -X POST ${appOrigin}/api/gate/run \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "action": "Swap 10 ETH on Uniswap", "minConfidence": 0.6, "deadlineMs": 8000}'`
                        : activeDevTab === 'ts'
                        ? `const res = await fetch('${appOrigin}/api/gate/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    action: 'Swap 10 ETH on Uniswap',
    minConfidence: 0.6,
    deadlineMs: 8000,
  }),
});
const { data } = await res.json();
if (data.verdict !== 'ALLOW') {
  throw new Error(\`Gate blocked: \${data.reason}\`);
}`
                        : `import requests

res = requests.post("${appOrigin}/api/gate/run", json={
    "address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "action": "Swap 10 ETH on Uniswap",
    "minConfidence": 0.6,
    "deadlineMs": 8000
})
data = res.json()
if data.get("data", {}).get("verdict") != "ALLOW":
    raise RuntimeError(f"Gate blocked: {data.get('data', {}).get('reason')}")`;
                    copySnippet(code);
                  }}
                  className="absolute right-3 top-3 p-1.5 rounded bg-[#18202d] text-gray-400 hover:text-white transition-colors"
                  title="Copy snippet"
                >
                  {copiedCodeTab ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <pre className="bg-[#05070a] p-4 sm:p-6 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto border border-[#141a24]">
                  {activeDevTab === 'curl' && `curl -X POST ${appOrigin}/api/gate/run \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "action": "Swap 10 ETH on Uniswap", "minConfidence": 0.6, "deadlineMs": 8000}'`}
                  {activeDevTab === 'ts' && `const res = await fetch('${appOrigin}/api/gate/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    action: 'Swap 10 ETH on Uniswap',
    minConfidence: 0.6,
    deadlineMs: 8000,
  }),
});
const { data } = await res.json();
if (data.verdict !== 'ALLOW') {
  throw new Error(\`Gate blocked: \${data.reason}\`);
}`}
                  {activeDevTab === 'python' && `import requests

res = requests.post("${appOrigin}/api/gate/run", json={
    "address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    "action": "Swap 10 ETH on Uniswap",
    "minConfidence": 0.6,
    "deadlineMs": 8000
})
data = res.json()
if data.get("data", {}).get("verdict") != "ALLOW":
    raise RuntimeError(f"Gate blocked: {data.get('data', {}).get('reason')}")`}
                </pre>
              </div>
            </div>
          </section>

          {/* SECTION 5: READY TO SECURE CALLOUT */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h3 className="text-3xl font-extrabold text-white">
              Ready to protect your on-chain operations?
            </h3>
            <p className="text-sm text-gray-400 font-sans max-w-xl mx-auto">
              Start testing live addresses right now. Query the real Telegraph miner catalog and pay for ranked answers.
            </p>
            <div>
              <button
                onClick={() => setActiveView('console')}
                className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wider uppercase transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2 mx-auto cursor-pointer"
              >
                <span>Enter Risk Gate Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: OPERATIONAL WORKSPACE (CONSOLE, CATALOG, WATCHLIST, AUDIT) */}
      {activeView !== 'landing' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* TAB 1: GATE CONSOLE */}
          {activeView === 'console' && (
            <div className="space-y-6">
              {/* Introduction & Quick Context Card */}
              <div className="bg-[#0b0f19] border border-[#1f2638] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#181f2e]">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>DECENTRALIZED PRE-ACTION VERIFICATION</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Pre-Action Risk Firewall
                    </h1>
                    <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                      Evaluate any transaction proposal before signing. Signalgate declares live intents plus your confidence and deadline; Telegraph Engine routes to ranked miners. Signalgate does not pick miners by name.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="px-4 py-2 rounded-xl bg-[#121724] border border-[#232b3e] text-xs font-mono">
                      <div className="text-gray-400 text-[10px] uppercase">Policy Mode</div>
                      <div className="text-amber-400 font-bold">Fail-Closed</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-[#121724] border border-[#232b3e] text-xs font-mono">
                      <div className="text-gray-400 text-[10px] uppercase">Active Miners</div>
                      <div className="text-emerald-400 font-bold">{minerCount} Live</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 pt-4">
                  Empty address field on purpose. Telegraph miners score whatever wallet you type — Signalgate does not preload a sample oracle.
                </p>
              </div>

              {/* Action Proposal Form */}
              <div className="bg-[#0b0f19] border border-[#1f2638] rounded-2xl p-6 sm:p-8 shadow-2xl">
                <form onSubmit={handleRunGate} className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-300 font-bold mb-2">
                      Target Address or Contract
                    </label>
                    <input
                      type="text"
                      placeholder="Enter EVM address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-[#070a12] border border-[#1d2538] rounded-xl px-4 py-3.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all shadow-inner"
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      The counterparty wallet, decentralized exchange, vault, or smart contract to evaluate.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                        Proposed Transaction Action
                      </label>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Quick templates:</span>
                        <button
                          type="button"
                          onClick={() => setActionText('Transfer 1,000 USDC to counterparty')}
                          className="px-2 py-0.5 rounded bg-[#121724] border border-[#232b3e] text-gray-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                        >
                          Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionText('Sign unlimited ERC-20 token approval for Uniswap Router')}
                          className="px-2 py-0.5 rounded bg-[#121724] border border-[#232b3e] text-gray-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                        >
                          Approval
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionText('Execute swap 5 ETH for PEPE via DEX contract')}
                          className="px-2 py-0.5 rounded bg-[#121724] border border-[#232b3e] text-gray-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                        >
                          Swap
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionText('Bridge 10 ETH to Layer 2 Arbitrum Bridge')}
                          className="px-2 py-0.5 rounded bg-[#121724] border border-[#232b3e] text-gray-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-colors"
                        >
                          Bridge
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      placeholder="Describe proposed action (e.g. Transfer 50 ETH, Approve contract 0x...)"
                      className="w-full bg-[#070a12] border border-[#1d2538] rounded-xl px-4 py-3.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all shadow-inner"
                    />
                  </div>

                  {/* Advanced Routing & Intent Parameters Toggle */}
                  <div className="pt-2 border-t border-[#181f2e]">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOptions((o) => !o)}
                      className="text-xs font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{showAdvancedOptions ? 'Hide Advanced Consensus Parameters' : 'Advanced Consensus Parameters (Confidence Quorum & Deadline)'}</span>
                    </button>

                    {showAdvancedOptions && (
                      <div className="mt-4 p-4 bg-[#080c16] border border-[#1c2438] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-300 font-semibold">Min Confidence Quorum:</span>
                            <span className="text-emerald-400 font-bold font-mono">{(minConfidence * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="0.95"
                            step="0.05"
                            value={minConfidence}
                            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                            className="w-full accent-emerald-500"
                          />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Network rejects verdicts if miner consensus confidence falls below this floor.
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-300 font-semibold">Routing Deadline:</span>
                            <span className="text-cyan-400 font-bold font-mono">{deadlineMs}ms</span>
                          </div>
                          <input
                            type="range"
                            min="1000"
                            max="15000"
                            step="1000"
                            value={deadlineMs}
                            onChange={(e) => setDeadlineMs(parseInt(e.target.value, 10))}
                            className="w-full accent-cyan-500"
                          />
                          <p className="text-[11px] text-gray-500 mt-1">
                            Maximum latency allowed for live miner responses before fail-closed cutoff.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Actions will NOT execute until live Telegraph miners reach consensus.</span>
                    </div>
                    <button
                      type="submit"
                      disabled={isRunning}
                      className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/20 cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Evaluating with Live Miners...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Evaluate Safety with Live Miners
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Verdict Display & Dual Banners */}
              {currentRun && (
                <div className="space-y-4">
                  {/* Banner 1: Unpaid Path -> WAIT + 402 Payment Required */}
                  {!currentRun.paymentSettled &&
                    currentRun.verdict === 'WAIT' &&
                    currentRun.receipts.some((r) => r.status === 'PAYMENT_REQUIRED') && (
                    <div className="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-5 shadow-lg shadow-amber-500/5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xl font-bold tracking-wider text-amber-400">
                              WAIT
                            </span>
                            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              402 Payment Required
                            </span>
                            <span className="text-xs text-gray-400">
                              (Live network reached &bull; Unpaid ask stopped fail-closed)
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed font-mono">
                            {currentRun.reason}
                          </p>
                          <div className="mt-3 pt-3 border-t border-amber-500/20 text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              Target: <span className="text-gray-200 font-mono">{currentRun.targetAddress}</span>
                            </div>
                            <div>
                              Run ID: <span className="text-gray-200 font-mono">{currentRun.runId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Banner 2: Payment Settled / Real Evaluated Verdict */}
                  {(currentRun.paymentSettled || currentRun.verdict !== 'WAIT') && (
                    <div
                      className={`rounded-xl border-2 p-5 shadow-xl ${
                        currentRun.verdict === 'ALLOW'
                          ? 'border-emerald-500/60 bg-emerald-500/10 glow-allow'
                          : currentRun.verdict === 'BLOCK'
                          ? 'border-rose-500/60 bg-rose-500/10 glow-block'
                          : 'border-amber-500/60 bg-amber-500/10 glow-wait'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${
                            currentRun.verdict === 'ALLOW'
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : currentRun.verdict === 'BLOCK'
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          }`}
                        >
                          {currentRun.verdict === 'ALLOW' && <ShieldCheck className="w-6 h-6" />}
                          {currentRun.verdict === 'BLOCK' && <ShieldAlert className="w-6 h-6" />}
                          {currentRun.verdict === 'WAIT' && <AlertTriangle className="w-6 h-6" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span
                              className={`text-2xl font-black tracking-widest ${
                                currentRun.verdict === 'ALLOW'
                                  ? 'text-emerald-400'
                                  : currentRun.verdict === 'BLOCK'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {currentRun.verdict}
                            </span>
                            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-black/40 border border-gray-700 text-gray-300">
                              Confidence: {(currentRun.overallConfidence * 100).toFixed(1)}% (Floor: {currentRun.configuredConfidenceThreshold * 100}%)
                            </span>
                            <span className="text-xs text-gray-400">
                              Confirmed by {currentRun.minersQueriedCount} live Telegraph miners
                            </span>
                          </div>

                          <p className="text-xs text-gray-200 leading-relaxed font-mono">
                            {currentRun.reason}
                          </p>
                          <button
                            onClick={copyShareLink}
                            className="mt-3 px-2.5 py-1 rounded bg-black/30 border border-gray-700 text-[11px] text-gray-300 hover:text-white flex items-center gap-1.5"
                          >
                            <Share2 className="w-3 h-3" />
                            {shareCopied ? 'Copied share link' : 'Copy shareable run URL'}
                          </button>

                          <div className="mt-3 pt-3 border-t border-gray-800 text-[11px] text-gray-400 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              Target: <span className="text-gray-200 font-mono">{currentRun.targetAddress}</span>
                            </div>
                            <div>
                              Action: <span className="text-gray-200 font-mono">{currentRun.proposedActionText}</span>
                            </div>
                            <div>
                              Run ID: <span className="text-gray-200 font-mono">{currentRun.runId}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Act on the Signal: State-Changing Outcome Card */}
                  {currentRun.verdict === 'BLOCK' && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-rose-300 uppercase tracking-wider font-mono">
                            Automatic Compliance Halt Activated
                          </div>
                          <p className="text-gray-400 text-[11px]">
                            Target counterparty quarantined in SQLite compliance ledger. Downstream transaction execution locked.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveView('compliance')}
                        className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold font-mono text-xs shrink-0"
                      >
                        Inspect Quarantine &rarr;
                      </button>
                    </div>
                  )}

                  {currentRun.verdict === 'ALLOW' && (
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-emerald-300 uppercase tracking-wider font-mono">
                            Approved For Broadcast
                          </div>
                          <p className="text-gray-400 text-[11px]">
                            Target approved by miner consensus. Signalgate does not sign or broadcast. Downstream agents may proceed using this receipt.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveView('compliance')}
                        className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-xs shrink-0"
                      >
                        Inspect Action Ledger &rarr;
                      </button>
                    </div>
                  )}

                  {/* Miner Receipts Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Live Miner Proofs &amp; Receipts ({currentRun.receipts.length})
                      </h3>
                      <span className="text-[11px] text-gray-500 font-mono">
                        Real Telegraph Miners &bull; Cryptographic Receipts &bull; Explorer Grounded
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {currentRun.receipts.map((receipt, idx) => {
                        const isExpanded = expandedReceipts[`receipt-${idx}`];
                        return (
                          <div
                            key={idx}
                            className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-4 font-mono text-xs transition-colors hover:border-gray-700"
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white text-sm">{receipt.minerName}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                    {receipt.intent}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      receipt.status === 'SUCCESS'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : receipt.status === 'PAYMENT_REQUIRED'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}
                                  >
                                    {receipt.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-3">
                                  <span>Endpoint: <code className="text-gray-300">{receipt.endpoint}</code></span>
                                  <span>Latency: <code className="text-gray-300">{receipt.latencyMs}ms</code></span>
                                  <span>Price: <code className="text-gray-300">${receipt.priceUsdc} USDC</code></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={receipt.explorerMinerUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-[#161c28] hover:bg-[#202838] text-emerald-400 text-[11px] flex items-center gap-1 transition-colors border border-emerald-500/20"
                                >
                                  <span>Explorer</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  onClick={() => toggleExpandReceipt(`receipt-${idx}`)}
                                  className="p-1 rounded bg-[#161c28] hover:bg-[#202838] text-gray-400 hover:text-white"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-gray-800/80 text-[11px] flex flex-wrap items-center justify-between gap-2 text-gray-400">
                              <div>
                                Request / TX ID:{' '}
                                <span
                                  className={`font-mono ${
                                    receipt.explorerRequestId !== 'no explorer id'
                                      ? 'text-emerald-400 font-semibold'
                                      : 'text-gray-500 italic'
                                  }`}
                                >
                                  {receipt.explorerRequestId}
                                </span>
                              </div>
                              {receipt.error && (
                                <div className="text-rose-400 text-[11px] truncate max-w-md">
                                  {receipt.error}
                                </div>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-800">
                                <span className="text-[10px] uppercase text-gray-500 block mb-1">
                                  Raw Miner Response
                                </span>
                                <pre className="bg-[#05070a] p-3 rounded text-[11px] overflow-x-auto text-gray-300 border border-gray-900 max-h-64">
                                  {JSON.stringify(receipt.rawResponse, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE CATALOG BROWSER */}
          {activeView === 'catalog' && (
            <div className="space-y-6">
              <div className="bg-[#0b0f19] border border-[#1f2638] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{minerCount} ACTIVE MINERS REGISTERED</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Telegraph Miner Directory
                    </h1>
                    <p className="text-sm text-gray-400 max-w-2xl leading-relaxed mt-1">
                      The live decentralized network of intelligence providers. Signalgate automatically discovers, routes, and micropays these miners to inspect contract bytecode, fraud registries, and state risks.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search miners, intents..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="bg-[#070a12] border border-[#1d2538] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 w-64 shadow-inner"
                      />
                    </div>
                    <button
                      onClick={() => loadCatalog(true)}
                      disabled={isLoadingCatalog}
                      className="px-4 py-2.5 rounded-xl bg-[#121724] hover:bg-[#182030] border border-[#232b3e] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCatalog.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-4 font-mono text-xs flex flex-col justify-between hover:border-gray-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-white text-sm">{m.name}</h4>
                          <span className="text-[10px] text-gray-500">{m.slug} &bull; ID #{m.id}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {m.activationStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(m.intents || []).map((intent: string, i: number) => (
                          <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-300">
                            {intent}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                      <span>${m.priceUsdc} USDC</span>
                      <a
                        href={`https://explorer.telegraphprotocol.com/miners/${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WATCHLIST TABLE */}
          {activeView === 'watchlist' && (
            <div className="space-y-6">
              <div className="bg-[#0b0f19] border border-[#1f2638] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#181f2e]">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>CONTINUOUS BACKGROUND MONITORING</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Autonomous Watchlist
                    </h1>
                    <p className="text-sm text-gray-400 max-w-2xl leading-relaxed mt-1">
                      Protect critical multisigs, treasury vaults, and hot wallets 24/7. The background daemon regularly polls live Telegraph miners to detect newly identified vulnerabilities or blacklists.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePollWatchlist}
                      disabled={isPollingWatchlist || watchlist.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-bold text-emerald-300 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPollingWatchlist ? 'animate-spin' : ''}`} />
                      <span>Trigger Poll Now</span>
                    </button>
                  </div>
                </div>

                {/* Add Watchlist Form */}
                <div className="pt-6">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Add Address to Continuous Watchlist
                  </h3>
                  <form onSubmit={handleAddWatchlist} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Target address (0x...)"
                      value={newWatchAddress}
                      onChange={(e) => setNewWatchAddress(e.target.value)}
                      className="bg-[#070a12] border border-[#1d2538] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 shadow-inner sm:col-span-1"
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g. Treasury Multisig)"
                      value={newWatchLabel}
                      onChange={(e) => setNewWatchLabel(e.target.value)}
                      className="bg-[#070a12] border border-[#1d2538] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 shadow-inner sm:col-span-1"
                    />
                    <input
                      type="text"
                      placeholder="Action description"
                      value={newWatchAction}
                      onChange={(e) => setNewWatchAction(e.target.value)}
                      className="bg-[#070a12] border border-[#1d2538] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 shadow-inner sm:col-span-1"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      Add To Watchlist
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-[#0f131c] border border-[#1d2433] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#1d2433] flex items-center justify-between">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider font-bold text-white">
                      Monitored Wallets ({watchlist.length})
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Background worker continuously queries live miners every {status?.config?.watchlistIntervalMs ? `${status.config.watchlistIntervalMs / 1000}s` : '180s'}
                    </p>
                  </div>
                  <button
                    onClick={handlePollWatchlist}
                    disabled={isPollingWatchlist || watchlist.length === 0}
                    className="px-3 py-1.5 rounded bg-[#181e2b] hover:bg-[#222b3d] text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPollingWatchlist ? 'animate-spin' : ''}`} />
                    Trigger Poll Now
                  </button>
                </div>

                {watchlist.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    No wallets on the watchlist yet. Add one above to start continuous live monitoring.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-[#07090e] text-gray-400 uppercase text-[10px] border-b border-[#1d2433]">
                        <tr>
                          <th className="p-3">Wallet / Label</th>
                          <th className="p-3">Proposed Action</th>
                          <th className="p-3">Latest Verdict</th>
                          <th className="p-3">Last Polled</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1d2433]">
                        {watchlist.map((entry) => (
                          <tr key={entry.id} className="hover:bg-[#121622]">
                            <td className="p-3">
                              <div className="font-bold text-white">{entry.label}</div>
                              <div className="text-gray-400 text-[11px]">{entry.address}</div>
                            </td>
                            <td className="p-3 text-gray-300">{entry.proposedActionText}</td>
                            <td className="p-3">
                              {entry.lastVerdict ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    entry.lastVerdict === 'ALLOW'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : entry.lastVerdict === 'BLOCK'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  {entry.lastVerdict}
                                </span>
                              ) : (
                                <span className="text-gray-500">Pending poll</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-400 text-[11px]">
                              {entry.lastRunAt ? new Date(entry.lastRunAt).toLocaleTimeString() : 'Never'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleRemoveWatchlist(entry.id)}
                                className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete watched wallet"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT & COMPLIANCE LEDGER */}
          {activeView === 'history' && (
            <div className="space-y-6">
              <div className="bg-[#0b0f19] border border-[#1f2638] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>CRYPTOGRAPHIC AUDIT LEDGER</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Append-Only Gate Audit & Compliance Ledger
                    </h1>
                    <p className="text-sm text-gray-400 max-w-2xl leading-relaxed mt-1">
                      Log of gate runs this instance actually performed: verdict, reason, and miner receipts. On Vercel this sqlite file lives in ephemeral storage, so refresh reloads this instance only — it will not resurrect old demo rows.
                    </p>
                  </div>

                  <button
                    onClick={loadAuditData}
                    disabled={auditRefreshing}
                    className="px-4 py-2.5 rounded-xl bg-[#121724] hover:bg-[#182030] border border-[#232b3e] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${auditRefreshing ? 'animate-spin' : ''}`} />
                    <span>{auditRefreshing ? 'Refreshing...' : 'Refresh Ledger'}</span>
                  </button>
                </div>

                {auditError && (
                  <div className="mt-4 text-xs text-rose-400 font-mono">{auditError}</div>
                )}

                {/* Sub-Tabs / Filters */}
                <div className="flex items-center gap-2 pt-6 border-t border-[#181f2e] mt-6">
                  <button
                    onClick={() => setAuditTab('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      auditTab === 'all'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 shadow-sm'
                        : 'bg-[#10141f] text-gray-400 hover:text-white border border-[#1a2233]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Evaluated Gate Runs ({history.length})</span>
                  </button>

                  <button
                    onClick={() => setAuditTab('quarantined')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      auditTab === 'quarantined'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/35 shadow-sm'
                        : 'bg-[#10141f] text-gray-400 hover:text-white border border-[#1a2233]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Quarantined Threats ({quarantined.length})</span>
                  </button>

                  <button
                    onClick={() => setAuditTab('executed')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      auditTab === 'executed'
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/35 shadow-sm'
                        : 'bg-[#10141f] text-gray-400 hover:text-white border border-[#1a2233]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verified Executions ({executedActions.length})</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: ALL GATE RUNS */}
              {auditTab === 'all' && (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500 bg-[#0f131c] border border-[#1d2433] rounded-xl">
                      No gate runs recorded in database yet. Run a gate check in the Risk Firewall to record an evaluation.
                    </div>
                  ) : (
                    history.map((run) => (
                      <div
                        key={run.runId}
                        className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-5 font-mono text-xs hover:border-gray-700 transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-xs ${
                                  run.verdict === 'ALLOW'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : run.verdict === 'BLOCK'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {run.verdict}
                              </span>
                              <span className="font-bold text-white tracking-wide">{run.targetAddress}</span>
                            </div>
                            <p className="text-gray-400 text-[11px] mt-1.5 font-sans">
                              <span className="text-gray-500 uppercase tracking-wider font-mono text-[10px]">Proposed Action: </span>
                              <span className="text-gray-300 font-medium">{run.proposedActionText}</span>
                            </p>
                          </div>

                          <div className="text-right text-[11px] text-gray-400">
                            <div>{new Date(run.timestamp).toLocaleString()}</div>
                            <div className="text-[10px] text-gray-600 font-mono">ID: {run.runId}</div>
                          </div>
                        </div>

                        <div className="text-xs text-gray-300 bg-[#06080e] p-3 rounded-lg border border-[#161d2b] leading-relaxed">
                          {run.reason}
                        </div>

                        {/* Collapsible Miner Receipts / Evidence */}
                        {run.receipts && run.receipts.length > 0 && (
                          <div className="pt-2 border-t border-[#181f2e]">
                            <button
                              onClick={() => toggleExpandReceipt(run.runId)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>{expandedReceipts[run.runId] ? '▼ Hide' : '▶ View'} Miner Consensus Receipts ({run.receipts.length})</span>
                            </button>

                            {expandedReceipts[run.runId] && (
                              <div className="mt-3 space-y-2">
                                {run.receipts.map((r, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="p-2.5 rounded bg-[#0a0e17] border border-[#1c2436] text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white">{r.minerName} <span className="text-gray-500">[{r.intent}]</span></span>
                                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                        r.status === 'SUCCESS'
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : r.status === 'PAYMENT_REQUIRED'
                                          ? 'bg-amber-500/20 text-amber-400'
                                          : 'bg-rose-500/20 text-rose-400'
                                      }`}>
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-400 text-[10px]">
                                      <span>Endpoint: {r.endpoint} &bull; Latency: {r.latencyMs}ms</span>
                                      {r.explorerRequestId && r.explorerRequestId !== 'no explorer id' && (
                                        <span>Req ID: {r.explorerRequestId}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-[#181f2e]">
                          <span>{run.minersQueriedCount} miners queried &bull; {run.paidRequestsCount} paid requests</span>
                          <span>Payment Settled: {run.paymentSettled ? 'Yes' : 'No (402 Micropayment Required)'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 2: QUARANTINED THREATS */}
              {auditTab === 'quarantined' && (
                <div className="space-y-3">
                  {quarantined.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500 bg-[#0f131c] border border-[#1d2433] rounded-xl">
                      No addresses currently in compliance quarantine. Malicious addresses flagged with a BLOCK verdict are halted and listed here.
                    </div>
                  ) : (
                    quarantined.map((item) => (
                      <div
                        key={item.address}
                        className="bg-[#0f131c] border border-rose-500/30 rounded-xl p-5 font-mono text-xs hover:border-rose-500/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-3xl">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/40">
                              QUARANTINED
                            </span>
                            <span className="font-bold text-white">{item.address}</span>
                          </div>
                          <p className="text-gray-300 text-xs font-sans">{item.reason}</p>
                          <div className="flex items-center gap-4 text-[10px] text-gray-500">
                            <span>Risk Score: <strong className="text-rose-400">{item.riskScore}</strong></span>
                            <span>Halted: {new Date(item.haltedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => releaseQuarantine(item.address)}
                          disabled={releasingAddr === item.address}
                          className="px-3 py-1.5 rounded-lg bg-[#151c2c] hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 border border-[#222c42] hover:border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{releasingAddr === item.address ? 'Releasing...' : 'Release Quarantine'}</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 3: EXECUTED ACTIONS */}
              {auditTab === 'executed' && (
                <div className="space-y-3">
                  {executedActions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500 bg-[#0f131c] border border-[#1d2433] rounded-xl">
                      No approved-for-broadcast records yet. ALLOW verdicts are logged here as receipts, not as signed transactions.
                    </div>
                  ) : (
                    executedActions.map((act) => (
                      <div
                        key={act.actionId}
                        className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-5 font-mono text-xs hover:border-gray-700 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                              act.status === 'EXECUTED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {act.status}
                            </span>
                            <span className="font-bold text-white">{act.targetAddress}</span>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {new Date(act.executedAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-gray-300 text-xs font-sans">
                          <span className="text-gray-500 uppercase tracking-wider font-mono text-[10px]">Action Type: </span>
                          <span className="text-gray-200 font-semibold">{act.actionType}</span>
                        </p>

                        {act.payload && (
                          <div className="p-2.5 rounded bg-[#06080e] border border-[#182030] text-[11px] text-gray-400 space-y-1">
                            {act.payload.broadcastTx && (
                              <div>Tx Hash: <span className="text-emerald-400">{act.payload.broadcastTx}</span></div>
                            )}
                            {act.payload.status && (
                              <div>On-Chain Status: <span className="text-cyan-400">{act.payload.status}</span></div>
                            )}
                            {act.payload.blockNumber && (
                              <div>Block: <span className="text-gray-300">{act.payload.blockNumber}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REAL-TIME SIGNAL STREAM */}
          {activeView === 'stream' && (
            <LiveSignalStream />
          )}

          {/* TAB 6: ROUTING EXPERIMENTS & PARAMETER SWEEP */}
          {activeView === 'experiments' && (
            <RoutingExperiments />
          )}

          {/* TAB 7: COMPLIANCE QUARANTINE & ACTION EXECUTION LEDGER */}
          {activeView === 'compliance' && (
            <ComplianceLedger />
          )}
        </main>
      )}

      {/* Production Footer (Zero Hackathon References) */}
      <footer className="border-t border-[#161b26] bg-[#05070a] py-8 text-xs font-mono text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
            <span className="font-bold text-gray-300">Signalgate Protocol</span>
            <span>&bull;</span>
            <span>Decentralized Pre-Action Intelligence</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <a
              href="https://docs.telegraphprotocol.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Protocol Docs
            </a>
            <a
              href="https://explorer.telegraphprotocol.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Telegraph Explorer
            </a>
            <a
              href="https://devnode.telegraphprotocol.com/api/miners"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Live Catalog API
            </a>
            <a
              href="https://github.com/telegraphprotocol/telegraph-mcp"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              MCP Integration
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
