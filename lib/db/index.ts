import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import type { GateRunResult, WatchlistEntry, GateVerdictType } from '../telegraph/types';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
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
