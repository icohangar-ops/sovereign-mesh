export type AgentRole =
  | 'procurement'
  | 'soc_remediation'
  | 'erp_ledger'
  | 'challenger'
  | 'adjudicator';

export interface EnterpriseAgent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  capabilities: string[];
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'DELIBERATING' | 'RESTRICTED' | 'IDLE';
  assignedModel: string;
  totalExecutions: number;
  policyViolations: number;
  avatarIcon: string;
}

export type RebacDecision = 'ALLOW' | 'DENY' | 'GATED_FOR_CONSENSUS';

export interface RebacCheckResult {
  allowed: boolean;
  decision: RebacDecision;
  agentId: string;
  resource: string;
  permission: string;
  requiredRelations: string[];
  matchingRelations: string[];
  reason: string;
  evaluatedAt: string;
  armorCheck: {
    passed: boolean;
    flags: string[];
    riskScore: number;
  };
}

export interface RebacTuple {
  resource: string;
  relation: string;
  subject: string;
}

export interface ChpDebateRound {
  roundNumber: number;
  speaker: 'PROPOSER' | 'CHALLENGER' | 'ADJUDICATOR';
  agentId: string;
  agentName: string;
  content: string;
  evidenceCitations: string[];
  confidenceScore: number;
  timestamp: string;
}

export interface SignedDecisionLock {
  id: string;
  decisionId: string;
  title: string;
  status: 'LOCKED' | 'REJECTED' | 'COUNTERSIGN_REQUIRED';
  r0Score: number;
  proposerId: string;
  challengerId: string;
  adjudicatorId: string;
  actionSummary: string;
  targetResource: string;
  payload: Record<string, unknown>;
  rounds: ChpDebateRound[];
  signatureHash: string;
  signedAt: string;
  auditTrail: {
    rebacResult: RebacCheckResult;
    armorScore: number;
    memoryContextUsed: string[];
  };
}

export interface MemoryEntity {
  id: string;
  category: 'SERVICE' | 'MODEL' | 'RELEASE' | 'AUDIT' | 'VENDOR' | 'IAM_POLICY' | 'TRANSACTION' | 'INCIDENT';
  name: string;
  attributes: Record<string, unknown>;
  trustScore: number;
  historicalAnomalies: number;
  lastUpdated: string;
  verifiedBy: string;
}

export interface EnterpriseScenario {
  id: string;
  name: string;
  category: 'PROCURE_TO_PAY' | 'CLOUD_IAM' | 'SUPPLY_CHAIN' | 'PIPELINE_GUARD' | 'RETRY_STORM' | 'RELEASE_GATING';
  difficulty: 'STANDARD' | 'ATTACK_VECTOR' | 'HIGH_STAKES';
  description: string;
  initiatingAgentId: string;
  proposedAction: {
    tool: string;
    resource: string;
    permission: string;
    parameters: Record<string, unknown>;
  };
  simulatedPayload: string;
  expectedOutcome: 'LOCKED' | 'REJECTED' | 'COUNTERSIGN_REQUIRED';
}

export interface RuntimeTraceStep {
  stage: string;
  status: 'PASS' | 'RETRY' | 'OPEN' | 'COMMIT' | 'BLOCK';
  detail: string;
}

export interface RuntimeAssessment {
  id: string;
  decisionId: string;
  title: string;
  mode: 'STEADY' | 'DEGRADED' | 'FAIL_CLOSED';
  breakerState: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  retries: number;
  queueDepth: number;
  p95LatencyMs: number;
  errorBudgetRemaining: number;
  idempotencyKey: string;
  modelEndpoint: string;
  toolHealth: Array<{ name: string; attempts: number; status: 'PASS' | 'RETRY' | 'BLOCK' }>;
  trace: RuntimeTraceStep[];
  riskScore: number;
  sanitized: boolean;
  note: string;
  createdAt: string;
}
