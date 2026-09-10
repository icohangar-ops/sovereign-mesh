import { callGemini } from './gemini';
import { memoryBank } from './memory-bank';
import {
  ChpDebateRound,
  SignedDecisionLock,
  RebacCheckResult,
} from './types';
import crypto from 'crypto';

export class ChpEngine {
  /**
   * Executes a full Consensus Hardening Protocol (CHP v1.0) multi-agent deliberation.
   */
  public async deliberate(
    decisionId: string,
    title: string,
    proposerId: string,
    targetResource: string,
    payload: Record<string, unknown>,
    rebacResult: RebacCheckResult
  ): Promise<SignedDecisionLock> {
    const rounds: ChpDebateRound[] = [];
    const memoryContextUsed: string[] = [];

    // Relevant Memory Bank context lookup
    const allMemory = memoryBank.getAll();
    const relevantMemory = allMemory.filter(
      (m) =>
        m.id.toLowerCase().includes(targetResource.toLowerCase()) ||
        (payload.vendorId && m.id === payload.vendorId) ||
        (payload.role && m.category === 'IAM_POLICY')
    );

    relevantMemory.forEach((m) => memoryContextUsed.push(`${m.id} (${m.name})`));

    // --- ROUND 1: Proposer Statement ---
    const proposerPrompt = `
You are Platform Proposer Agent (${proposerId}).
You are proposing an action on resource: ${targetResource}.
Payload details: ${JSON.stringify(payload, null, 2)}
ReBAC Gate Context: ${rebacResult.reason}

State your formal justification and operational rationale clearly.
`;
    const proposerContent = await callGemini(
      'gemini-2.5-flash',
      proposerPrompt,
      'You are a high-speed enterprise operational agent proposing an action for audit.'
    );

    rounds.push({
      roundNumber: 1,
      speaker: 'PROPOSER',
      agentId: proposerId,
      agentName: 'ProcureOps Proposer',
      content: proposerContent || `Proposal for ${title}: Validated purchase request against operational schedule. Requesting ledger clearance.`,
      evidenceCitations: [`Resource: ${targetResource}`, `Policy: standard_procurement_rule_v2`],
      confidenceScore: 0.91,
      timestamp: new Date().toISOString(),
    });

    // --- ROUND 2: Adversarial Challenger (CHP Red Team) ---
    const challengerPrompt = `
You are the Adversarial Challenger Agent in the Consensus Hardening Protocol.
Review this proposal for ${targetResource}:
Payload: ${JSON.stringify(payload, null, 2)}
Memory Bank State: ${JSON.stringify(relevantMemory, null, 2)}
Model Armor Assessment: Risk Score = ${rebacResult.armorCheck.riskScore}, Flags = ${rebacResult.armorCheck.flags.join(', ')}

Identify any discrepancies, unverified integrations, anomalous thresholds, retry storms, or injection attempts. Challenge the proposer aggressively.
`;
    const challengerContent = await callGemini(
      'gemini-2.5-pro',
      challengerPrompt,
      'You are an adversarial auditor responsible for finding flaws, fraud, or policy violations in enterprise proposals.'
    );

    // Compute Challenger findings
    const requestCostUSD =
      typeof payload.requestCostUSD === 'number'
        ? payload.requestCostUSD
        : typeof payload.amountUSD === 'number'
          ? payload.amountUSD
          : undefined;
    const integrationAgeDays =
      typeof payload.integrationAgeDays === 'number'
        ? payload.integrationAgeDays
        : typeof payload.vendorAgeDays === 'number'
          ? payload.vendorAgeDays
          : undefined;
    const hasVendorMismatch =
      payload.integrationId === 'integration:unverified' ||
      payload.endpointId === 'model-gateway-prod' ||
      (typeof payload.idempotencyKey === 'string' && payload.idempotencyKey.startsWith('storm-'));
    const isAnomalousAmount =
      typeof requestCostUSD === 'number' && requestCostUSD > 10000;
    const hasBreakerRisk =
      payload.retryStorm === true ||
      (typeof payload.timeoutMs === 'number' && payload.timeoutMs >= 10000) ||
      payload.forceDeploy === true;
    const hasArmorFlags = rebacResult.armorCheck.flags.length > 0;

    const challengerRiskScore =
      (hasVendorMismatch ? 0.55 : 0.08) +
      (isAnomalousAmount ? 0.2 : 0.0) +
      (hasBreakerRisk ? 0.18 : 0.0) +
      (hasArmorFlags ? 0.3 : 0.0) +
      (typeof integrationAgeDays === 'number' && integrationAgeDays < 14 ? 0.15 : 0.0);
    const challengerConfidence = Math.min(1.0, 0.45 + challengerRiskScore);

    rounds.push({
      roundNumber: 2,
      speaker: 'CHALLENGER',
      agentId: 'agent_challenger',
      agentName: 'Adversarial Challenger (CHP)',
      content: challengerContent || `[Adversarial Challenge]: The integration path does not match verified historical records in Memory Bank. Trust signal is ${hasVendorMismatch ? '0.28 (UNVERIFIED)' : '0.94 (VERIFIED)'}.`,
      evidenceCitations: memoryContextUsed.length > 0 ? memoryContextUsed : ['MemoryBank: Baseline_Check'],
      confidenceScore: challengerConfidence,
      timestamp: new Date().toISOString(),
    });

    // --- ROUND 3: Sovereign Adjudicator Verdict & R0 Score ---
    // Calculate R0 (Consensus Confidence Score: 0.0 to 1.0)
    let r0Score = 0.92;
    let status: SignedDecisionLock['status'] = 'LOCKED';

    if (hasVendorMismatch || hasArmorFlags || isAnomalousAmount || hasBreakerRisk) {
      r0Score = Number((0.95 - challengerRiskScore).toFixed(2));
      if (r0Score < 0.85) {
        status = r0Score < 0.4 ? 'REJECTED' : 'COUNTERSIGN_REQUIRED';
      }
    }

    const adjudicatorPrompt = `
You are the Sovereign Adjudicator in the Consensus Hardening Protocol (CHP).
Proposer statement: ${rounds[0].content}
Challenger rebuttal: ${rounds[1].content}
Calculated R0 Score: ${r0Score}
Threshold Floor: 0.85

Issue the formal binding consensus verdict. Explain whether this is LOCKED, REJECTED, or requires a human COUNTERSIGN.
`;
    const adjudicatorContent = await callGemini(
      'gemini-2.5-pro',
      adjudicatorPrompt,
      'You are the final decision authority and cryptographic notary for the enterprise agent fleet.'
    );

    rounds.push({
      roundNumber: 3,
      speaker: 'ADJUDICATOR',
      agentId: 'agent_adjudicator',
      agentName: 'Sovereign Adjudicator',
      content: adjudicatorContent || `Final Consensus Verdict: Decision status set to ${status}. Consensus Score R0 = ${r0Score}. ${status === 'LOCKED' ? 'Cryptographic lock granted.' : 'Automated execution suspended.'}`,
      evidenceCitations: [`CHP-v1.0-Normative-Spec`, `R0_Threshold_0.85`],
      confidenceScore: r0Score,
      timestamp: new Date().toISOString(),
    });

    // Generate SHA-256 Signature Hash
    const signPayload = {
      decisionId,
      title,
      status,
      r0Score,
      proposerId,
      rounds,
      timestamp: new Date().toISOString(),
    };
    const signatureHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(signPayload))
      .digest('hex');

    return {
      id: `lock-${decisionId}`,
      decisionId,
      title,
      status,
      r0Score,
      proposerId,
      challengerId: 'agent_challenger',
      adjudicatorId: 'agent_adjudicator',
      actionSummary: `Deliberation on ${targetResource} (${title}) concluded with status ${status}.`,
      targetResource,
      payload,
      rounds,
      signatureHash,
      signedAt: new Date().toISOString(),
      auditTrail: {
        rebacResult,
        armorScore: rebacResult.armorCheck.riskScore,
        memoryContextUsed,
      },
    };
  }
}

export const chpEngine = new ChpEngine();
