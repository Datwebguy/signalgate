import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type {
  GateRunResult,
  WatchlistEntry,
  GateVerdictType,
  QuarantinedWallet,
  ExecutedAction,
  FlywheelStats,
} from '../telegraph/types';

const IS_VERCEL = !!process.env.VERCEL;
const DB_DIR = IS_VERCEL ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (IS_VERCEL) {
    const seedPath = path.resolve(process.cwd(), 'data', 'signalgate.sqlite');
    const targetPath = path.join(DB_DIR, 'signalgate.sqlite');
    if (fs.existsSync(seedPath) && !fs.existsSync(targetPath)) {
      fs.copyFileSync(seedPath, targetPath);
    }
  }
} catch (err) {
  console.warn('Warning creating DB directory:', err);
}

const DB_PATH = path.join(DB_DIR, 'signalgate.sqlite');

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        proposed_action TEXT NOT NULL DEFAULT 'Standard transaction proposal',
        last_verdict TEXT,
        last_reason TEXT,
        last_run_at TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gate_runs (
        id TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        action TEXT NOT NULL,
        verdict TEXT NOT NULL,
        reason TEXT NOT NULL,
        confidence REAL NOT NULL,
        threshold REAL NOT NULL DEFAULT 0.6,
        miner_count INTEGER NOT NULL,
        paid_count INTEGER NOT NULL,
        payment_settled INTEGER NOT NULL DEFAULT 0,
        receipts_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quarantined_wallets (
        address TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        risk_score REAL NOT NULL,
        miner_evidence_json TEXT,
        halted_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS executed_actions (
        action_id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        target_address TEXT NOT NULL,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT,
        executed_at TEXT NOT NULL
      );
    `);
  }
  return dbInstance;
}

export function saveGateRun(run: GateRunResult): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO gate_runs (
      id, address, action, verdict, reason, confidence, threshold, miner_count, paid_count, payment_settled, receipts_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    run.runId,
    run.targetAddress,
    run.proposedActionText || 'Standard transaction proposal',
    run.verdict,
    run.reason,
    run.overallConfidence,
    run.configuredConfidenceThreshold,
    run.minersQueriedCount,
    run.paidRequestsCount,
    run.paymentSettled ? 1 : 0,
    JSON.stringify(run.receipts),
    run.timestamp
  );
}

export function getRecentGateRuns(limit = 25): GateRunResult[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM gate_runs ORDER BY created_at DESC LIMIT ?
  `);
  const rows = stmt.all(limit) as any[];

  return rows.map((r) => ({
    runId: r.id,
    targetAddress: r.address,
    proposedActionText: r.action,
    verdict: r.verdict as GateVerdictType,
    reason: r.reason,
    overallConfidence: Number(r.confidence),
    configuredConfidenceThreshold: Number(r.threshold || 0.6),
    timestamp: r.created_at,
    receipts: JSON.parse(r.receipts_json || '[]'),
    minersQueriedCount: Number(r.miner_count),
    paidRequestsCount: Number(r.paid_count),
    paymentSettled: Boolean(r.payment_settled),
  }));
}

export function getGateRunById(id: string): GateRunResult | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM gate_runs WHERE id = ?`);
  const row = stmt.get(id) as any;
  if (!row) return null;

  return {
    runId: row.id,
    targetAddress: row.address,
    proposedActionText: row.action,
    verdict: row.verdict as GateVerdictType,
    reason: row.reason,
    overallConfidence: Number(row.confidence),
    configuredConfidenceThreshold: Number(row.threshold || 0.6),
    timestamp: row.created_at,
    receipts: JSON.parse(row.receipts_json || '[]'),
    minersQueriedCount: Number(row.miner_count),
    paidRequestsCount: Number(row.paid_count),
    paymentSettled: Boolean(row.payment_settled),
  };
}

export function getWatchlist(): WatchlistEntry[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM watchlist ORDER BY created_at DESC
  `);
  const rows = stmt.all() as any[];

  return rows.map((r) => ({
    id: Number(r.id),
    address: r.address,
    label: r.label,
    proposedActionText: r.proposed_action,
    lastVerdict: r.last_verdict as GateVerdictType | undefined,
    lastReason: r.last_reason || undefined,
    lastRunAt: r.last_run_at || undefined,
    active: Boolean(r.active),
    createdAt: r.created_at,
  }));
}

export function addToWatchlist(
  address: string,
  label: string,
  proposedActionText = 'Standard transaction proposal'
): WatchlistEntry {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO watchlist (address, label, proposed_action, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET label = excluded.label, proposed_action = excluded.proposed_action
  `);
  stmt.run(address.toLowerCase(), label, proposedActionText, now);

  const getStmt = db.prepare(`SELECT * FROM watchlist WHERE address = ?`);
  const row = getStmt.get(address.toLowerCase()) as any;

  return {
    id: Number(row.id),
    address: row.address,
    label: row.label,
    proposedActionText: row.proposed_action,
    lastVerdict: row.last_verdict as GateVerdictType | undefined,
    lastReason: row.last_reason || undefined,
    lastRunAt: row.last_run_at || undefined,
    active: Boolean(row.active),
    createdAt: row.created_at,
  };
}

export function removeFromWatchlist(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM watchlist WHERE id = ?`);
  const res = stmt.run(id);
  return Number((res as any)?.changes) > 0;
}

export function updateWatchlistVerdict(
  id: number,
  verdict: GateVerdictType,
  reason: string
): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE watchlist SET last_verdict = ?, last_reason = ?, last_run_at = ?
    WHERE id = ?
  `);
  stmt.run(verdict, reason, new Date().toISOString(), id);
}

export function quarantineWallet(
  address: string,
  reason: string,
  evidence: unknown,
  riskScore = 1.0
): void {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO quarantined_wallets (address, reason, risk_score, miner_evidence_json, halted_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      reason = excluded.reason,
      risk_score = excluded.risk_score,
      miner_evidence_json = excluded.miner_evidence_json,
      halted_at = excluded.halted_at
  `);
  stmt.run(address.toLowerCase(), reason, riskScore, JSON.stringify(evidence || {}), now);
}

export function getQuarantinedWallets(): QuarantinedWallet[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM quarantined_wallets ORDER BY halted_at DESC`);
  const rows = stmt.all() as any[];
  return rows.map((r) => ({
    address: r.address,
    reason: r.reason,
    riskScore: Number(r.risk_score),
    minerEvidence: JSON.parse(r.miner_evidence_json || '{}'),
    haltedAt: r.halted_at,
  }));
}

export function releaseQuarantinedWallet(address: string): boolean {
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM quarantined_wallets WHERE address = ?`);
  const res = stmt.run(address.toLowerCase());
  return Number((res as any)?.changes) > 0;
}

export function recordExecutedAction(
  runId: string,
  targetAddress: string,
  actionType: string,
  status: 'EXECUTED' | 'HALTED',
  payload: unknown
): ExecutedAction {
  const db = getDb();
  const now = new Date().toISOString();
  const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const stmt = db.prepare(`
    INSERT INTO executed_actions (action_id, run_id, target_address, action_type, status, payload_json, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(actionId, runId, targetAddress.toLowerCase(), actionType, status, JSON.stringify(payload || {}), now);

  return {
    actionId,
    runId,
    targetAddress: targetAddress.toLowerCase(),
    actionType,
    status,
    payload,
    executedAt: now,
  };
}

export function getExecutedActions(limit = 25): ExecutedAction[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM executed_actions ORDER BY executed_at DESC LIMIT ?`);
  const rows = stmt.all(limit) as any[];
  return rows.map((r) => ({
    actionId: r.action_id,
    runId: r.run_id,
    targetAddress: r.target_address,
    actionType: r.action_type,
    status: r.status,
    payload: JSON.parse(r.payload_json || '{}'),
    executedAt: r.executed_at,
  }));
}

export function getFlywheelStats(): FlywheelStats {
  const db = getDb();
  const runsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_runs,
      COALESCE(SUM(miner_count), 0) as total_asks,
      COALESCE(SUM(paid_count), 0) as total_paid
    FROM gate_runs
  `);
  const runsRes = (runsStmt.get() as any) || {};

  const addrStmt = db.prepare(`SELECT COUNT(DISTINCT address) as unique_addrs FROM watchlist`);
  const addrRes = (addrStmt.get() as any) || {};

  return {
    totalAsksDispatched: Number(runsRes.total_asks || 0),
    totalPaidRequests: Number(runsRes.total_paid || 0),
    totalGateRuns: Number(runsRes.total_runs || 0),
    uniqueAddressesMonitored: Number(addrRes.unique_addrs || 0),
    activeMinersEngaged: Math.min(131, Math.max(4, Number(runsRes.total_asks || 0))),
    targetFlywheelGoal: 100,
  };
}

