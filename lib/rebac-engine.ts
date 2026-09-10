import { inspectModelArmor } from './model-armor';
import { RebacCheckResult, RebacTuple, EnterpriseAgent } from './types';

// Default Fleet Agents
export const initialFleetAgents: EnterpriseAgent[] = [
  {
    id: 'agent_procure',
    name: 'Workflow Orchestrator',
    role: 'procurement',
    description: 'Coordinates multi-step workflow fanout, queue discipline, and retry-safe execution paths',
    capabilities: ['runtime:enqueue_workflow', 'runtime:budget_retries', 'runtime:commit_trace'],
    riskTier: 'HIGH',
    status: 'ACTIVE',
    assignedModel: 'gemini-2.5-flash',
    totalExecutions: 142,
    policyViolations: 0,
    avatarIcon: 'ShoppingCart',
  },
  {
    id: 'agent_soc_remed',
    name: 'Runtime Reliability SRE',
    role: 'soc_remediation',
    description: 'Monitors model endpoints, breaker state, and release safety across the control plane',
    capabilities: ['runtime:read_telemetry', 'runtime:open_breaker', 'runtime:quarantine_job', 'runtime:freeze_release'],
    riskTier: 'CRITICAL',
    status: 'ACTIVE',
    assignedModel: 'gemini-2.5-flash',
    totalExecutions: 89,
    policyViolations: 1,
    avatarIcon: 'ShieldAlert',
  },
  {
    id: 'agent_erp_ledger',
    name: 'Trace Ledger Auditor',
    role: 'erp_ledger',
    description: 'Signs trace records, verifies idempotent commit history, and archives decision evidence',
    capabilities: ['ledger:read_trace', 'ledger:verify_hash_chain', 'ledger:append_certificate'],
    riskTier: 'MEDIUM',
    status: 'ACTIVE',
    assignedModel: 'gemini-2.5-flash',
    totalExecutions: 310,
    policyViolations: 0,
    avatarIcon: 'Receipt',
  },
  {
    id: 'agent_challenger',
    name: 'Adversarial Council Challenger (CHP)',
    role: 'challenger',
    description: 'Red-teams and challenges high-risk agent proposals with Memory Bank evidence',
    capabilities: ['chp:audit_proposal', 'chp:query_memory_bank', 'chp:raise_challenge'],
    riskTier: 'HIGH',
    status: 'ACTIVE',
    assignedModel: 'gemini-2.5-pro',
    totalExecutions: 67,
    policyViolations: 0,
    avatarIcon: 'Crosshair',
  },
  {
    id: 'agent_adjudicator',
    name: 'Sovereign Adjudicator & Cryptographic Notary',
    role: 'adjudicator',
    description: 'Calculates R0 consensus scores, enforces domain score floors, and signs immutable locks',
    capabilities: ['chp:score_r0', 'chp:sign_decision_lock', 'chp:request_countersign'],
    riskTier: 'CRITICAL',
    status: 'ACTIVE',
    assignedModel: 'gemini-2.5-pro',
    totalExecutions: 67,
    policyViolations: 0,
    avatarIcon: 'Scale',
  },
];

// In-Memory SpiceDB / Zanzibar Relationship Tuples
const initialTuples: RebacTuple[] = [
  // Workflow orchestrator relations
  { resource: 'runtime:workflow_queue', relation: 'viewer', subject: 'agent_procure' },
  { resource: 'runtime:workflow_queue', relation: 'executor', subject: 'agent_procure' },
  { resource: 'ledger:trace_store', relation: 'editor', subject: 'agent_procure' },

  // Reliability SRE relations
  { resource: 'model:endpoint', relation: 'viewer', subject: 'agent_soc_remed' },
  { resource: 'model:endpoint', relation: 'editor', subject: 'agent_soc_remed' },
  { resource: 'release:deployment_gate', relation: 'executor', subject: 'agent_soc_remed' },

  // Ledger auditor relations
  { resource: 'ledger:trace_store', relation: 'viewer', subject: 'agent_erp_ledger' },
  { resource: 'ledger:trace_store', relation: 'editor', subject: 'agent_erp_ledger' },
];

export class RebacEngine {
  private tuples: RebacTuple[];

  constructor() {
    this.tuples = [...initialTuples];
  }

  public getTuples(): RebacTuple[] {
    return [...this.tuples];
  }

  public addTuple(tuple: RebacTuple): void {
    this.tuples.push(tuple);
  }

  /**
   * Evaluates a permission request against the Zanzibar relationship graph + Model Armor.
   */
  public evaluate(
    agentId: string,
    resource: string,
    permission: string,
    payload: Record<string, unknown>
  ): RebacCheckResult {
    const evaluatedAt = new Date().toISOString();

    // 1. Run Model Armor Inspection first
    const armorCheck = inspectModelArmor(payload);

    if (!armorCheck.passed) {
      return {
        allowed: false,
        decision: 'DENY',
        agentId,
        resource,
        permission,
        requiredRelations: ['authorized_caller'],
        matchingRelations: [],
        reason: `Model Armor violation: ${armorCheck.flags.join(', ')}`,
        evaluatedAt,
        armorCheck: {
          passed: false,
          flags: armorCheck.flags,
          riskScore: armorCheck.riskScore,
        },
      };
    }

    // 2. Check relationship graph
    const matchingTuples = this.tuples.filter(
      (t) => t.subject === agentId && t.resource === resource
    );
    const matchingRelations = matchingTuples.map((t) => t.relation);

    // Map permission to required relation
    let requiredRelation = 'viewer';
    if (permission === 'edit' || permission === 'write') requiredRelation = 'editor';
    if (permission === 'execute' || permission === 'mutate') requiredRelation = 'executor';

    const hasRelation =
      matchingRelations.includes(requiredRelation) ||
      (requiredRelation === 'viewer' &&
        (matchingRelations.includes('editor') || matchingRelations.includes('executor')));

    if (!hasRelation) {
      return {
        allowed: false,
        decision: 'DENY',
        agentId,
        resource,
        permission,
        requiredRelations: [requiredRelation],
        matchingRelations,
        reason: `Zero-Trust ReBAC check failed: Agent ${agentId} lacks required '${requiredRelation}' relation on '${resource}'.`,
        evaluatedAt,
        armorCheck: {
          passed: true,
          flags: [],
          riskScore: armorCheck.riskScore,
        },
      };
    }

    // 3. Check High-Stakes Gating Policies (e.g. spend > 5000 or IAM changes)
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
    const isFinancialHighStakes = typeof requestCostUSD === 'number' && requestCostUSD > 5000;
    const isDeployHighStakes =
      resource.includes('deployment') ||
      resource.includes('endpoint') ||
      payload.deployStage === 'prod' ||
      payload.releaseStage === 'prod' ||
      payload.forceDeploy === true;
    const isNewIntegration =
      typeof integrationAgeDays === 'number' && integrationAgeDays < 14;

    if (isFinancialHighStakes || isDeployHighStakes || isNewIntegration) {
      const reasons: string[] = [];
      if (isFinancialHighStakes) reasons.push(`Request cost ($${requestCostUSD}) exceeds auto-clearance threshold ($5,000)`);
      if (isDeployHighStakes) reasons.push(`Deployment or endpoint promotion requires a consensus gate`);
      if (isNewIntegration) reasons.push(`New integration created ${integrationAgeDays} days ago`);

      return {
        allowed: false,
        decision: 'GATED_FOR_CONSENSUS',
        agentId,
        resource,
        permission,
        requiredRelations: [requiredRelation, 'council_auditor'],
        matchingRelations,
        reason: `High-Stakes Gating Triggered: ${reasons.join('; ')}. Escalating to Adversarial CHP Council.`,
        evaluatedAt,
        armorCheck: {
          passed: true,
          flags: armorCheck.flags,
          riskScore: armorCheck.riskScore,
        },
      };
    }

    // Direct Allow
    return {
      allowed: true,
      decision: 'ALLOW',
      agentId,
      resource,
      permission,
      requiredRelations: [requiredRelation],
      matchingRelations,
      reason: `ReBAC check passed: ${agentId} holds '${requiredRelation}' on '${resource}'. Action is within autonomous safety bounds.`,
      evaluatedAt,
      armorCheck: {
        passed: true,
        flags: [],
        riskScore: armorCheck.riskScore,
      },
    };
  }
}

export const rebacEngine = new RebacEngine();
