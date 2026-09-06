import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { getTelegraphConfig } from './config';

export type PaymentFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let cachedPaymentFetch: PaymentFetch | null = null;
let paymentConfigured = false;
let payingAddress: string | null = null;

export function getPaymentWalletStatus(): {
  isConfigured: boolean;
  address: string | null;
  network: string;
} {
  const config = getTelegraphConfig();
  if (!payingAddress && config.evmPrivateKey) {
    try {
      const key = config.evmPrivateKey.startsWith('0x')
        ? (config.evmPrivateKey as `0x${string}`)
        : (`0x${config.evmPrivateKey}` as `0x${string}`);
      const account = privateKeyToAccount(key);
      payingAddress = account.address;
      paymentConfigured = true;
    } catch {
      paymentConfigured = false;
    }
  }
  return {
    isConfigured: !!payingAddress,
    address: payingAddress,
    network: config.evmNetwork,
  };
}

export async function getPaymentAwareFetch(): Promise<PaymentFetch> {
  if (cachedPaymentFetch) {
    return cachedPaymentFetch;
  }

  const config = getTelegraphConfig();

  if (!config.evmPrivateKey) {
    // Return standard fetch if no key configured
    cachedPaymentFetch = fetch;
    return cachedPaymentFetch;
  }

  try {
    const key = config.evmPrivateKey.startsWith('0x')
      ? (config.evmPrivateKey as `0x${string}`)
      : (`0x${config.evmPrivateKey}` as `0x${string}`);

    const account = privateKeyToAccount(key);
    payingAddress = account.address;
    paymentConfigured = true;

    const evmSigner = toClientEvmSigner(account);
    const client = x402Client.fromConfig({
      schemes: [
        {
          network: config.evmNetwork,
          client: new ExactEvmScheme(evmSigner),
        },
      ],
    });

    cachedPaymentFetch = wrapFetchWithPayment(fetch, client);
    return cachedPaymentFetch;
  } catch (err) {
    console.error('[Signalgate] Failed to initialize x402 payment fetch:', err);
    cachedPaymentFetch = fetch;
    return cachedPaymentFetch;
  }
}

export function parsePaymentRequiredHeader(headerVal: string | null): unknown {
  if (!headerVal) return null;
  try {
    const jsonStr = Buffer.from(headerVal, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function parsePaymentResponseHeader(headerVal: string | null): unknown {
  if (!headerVal) return null;
  try {
    return decodePaymentResponseHeader(headerVal);
  } catch {
    return null;
  }
}
