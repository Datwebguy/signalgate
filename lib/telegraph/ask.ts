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

export async function askMiner(
  miner: Miner,
  endpoint: MinerEndpoint,
  params: Record<string, unknown>
): Promise<MinerReceipt> {
  const config = getTelegraphConfig();
  const fetchWithPayment = await getPaymentAwareFetch();
  const explorerMinerUrl = `${config.explorerUrl}/miners/${miner.id}`;

  const method = (endpoint.method || 'POST').toUpperCase();
  const url = `${config.nodeUrl}/miner-dispatcher/v1/${miner.id}${endpoint.path}`;

  const startTime = Date.now();
  const receipt: MinerReceipt = {
    minerId: miner.id,
    minerName: miner.name,
    slug: miner.slug,
    intent: miner.supported_intents?.[0] || 'UNKNOWN',
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
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    let response: Response;
    if (method === 'GET') {
      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    }

    receipt.latencyMs = Date.now() - startTime;

    const paymentRequiredHdr = response.headers.get('payment-required');
    const paymentResponseHdr = response.headers.get('payment-response');
    const requestId = response.headers.get('x-request-id');

    if (requestId) {
      receipt.explorerRequestId = requestId;
    }

    if (paymentResponseHdr) {
      receipt.paid = true;
      const decoded = parsePaymentResponseHeader(paymentResponseHdr) as any;
      const txHash = decoded?.transactionHash || decoded?.txHash || requestId;
      if (txHash) {
        receipt.explorerRequestId = txHash;
      }
      receipt.paymentDetails = {
        txHash,
        network: decoded?.network,
      };
    }

    if (response.status === 402) {
      receipt.status = 'PAYMENT_REQUIRED';
      const challenge = parsePaymentRequiredHeader(paymentRequiredHdr) as any;
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

    const mapping = miner.signal_mapping;
    if (mapping) {
      const conf = getNestedField(data, mapping.confidence_field);
      if (typeof conf === 'number') receipt.extractedConfidence = conf;
      else if (typeof conf === 'string') receipt.extractedConfidence = parseFloat(conf);

      receipt.extractedLabel = getNestedField(data, mapping.label_field);
      receipt.extractedReason = getNestedField(data, mapping.reason_field);
    }

    if (receipt.extractedConfidence === undefined) {
      const c = data?.confidence ?? data?.result?.confidence ?? data?.signal?.confidence;
      if (typeof c === 'number') receipt.extractedConfidence = c;
    }
    if (!receipt.extractedLabel) {
      receipt.extractedLabel = data?.label ?? data?.state ?? data?.result?.state ?? data?.status;
    }
    if (!receipt.extractedReason) {
      receipt.extractedReason =
        data?.reason ?? data?.explanation ?? data?.result?.evidence ?? data?.message;
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
}

export async function askEngine(query: string): Promise<MinerReceipt> {
  const config = getTelegraphConfig();
  const fetchWithPayment = await getPaymentAwareFetch();
  const url = `${config.engineUrl}/v1/ask`;

  const startTime = Date.now();
  const receipt: MinerReceipt = {
    minerId: 'engine-auto-router',
    minerName: 'Telegraph Engine Router',
    slug: 'engine-ask',
    intent: 'AUTO_ROUTER',
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    receipt.latencyMs = Date.now() - startTime;
    const paymentResponseHdr = response.headers.get('payment-response');
    const paymentRequiredHdr = response.headers.get('payment-required');
    const requestId = response.headers.get('x-request-id');

    if (requestId) {
      receipt.explorerRequestId = requestId;
    }

    if (paymentResponseHdr) {
      receipt.paid = true;
      const decoded = parsePaymentResponseHeader(paymentResponseHdr) as any;
      const txHash = decoded?.transactionHash || decoded?.txHash || requestId;
      if (txHash) {
        receipt.explorerRequestId = txHash;
      }
      receipt.paymentDetails = {
        txHash,
        network: decoded?.network,
      };
    }

    if (response.status === 402) {
      receipt.status = 'PAYMENT_REQUIRED';
      const challenge = parsePaymentRequiredHeader(paymentRequiredHdr) as any;
      const body = await response.json().catch(() => null);
      receipt.rawResponse = body || challenge;
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
    receipt.extractedConfidence = data?.confidence;
    receipt.extractedLabel = data?.label || data?.status;
    receipt.extractedReason = data?.answer || data?.reason || data?.summary;

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
