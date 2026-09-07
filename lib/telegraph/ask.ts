import { getTelegraphConfig } from './config';
import { getPaymentAwareFetch, parsePaymentRequiredHeader, parsePaymentResponseHeader } from './x402';
import type { Miner, MinerEndpoint, MinerReceipt } from './types';

function getNestedField(obj: any, path?: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[p];
  }
  return curr;
}

function mapEndpointParams(endpoint: MinerEndpoint, params: Record<string, unknown>): Record<string, unknown> {
  const paramMap = endpoint.param_map || {};
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    mapped[paramMap[key] || key] = value;
  }
  return mapped;
}

function extractSignals(data: any, miner?: Miner): Pick<MinerReceipt, 'extractedConfidence' | 'extractedLabel' | 'extractedReason'> {
  const mapping = miner?.signal_mapping;
  let extractedConfidence: number | undefined;
  let extractedLabel: string | undefined;
  let extractedReason: string | undefined;

  if (mapping) {
    const conf = getNestedField(data, mapping.confidence_field);
    if (typeof conf === 'number') extractedConfidence = conf;
    else if (typeof conf === 'string') extractedConfidence = parseFloat(conf);
    extractedLabel = getNestedField(data, mapping.label_field);
    extractedReason = getNestedField(data, mapping.reason_field);
  }

  const result = data?.result ?? data;
  if (extractedConfidence === undefined) {
    const c =
      data?.confidence ??
      result?.confidence ??
      data?.signal?.confidence ??
      data?.capabilityIntelligence?.confidence;
    if (typeof c === 'number') extractedConfidence = c;
    else if (typeof c === 'string' && !Number.isNaN(parseFloat(c))) extractedConfidence = parseFloat(c);
  }
  if (!extractedLabel) {
    extractedLabel =
      data?.label ??
      data?.state ??
      result?.state ??
      data?.status ??
      data?.capabilityIntelligence?.state;
  }
  if (!extractedReason) {
    extractedReason =
      data?.reason ??
      data?.explanation ??
      result?.evidence ??
      data?.message ??
      data?.answer ??
      data?.reasoning;
  }

  return { extractedConfidence, extractedLabel, extractedReason };
}

function applyPaymentHeaders(receipt: MinerReceipt, response: Response): void {
  const paymentResponseHdr = response.headers.get('payment-response');
  const requestId = response.headers.get('x-request-id');
  if (requestId) receipt.explorerRequestId = requestId;
  if (paymentResponseHdr) {
    receipt.paid = true;
    const decoded = parsePaymentResponseHeader(paymentResponseHdr) as any;
    const txHash = decoded?.transactionHash || decoded?.txHash || requestId;
    if (txHash) receipt.explorerRequestId = txHash;
    receipt.paymentDetails = {
      txHash,
      network: decoded?.network,
    };
  }
}

export async function askMiner(
  miner: Miner,
  endpoint: MinerEndpoint,
  params: Record<string, unknown>,
  options: { intent?: string; timeoutMs?: number } = {}
): Promise<MinerReceipt> {
  const config = getTelegraphConfig();
  const fetchWithPayment = await getPaymentAwareFetch();
  const explorerMinerUrl = `${config.explorerUrl}/miners/${miner.id}`;
  const method = (endpoint.method || 'POST').toUpperCase();
  const url = `${config.nodeUrl}/miner-dispatcher/v1/${miner.id}${endpoint.path}`;
  const mappedParams = mapEndpointParams(endpoint, params);
  const timeoutMs = options.timeoutMs || 10000;

  const startTime = Date.now();
  const receipt: MinerReceipt = {
    minerId: miner.id,
    minerName: miner.name,
    slug: miner.slug,
    intent: options.intent || miner.supported_intents?.[0] || 'UNKNOWN',
    endpoint: endpoint.path,
    method,
    paid: false,
    priceUsdc: (miner.min_price_usdc || 10000) / 1000000,
    status: 'FAILED',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
    rawResponse: null,
    explorerMinerUrl,
    explorerRequestId: 'no explorer id',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    if (method === 'GET') {
      const filtered = Object.fromEntries(
        Object.entries(mappedParams).filter(([, v]) => v !== undefined && v !== null)
      );
      const qs = new URLSearchParams(
        Object.entries(filtered).map(([k, v]) => [k, String(v)])
      ).toString();
      const fullUrl = qs ? `${url}?${qs}` : url;
      response = await fetchWithPayment(fullUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
    } else {
      response = await fetchWithPayment(url, {
        method: method === 'PUT' || method === 'PATCH' ? method : 'POST',
        headers: {
          'Content-Type': endpoint.content_type || 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(mappedParams),
        signal: controller.signal,
      });
    }

    receipt.latencyMs = Date.now() - startTime;
    applyPaymentHeaders(receipt, response);

    if (response.status === 402) {
      receipt.status = 'PAYMENT_REQUIRED';
      const challenge = parsePaymentRequiredHeader(response.headers.get('payment-required')) as any;
      const body = await response.json().catch(() => null);
      receipt.rawResponse = body || challenge;
      receipt.error = 'x402 Payment Required: Live miner requires settled USDC payment on Base Sepolia.';
      return receipt;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      receipt.status = 'FAILED';
      receipt.error = `HTTP ${response.status}: ${errText}`;
      receipt.rawResponse = errText;
      return receipt;
    }

    const data = await response.json();
    receipt.rawResponse = data;
    receipt.status = 'SUCCESS';
    Object.assign(receipt, extractSignals(data, miner));
    return receipt;
  } catch (err: any) {
    receipt.latencyMs = Date.now() - startTime;
    receipt.status = 'FAILED';
    receipt.error = err.message || String(err);
    return receipt;
  } finally {
    clearTimeout(timeout);
  }
}

export interface EngineAskOptions {
  intent?: string;
  context?: Record<string, unknown>;
  timeoutMs?: number;
}

export async function askEngine(query: string, options: EngineAskOptions = {}): Promise<MinerReceipt> {
  const config = getTelegraphConfig();
  const fetchWithPayment = await getPaymentAwareFetch();
  const url = `${config.engineUrl}/v1/ask`;
  const timeoutMs = options.timeoutMs || 15000;

  const startTime = Date.now();
  const receipt: MinerReceipt = {
    minerId: 'engine-auto-router',
    minerName: 'Telegraph Engine Router',
    slug: 'engine-ask',
    intent: options.intent || 'AUTO_ROUTER',
    endpoint: '/v1/ask',
    method: 'POST',
    paid: false,
    priceUsdc: 0.01,
    status: 'FAILED',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
    rawResponse: null,
    explorerMinerUrl: `${config.explorerUrl}/signals`,
    explorerRequestId: 'no explorer id',
  };

  const work = async (): Promise<MinerReceipt> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
    const body: Record<string, unknown> = { query };
    const context: Record<string, unknown> = { ...(options.context || {}) };
    if (options.intent) context.intent = options.intent;
    if (Object.keys(context).length > 0) body.context = context;

    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    receipt.latencyMs = Date.now() - startTime;
    applyPaymentHeaders(receipt, response);

    if (response.status === 402) {
      receipt.status = 'PAYMENT_REQUIRED';
      const challenge = parsePaymentRequiredHeader(response.headers.get('payment-required')) as any;
      const bodyJson = await response.json().catch(() => null);
      receipt.rawResponse = bodyJson || challenge;
      receipt.error = 'x402 Payment Required: Engine router requires 0.01 USDC settlement on Base Sepolia.';
      return receipt;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      receipt.status = 'FAILED';
      receipt.error = `HTTP ${response.status}: ${errText}`;
      receipt.rawResponse = errText;
      return receipt;
    }

    const data = await response.json();
    receipt.rawResponse = data;
    receipt.status = 'SUCCESS';
    if (data?.miner_used) receipt.minerId = String(data.miner_used);
    if (data?.miner_name) receipt.minerName = String(data.miner_name);
    if (data?.intent) receipt.intent = String(data.intent);
    if (data?.endpoint) receipt.endpoint = String(data.endpoint);
    Object.assign(receipt, extractSignals(data?.result ?? data));
    if (!receipt.extractedReason) {
      receipt.extractedReason = data?.reasoning || data?.answer;
    }
    return receipt;
  } catch (err: any) {
    receipt.latencyMs = Date.now() - startTime;
    receipt.status = 'FAILED';
    receipt.error = err.message || String(err);
    return receipt;
  } finally {
    clearTimeout(timeout);
  }
  };

  const timedOut = new Promise<MinerReceipt>((resolve) => {
    setTimeout(() => {
      receipt.latencyMs = Date.now() - startTime;
      receipt.status = 'FAILED';
      receipt.error = `Engine ask timed out after ${timeoutMs}ms`;
      resolve({ ...receipt });
    }, timeoutMs + 500);
  });

  return Promise.race([work(), timedOut]);
}
