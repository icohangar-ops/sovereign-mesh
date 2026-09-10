import { inspectModelArmor } from './model-armor';
import { RuntimeAssessment, RuntimeTraceStep } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function assessRuntime(decisionId: string, title: string, payload: Record<string, unknown>): RuntimeAssessment {
  const armor = inspectModelArmor(payload);
  const text = JSON.stringify(payload).toLowerCase();

  const requestCost = asNumber(payload.requestCostUSD) ?? asNumber(payload.amountUSD) ?? 0;
  const timeoutMs = asNumber(payload.timeoutMs) ?? 4000;
  const integrationAgeDays = asNumber(payload.integrationAgeDays) ?? asNumber(payload.vendorAgeDays) ?? 999;
  const retryStorm = payload.retryStorm === true || /retry|duplicate|timeout|storm|flaky/.test(text);
  const deployProd = payload.deployStage === 'prod' || payload.releaseStage === 'prod' || payload.forceDeploy === true;

  const riskScore = clamp(
    armor.riskScore * 0.45 +
      (retryStorm ? 0.25 : 0.08) +
      (deployProd ? 0.15 : 0.03) +
      (requestCost > 10000 ? 0.1 : 0.02) +
      (integrationAgeDays < 14 ? 0.1 : 0.01),
    0,
    1,
  );

  const retries = retryStorm ? 3 : requestCost > 5000 ? 2 : 1;
  const breakerState: RuntimeAssessment['breakerState'] = riskScore >= 0.7 ? 'OPEN' : riskScore >= 0.45 ? 'HALF_OPEN' : 'CLOSED';
  const mode: RuntimeAssessment['mode'] = breakerState === 'OPEN' ? 'FAIL_CLOSED' : riskScore >= 0.45 ? 'DEGRADED' : 'STEADY';
  const queueDepth = clamp(Math.round(1 + riskScore * 8 + (retryStorm ? 3 : 0)), 1, 18);
  const p95LatencyMs = Math.round(timeoutMs * 0.65 + riskScore * 2800 + retries * 220);
  const errorBudgetRemaining = clamp(Math.round(100 - riskScore * 72 - (retryStorm ? 10 : 0)), 0, 100);

  const toolHealth = [
    {
      name: 'policy-gate',
      attempts: 1,
      status: armor.passed ? 'PASS' : 'BLOCK',
    },
    {
      name: 'model-endpoint',
      attempts: retries,
      status: breakerState === 'OPEN' ? 'BLOCK' : retries > 1 ? 'RETRY' : 'PASS',
    },
    {
      name: 'trace-ledger',
      attempts: 1,
      status: 'PASS',
    },
  ] as const;

  const trace: RuntimeTraceStep[] = [
    { stage: 'ingress', status: 'PASS', detail: 'Request accepted and normalized.' },
    { stage: 'armor', status: armor.passed ? 'PASS' : 'BLOCK', detail: armor.passed ? 'No policy violations detected.' : `Armor flags: ${armor.flags.join(', ')}` },
    { stage: 'retry-policy', status: retries > 1 ? 'RETRY' : 'PASS', detail: `${retries} attempt${retries === 1 ? '' : 's'} allowed under the current budget.` },
    { stage: 'breaker', status: breakerState === 'OPEN' ? 'OPEN' : breakerState === 'HALF_OPEN' ? 'RETRY' : 'PASS', detail: `Circuit breaker is ${breakerState}.` },
    { stage: 'ledger', status: mode === 'FAIL_CLOSED' ? 'BLOCK' : 'COMMIT', detail: 'Signed trace written to the append-only ledger.' },
  ];

  return {
    id: `runtime-${decisionId}`,
    decisionId,
    title,
    mode,
    breakerState,
    retries,
    queueDepth,
    p95LatencyMs,
    errorBudgetRemaining,
    idempotencyKey: String(payload.idempotencyKey ?? decisionId),
    modelEndpoint: String(payload.endpointId ?? payload.modelEndpoint ?? 'model-gateway-prod'),
    toolHealth: toolHealth.map((item) => ({ name: item.name, attempts: item.attempts, status: item.status })),
    trace,
    riskScore: Number(riskScore.toFixed(2)),
    sanitized: armor.passed,
    note: mode === 'FAIL_CLOSED' ? 'Execution halted to avoid duplicate or unsafe side effects.' : 'Execution is safe to continue with recorded safeguards.',
    createdAt: new Date().toISOString(),
  };
}
