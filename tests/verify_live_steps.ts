import { fetchLiveMiners } from '../lib/telegraph/catalog';
import { askEngine } from '../lib/telegraph/ask';
import { evaluateGatePolicy } from '../lib/gate/policy';
import { getTelegraphConfig } from '../lib/telegraph/config';

async function main() {
  console.log('=== STEP 1: Live Catalog Fetch ===');
  const config = getTelegraphConfig();
  console.log('Telegraph Node URL:', config.nodeUrl);
  console.log('Telegraph Engine URL:', config.engineUrl);

  const miners = await fetchLiveMiners(true);
  console.log(`Success! Fetched ${miners.length} live miners directly from Telegraph node.`);

  const activeMiners = miners.filter(m => m.activation_status === 'active');
  console.log(`Active miners: ${activeMiners.length}`);
  const sampleMiners = activeMiners.slice(0, 5).map(m => ({ id: m.id, name: m.name, intents: m.supported_intents }));
  console.log('Sample live miners:', sampleMiners);

  console.log('\n=== STEP 2: One Unpaid /v1/ask proving 402 renders as WAIT ===');
  const testAddress = '0x111111125421cA6dc452d289314280a0f8842A65';
  console.log(`Sending unpaid Engine ask for target wallet: ${testAddress}`);
  
  const receipt = await askEngine(`Evaluate risk for wallet ${testAddress}`);
  console.log('Receipt status:', receipt.status);
  console.log('Receipt HTTP / error:', receipt.error);
  console.log('Receipt raw response preview:', JSON.stringify(receipt.rawResponse).slice(0, 150));
  console.log('Receipt explorerRequestId:', receipt.explorerRequestId);
  console.log('Receipt explorerMinerUrl:', receipt.explorerMinerUrl);

  const gateResult = evaluateGatePolicy(testAddress, 'Evaluate risk', [receipt]);
  console.log('\n=== Gate Verdict with unpaid 402 ===');
  console.log('Verdict:', gateResult.verdict);
  console.log('Reason:', gateResult.reason);
  console.log('Payment Settled:', gateResult.paymentSettled);

  if (receipt.status === 'PAYMENT_REQUIRED' && gateResult.verdict === 'WAIT' && gateResult.paymentSettled === false) {
    console.log('\n>>> STEP 1 & STEP 2 PASSED: Live catalog fetched & 402 cleanly rendered as WAIT! <<<');
  } else {
    console.error('\n>>> STEP 2 FAILED <<<');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in verify_live_steps:', err);
  process.exit(1);
});
