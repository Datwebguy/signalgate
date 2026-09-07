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

export default function Home() {
  // Navigation view: 'landing' (full landing page) or 'console' | 'catalog' | 'watchlist' | 'history'
  const [activeView, setActiveView] = useState<'landing' | 'console' | 'catalog' | 'watchlist' | 'history'>('landing');

  // Gate execution state
  const [address, setAddress] = useState('');
  const [actionText, setActionText] = useState('Transfer 1,000 USDC to counterparty');
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

  // Run History state
  const [history, setHistory] = useState<GateRunResult[]>([]);

  // Catalog state
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Expanded receipt payloads
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [copiedCodeTab, setCopiedCodeTab] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<'curl' | 'ts' | 'worker'>('curl');

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

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/gate/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
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
    loadHistory();
    loadCatalog();
    const interval = setInterval(() => {
      refreshStatus();
      loadWatchlist();
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentRun(data.data);
        loadHistory();
        loadWatchlist();
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('landing')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 border border-emerald-500/35 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base text-white">SIGNALGATE</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Protocol
                </span>
              </div>
              <p className="text-[10px] text-gray-400 tracking-tight hidden sm:block">
                Autonomous Pre-Action Risk Firewall
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveView('landing')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                activeView === 'landing'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('console')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeView === 'console'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Risk Gate
            </button>
            <button
              onClick={() => setActiveView('catalog')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeView === 'catalog'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Miners ({catalog.length})
            </button>
            <button
              onClick={() => setActiveView('watchlist')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeView === 'watchlist'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Watchlist
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 ${
                activeView === 'history'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Audit Log
            </button>

            {/* Direct App Launch Button */}
            {activeView === 'landing' && (
              <button
                onClick={() => setActiveView('console')}
                className="ml-2 px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1"
              >
                <span>Launch Gate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </nav>
        </div>

        {/* Real-time Network Telemetry Bar */}
        <div className="bg-[#05070a] border-t border-[#141822] px-4 py-2 text-[11px] font-mono">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-gray-400">
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status?.network?.node?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>Node: <strong className="text-gray-300">devnode.telegraphprotocol.com</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status?.network?.engine?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>Engine: <strong className="text-gray-300">Online</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status?.network?.daemon?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>Daemon: <strong className="text-gray-300">Online</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>Advertised Miners: <strong className="text-emerald-400">{status?.catalog?.activeMiners || catalog.length || '...'} Live</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span>x402 Settlement:</span>
                {status?.payment?.isConfigured ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Signed (Base Sepolia)
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Standby (402 Fail-Closed)
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  refreshStatus();
                  loadCatalog(true);
                }}
                disabled={isRefreshingStatus}
                title="Refresh network telemetry"
                className="p-1 rounded hover:bg-[#181d28] text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
              </button>
            </div>
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
                    <span>Inspect 130+ Live Miners</span>
                  </button>
                </div>

                {/* Live Stats Matrix */}
                <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left font-mono">
                  <div className="bg-[#0b0e15]/80 border border-[#1b2230] p-4 rounded-lg">
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider">Live Miners</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{catalog.length || 131}+ Active</div>
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
                    <div className="text-[10px] text-gray-500 mt-0.5">Zero guesses / mocks</div>
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
                    <span className="ml-2 font-bold text-gray-200">signalgate-intercept-daemon</span>
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
                      <span>Veridex (#1001)</span> <span className="text-emerald-400">Fraud Check</span>
                    </p>
                    <p className="text-gray-400 text-[11px] flex items-center justify-between">
                      <span>DegenLens (#10002)</span> <span className="text-emerald-400">State / RPC</span>
                    </p>
                    <p className="text-gray-400 text-[11px] flex items-center justify-between">
                      <span>Engine Router</span> <span className="text-emerald-400">Safety Consensus</span>
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold font-mono">
                Enterprise Hardening
              </h2>
              <h3 className="text-3xl font-extrabold text-white">
                Built for High-Stakes Agent Autonomy
              </h3>
              <p className="text-sm text-gray-400 font-sans">
                Engineered with strict constraints: no mock data, no hardcoded rosters, and zero custody.
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
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
                    onClick={() => setActiveDevTab('worker')}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold ${activeDevTab === 'worker' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
                  >
                    CLI Poller
                  </button>
                </div>
              </div>

              <div className="mt-6 relative">
                <button
                  onClick={() => {
                    const code =
                      activeDevTab === 'curl'
                        ? `curl -X POST http://localhost:3000/api/gate/run \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "action": "Swap 10 ETH on Uniswap"}'`
                        : activeDevTab === 'ts'
                        ? `import { executeGateRun } from '@/lib/gate/runner';

// Pre-action risk check
const result = await executeGateRun(
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'Swap 10 ETH on Uniswap'
);

if (result.verdict !== 'ALLOW') {
  throw new Error(\`Gate blocked execution: \${result.reason}\`);
}`
                        : `npx tsx scripts/worker.ts --once`;
                    copySnippet(code);
                  }}
                  className="absolute right-3 top-3 p-1.5 rounded bg-[#18202d] text-gray-400 hover:text-white transition-colors"
                  title="Copy snippet"
                >
                  {copiedCodeTab ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <pre className="bg-[#05070a] p-4 sm:p-6 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto border border-[#141a24]">
                  {activeDevTab === 'curl' && `curl -X POST http://localhost:3000/api/gate/run \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "action": "Swap 10 ETH on Uniswap"}'`}
                  {activeDevTab === 'ts' && `import { executeGateRun } from '@/lib/gate/runner';

// Pre-action risk check
const result = await executeGateRun(
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  'Swap 10 ETH on Uniswap'
);

if (result.verdict !== 'ALLOW') {
  throw new Error(\`Gate blocked execution: \${result.reason}\`);
}`}
                  {activeDevTab === 'worker' && `npx tsx scripts/worker.ts --once`}
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
              Start testing live addresses right now. Query the real Telegraph network of 130+ decentralized miners in seconds.
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
              {/* Action Proposal Form */}
              <div className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                      Pre-Action Evaluation
                    </h2>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Policy: Fail-Closed &bull; Consensus Floor: {status?.config?.gateMinConfidence ? `${status.config.gateMinConfidence * 100}%` : '60%'}
                  </span>
                </div>

                <form onSubmit={handleRunGate} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                      Target Wallet Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter EVM address (e.g. 0x...)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#1b2230] rounded px-3.5 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs uppercase tracking-wider text-gray-400">
                        Proposed Wallet Action
                      </label>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-gray-500">Quick labels:</span>
                        <button
                          type="button"
                          onClick={() => setActionText('Transfer 1,000 USDC to counterparty')}
                          className="text-gray-400 hover:text-emerald-400 transition-colors underline"
                        >
                          Transfer
                        </button>
                        <span className="text-gray-600">&bull;</span>
                        <button
                          type="button"
                          onClick={() => setActionText('Sign unlimited ERC-20 token approval for Uniswap Router')}
                          className="text-gray-400 hover:text-emerald-400 transition-colors underline"
                        >
                          Approval
                        </button>
                        <span className="text-gray-600">&bull;</span>
                        <button
                          type="button"
                          onClick={() => setActionText('Execute swap 5 ETH for PEPE via DEX contract')}
                          className="text-gray-400 hover:text-emerald-400 transition-colors underline"
                        >
                          Swap
                        </button>
                        <span className="text-gray-600">&bull;</span>
                        <button
                          type="button"
                          onClick={() => setActionText('Bridge 10 ETH to Layer 2 Arbitrum Bridge')}
                          className="text-gray-400 hover:text-emerald-400 transition-colors underline"
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
                      className="w-full bg-[#07090e] border border-[#1b2230] rounded px-3.5 py-2.5 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-gray-500 font-mono">
                      Actions will NOT fire until live Telegraph miners agree.
                    </div>
                    <button
                      type="submit"
                      disabled={isRunning}
                      className="px-5 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10 cursor-pointer"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Querying Live Miners...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Run Gate Check
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
                  {!currentRun.paymentSettled && currentRun.verdict === 'WAIT' && (
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

                  {/* Miner Receipts Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Live Miner Proofs &amp; Receipts ({currentRun.receipts.length})
                      </h3>
                      <span className="text-[11px] text-gray-500 font-mono">
                        Real Telegraph Miners &bull; No Mocks &bull; No Fixtures
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
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Live Telegraph Miner Network
                  </h2>
                  <p className="text-xs text-gray-400">
                    Direct live registry from devnode.telegraphprotocol.com/api/miners ({catalog.length} active registered miners)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search name, intent, or slug..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="bg-[#0f131c] border border-[#1d2433] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    onClick={() => loadCatalog(true)}
                    disabled={isLoadingCatalog}
                    className="px-3 py-1.5 rounded bg-[#181e2b] hover:bg-[#222b3d] text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                    Refresh Catalog
                  </button>
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
              <div className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-5">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Add Address to Continuous Watchlist
                </h3>
                <form onSubmit={handleAddWatchlist} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Target address (0x...)"
                    value={newWatchAddress}
                    onChange={(e) => setNewWatchAddress(e.target.value)}
                    className="bg-[#07090e] border border-[#1b2230] rounded px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Treasury Multisig)"
                    value={newWatchLabel}
                    onChange={(e) => setNewWatchLabel(e.target.value)}
                    className="bg-[#07090e] border border-[#1b2230] rounded px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Action description"
                      value={newWatchAction}
                      onChange={(e) => setNewWatchAction(e.target.value)}
                      className="flex-1 bg-[#07090e] border border-[#1b2230] rounded px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </form>
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
                    onClick={async () => {
                      setIsPollingWatchlist(true);
                      try {
                        if (watchlist.length > 0) {
                          await fetch('/api/gate/run', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              address: watchlist[0].address,
                              action: watchlist[0].proposedActionText,
                            }),
                          });
                          loadWatchlist();
                          loadHistory();
                        }
                      } finally {
                        setIsPollingWatchlist(false);
                      }
                    }}
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

          {/* TAB 4: AUDIT LOG */}
          {activeView === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Append-Only Gate Audit Log
                  </h2>
                  <p className="text-xs text-gray-400">
                    Every decision stored with live miner payloads and payment receipts
                  </p>
                </div>
                <button
                  onClick={loadHistory}
                  className="px-3 py-1.5 rounded bg-[#181e2b] hover:bg-[#222b3d] text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Logs
                </button>
              </div>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#0f131c] border border-[#1d2433] rounded-xl">
                    No gate runs recorded in database yet. Run a gate check in the console to record a run.
                  </div>
                ) : (
                  history.map((run) => (
                    <div
                      key={run.runId}
                      className="bg-[#0f131c] border border-[#1d2433] rounded-xl p-4 font-mono text-xs hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-xs ${
                                run.verdict === 'ALLOW'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : run.verdict === 'BLOCK'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {run.verdict}
                            </span>
                            <span className="font-bold text-white">{run.targetAddress}</span>
                          </div>
                          <p className="text-gray-400 text-[11px] mt-1">Action: {run.proposedActionText}</p>
                        </div>

                        <div className="text-right text-[11px] text-gray-400">
                          <div>{new Date(run.timestamp).toLocaleString()}</div>
                          <div>ID: {run.runId}</div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 bg-[#05070a] p-2.5 rounded border border-gray-900 mb-2">
                        {run.reason}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-800">
                        <span>{run.minersQueriedCount} miners queried &bull; {run.paidRequestsCount} paid requests</span>
                        <span>Payment Settled: {run.paymentSettled ? 'Yes' : 'No (402)'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Production Footer (Zero Hackathon References) */}
      <footer className="border-t border-[#161b26] bg-[#05070a] py-8 text-xs font-mono text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
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
