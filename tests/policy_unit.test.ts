import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateGatePolicy } from '../lib/gate/policy';
import type { MinerReceipt } from '../lib/telegraph/types';

// Load fixtures behind explicit unit test flag
const fixturePath = path.resolve(process.cwd(), 'fixtures', 'miner_responses.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

describe('Signalgate Fail-Closed Policy Unit Tests', () => {
  const targetWallet = '0x1234567890123456789012345678901234567890';
  const actionText = 'Approve ERC20';

  test('Constraint 1: Zero miners or empty receipts must WAIT', () => {
    const result = evaluateGatePolicy(targetWallet, actionText, []);
    assert.strictEqual(result.verdict, 'WAIT');
    assert.match(result.reason, /No active Telegraph miners/);
    assert.strictEqual(result.paymentSettled, false);
  });

  test('Constraint 7: Unpaid 402 request must FAIL CLOSED with WAIT + Payment Required', () => {
    const receipt: MinerReceipt = {
      minerId: 'engine-ask',
      minerName: 'Telegraph Engine Router',
      slug: 'engine-ask',
      intent: 'AUTO_ROUTER',
      endpoint: '/v1/ask',
      method: 'POST',
      paid: false,
      priceUsdc: 0.01,
      status: 'PAYMENT_REQUIRED',
      latencyMs: 120,
      timestamp: new Date().toISOString(),
      rawResponse: fixtures.engine_402_challenge,
      explorerMinerUrl: 'https://explorer.telegraphprotocol.com/signals',
      explorerRequestId: 'no explorer id',
      error: 'x402 Payment Required',
    };

    const result = evaluateGatePolicy(targetWallet, actionText, [receipt]);
    assert.strictEqual(result.verdict, 'WAIT');
    assert.match(result.reason, /402 Payment Required/);
    assert.strictEqual(result.paymentSettled, false);
  });

  test('Constraint: Malicious flag on risk/fraud miner must BLOCK', () => {
    const receipt1: MinerReceipt = {
      minerId: '1001',
      minerName: 'Veridex',
      slug: 'veridex-contract-risk-miner',
      intent: 'FRAUD_DETECTION',
      endpoint: '/analyze',
      method: 'POST',
      paid: true,
      priceUsdc: 0.01,
      status: 'SUCCESS',
      latencyMs: 240,
      timestamp: new Date().toISOString(),
      rawResponse: fixtures.veridex_malicious,
      extractedConfidence: 0.98,
      extractedLabel: 'malicious',
      extractedReason: 'High risk honeypot logic detected',
      explorerMinerUrl: 'https://explorer.telegraphprotocol.com/miners/1001',
      explorerRequestId: 'tx_0x987654321',
    };

    const receipt2: MinerReceipt = {
      minerId: '10002',
      minerName: 'DegenLens',
      slug: 'degenlens-onchain',
      intent: 'ONCHAIN_TX_LOOKUP',
      endpoint: '/status',
      method: 'POST',
      paid: true,
      priceUsdc: 0.01,
      status: 'SUCCESS',
      latencyMs: 180,
      timestamp: new Date().toISOString(),
      rawResponse: fixtures.degenlens_clean,
      extractedConfidence: 0.88,
      extractedLabel: 'verified',
      extractedReason: 'Clean wallet',
      explorerMinerUrl: 'https://explorer.telegraphprotocol.com/miners/10002',
      explorerRequestId: 'tx_0x123456789',
    };

    const result = evaluateGatePolicy(targetWallet, actionText, [receipt1, receipt2]);
    assert.strictEqual(result.verdict, 'BLOCK');
    assert.match(result.reason, /Blocked: Live miner Veridex flagged critical risk/);
  });

  test('Constraint: Clean responses from 2+ distinct paid miners above threshold must ALLOW', () => {
    const receipt1: MinerReceipt = {
      minerId: '1001',
      minerName: 'Veridex',
      slug: 'veridex-contract-risk-miner',
      intent: 'FRAUD_DETECTION',
      endpoint: '/analyze',
      method: 'POST',
      paid: true,
      priceUsdc: 0.01,
      status: 'SUCCESS',
      latencyMs: 210,
      timestamp: new Date().toISOString(),
      rawResponse: fixtures.veridex_clean,
      extractedConfidence: 0.92,
      extractedLabel: 'safe',
      extractedReason: 'Clean contract',
      explorerMinerUrl: 'https://explorer.telegraphprotocol.com/miners/1001',
      explorerRequestId: 'tx_0x111111111',
    };

    const receipt2: MinerReceipt = {
      minerId: '10002',
      minerName: 'DegenLens',
      slug: 'degenlens-onchain',
      intent: 'ONCHAIN_TX_LOOKUP',
      endpoint: '/status',
      method: 'POST',
      paid: true,
      priceUsdc: 0.01,
      status: 'SUCCESS',
      latencyMs: 190,
      timestamp: new Date().toISOString(),
      rawResponse: fixtures.degenlens_clean,
      extractedConfidence: 0.88,
      extractedLabel: 'verified',
      extractedReason: 'Clean wallet',
      explorerMinerUrl: 'https://explorer.telegraphprotocol.com/miners/10002',
      explorerRequestId: 'tx_0x222222222',
    };

    const result = evaluateGatePolicy(targetWallet, actionText, [receipt1, receipt2]);
    assert.strictEqual(result.verdict, 'ALLOW');
    assert.match(result.reason, /Verified safe by 2 live Telegraph miners/);
    assert.strictEqual(result.paymentSettled, true);
  });

  test('Constraint 10: App source code does not import fixtures/', () => {
    const appDir = path.resolve(process.cwd(), 'app');
    const libDir = path.resolve(process.cwd(), 'lib');

    function checkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(full, 'utf8');
          assert.strictEqual(
            content.includes('fixtures/'),
            false,
            `File ${full} must not import from fixtures/`
          );
        }
      }
    }

    checkDir(appDir);
    checkDir(libDir);
  });
});
