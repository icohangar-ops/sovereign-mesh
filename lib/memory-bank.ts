import { MemoryEntity } from './types';

const initialEntities: MemoryEntity[] = [
  {
    id: 'service:workflow-queue',
    category: 'SERVICE',
    name: 'Workflow Queue Baseline',
    attributes: {
      queueDepthTarget: 3,
      retryBudget: 2,
      idempotencyWindowMinutes: 30,
      breakerThreshold: 5,
    },
    trustScore: 0.96,
    historicalAnomalies: 0,
    lastUpdated: '2026-08-28T14:30:00Z',
    verifiedBy: 'agent_procure',
  },
  {
    id: 'model:endpoint-gateway',
    category: 'MODEL',
    name: 'Primary Model Gateway',
    attributes: {
      primaryModel: 'gemini-2.5-flash',
      fallbackModel: 'gemini-2.5-pro',
      maxLatencyMs: 8000,
      cacheTtlMinutes: 15,
    },
    trustScore: 0.9,
    historicalAnomalies: 1,
    lastUpdated: '2026-08-30T09:15:00Z',
    verifiedBy: 'agent_soc_remed',
  },
  {
    id: 'release:prod-gate',
    category: 'RELEASE',
    name: 'Production Release Gate',
    attributes: {
      requiredApprovals: 2,
      maxReleaseRisk: 0.35,
      traceRetentionDays: 365,
      countersignRequired: true,
    },
    trustScore: 0.99,
    historicalAnomalies: 0,
    lastUpdated: '2026-09-01T11:00:00Z',
    verifiedBy: 'agent_adjudicator',
  },
  {
    id: 'audit:trace-baseline',
    category: 'AUDIT',
    name: 'Signed Trace Baseline',
    attributes: {
      ledgerFormat: 'JSON-LD',
      hashAlgorithm: 'SHA-256',
      appendOnly: true,
    },
    trustScore: 1,
    historicalAnomalies: 0,
    lastUpdated: '2026-09-02T23:59:59Z',
    verifiedBy: 'Chief Compliance Officer',
  },
];

class MemoryBankStore {
  private entities: Map<string, MemoryEntity>;

  constructor() {
    this.entities = new Map();
    for (const entity of initialEntities) {
      this.entities.set(entity.id, entity);
    }
  }

  public getAll(): MemoryEntity[] {
    return Array.from(this.entities.values());
  }

  public getById(id: string): MemoryEntity | undefined {
    return this.entities.get(id);
  }

  public getByCategory(category: MemoryEntity['category']): MemoryEntity[] {
    return this.getAll().filter((e) => e.category === category);
  }

  public search(query: string): MemoryEntity[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        JSON.stringify(e.attributes).toLowerCase().includes(q)
    );
  }

  public upsert(entity: MemoryEntity): void {
    this.entities.set(entity.id, entity);
  }
}

export const memoryBank = new MemoryBankStore();
