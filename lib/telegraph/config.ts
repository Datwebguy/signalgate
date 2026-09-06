import { config as loadDotenv } from 'dotenv';
loadDotenv();

export interface TelegraphConfig {
  nodeUrl: string;
  engineUrl: string;
  daemonUrl: string;
  explorerUrl: string;
  evmPrivateKey?: string;
  evmNetwork: `${string}:${string}`;
  gateMinConfidence: number;
  watchlistIntervalMs: number;
}

export function getTelegraphConfig(): TelegraphConfig {
  const gateMinConfidence = parseFloat(process.env.GATE_MIN_CONFIDENCE || '0.6');
  const watchlistIntervalMs = parseInt(process.env.WATCHLIST_INTERVAL_MS || '180000', 10);

  return {
    nodeUrl: (process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com').replace(/\/$/, ''),
    engineUrl: (process.env.TELEGRAPH_ENGINE_URL || 'https://devnode.telegraphprotocol.com/engine').replace(/\/$/, ''),
    daemonUrl: (process.env.TELEGRAPH_DAEMON_URL || 'https://devnode.telegraphprotocol.com/daemon').replace(/\/$/, ''),
    explorerUrl: (process.env.TELEGRAPH_EXPLORER_URL || 'https://explorer.telegraphprotocol.com').replace(/\/$/, ''),
    evmPrivateKey: process.env.TELEGRAPH_EVM_PRIVATE_KEY || undefined,
    evmNetwork: (process.env.EVM_NETWORK || 'eip155:84532') as `${string}:${string}`,
    gateMinConfidence,
    watchlistIntervalMs,
  };
}
