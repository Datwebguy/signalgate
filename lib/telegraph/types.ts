export interface MinerEndpoint {
  path: string;
  method: string;
  description?: string;
  multipart_fields?: string[];
  param_map?: Record<string, string>;
  content_type?: string;
}

export interface MinerScore {
  intent_id: string;
  epoch_id?: number;
  rank?: number;
  score?: number;
  scored_at?: string;
}

export interface Miner {
  id: string;
  slug: string;
  kind?: string;
  protocol?: string;
  name: string;
  description: string;
  activation_status: string;
  supported_intents: string[];
  endpoints: MinerEndpoint[];
  base_url: string;
  wallet_address: string;
  fee_address: string;
  min_price_usdc: number;
  signal_mapping?: {
    confidence_field?: string;
    label_field?: string;
    reason_field?: string;
    type?: string;
  };
  scores?: MinerScore[];
}

export interface MinerReceipt {
  minerId: string;
  minerName: string;
  slug: string;
  intent: string;
  endpoint: string;
  method: string;
  paid: boolean;
  paymentDetails?: {
    scheme?: string;
    network?: string;
    amount?: string;
    payTo?: string;
    asset?: string;
    txHash?: string;
  };
  priceUsdc: number;
  status: 'SUCCESS' | 'FAILED' | 'PAYMENT_REQUIRED';
  error?: string;
  latencyMs: number;
  timestamp: string;
  rawResponse: unknown;
  extractedConfidence?: number;
  extractedLabel?: string;
  extractedReason?: string;
  explorerMinerUrl: string;
  explorerRequestId: string; // Real request/tx id or "no explorer id"
}

export type GateVerdictType = 'ALLOW' | 'WAIT' | 'BLOCK';

export interface GateRunResult {
  runId: string;
  targetAddress: string;
  proposedActionText: string;
  verdict: GateVerdictType;
  reason: string;
  overallConfidence: number;
  configuredConfidenceThreshold: number;
  timestamp: string;
  receipts: MinerReceipt[];
  minersQueriedCount: number;
  paidRequestsCount: number;
  paymentSettled: boolean;
}

export interface WatchlistEntry {
  id: number;
  address: string;
  label: string;
  proposedActionText: string;
  lastVerdict?: GateVerdictType;
  lastReason?: string;
  lastRunAt?: string;
  active: boolean;
  createdAt: string;
}

export interface QuarantinedWallet {
  address: string;
  reason: string;
  riskScore: number;
  minerEvidence: unknown;
  haltedAt: string;
}

export interface ExecutedAction {
  actionId: string;
  runId: string;
  targetAddress: string;
  actionType: string;
  status: 'EXECUTED' | 'HALTED';
  payload: unknown;
  executedAt: string;
}

export interface FlywheelStats {
  totalAsksDispatched: number;
  totalPaidRequests: number;
  totalGateRuns: number;
  uniqueAddressesMonitored: number;
  activeMinersEngaged: number;
}
