'use client';

import React from 'react';
import { RuntimeAssessment, EnterpriseScenario } from '@/lib/types';
import {
  Activity,
  AlertTriangle,
  CircuitBoard,
  Layers,
  RefreshCw,
  ShieldCheck,
  Timer,
  Zap,
} from 'lucide-react';

interface RuntimeControlProps {
  currentScenario: EnterpriseScenario;
  assessment: RuntimeAssessment | null;
  onRunProbe: () => void;
  isLoading: boolean;
}

export function RuntimeControl({ currentScenario, assessment, onRunProbe, isLoading }: RuntimeControlProps) {
  return (
    <div className="view-container">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <CircuitBoard size={16} /> Runtime Resilience Layer
          </h2>
          <p className="brand-subtitle">
            Retry budgets, circuit breakers, idempotency, and signed traces for production AI workflows
          </p>
        </div>
        <span className="status-badge">
          <Activity size={14} /> {assessment ? assessment.mode : 'PROBE READY'}
        </span>
      </div>

      <div className="arena-grid">
        <div className="panel-card">
          <div className="panel-header">
            <span className="panel-title">
              <Layers size={14} /> Current Scenario
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{currentScenario.name}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentScenario.description}</p>

          <div className="code-block" style={{ marginTop: '12px', fontSize: '11px' }}>
            <div><strong>Resource:</strong> {currentScenario.proposedAction.resource}</div>
            <div><strong>Permission:</strong> {currentScenario.proposedAction.permission}</div>
            <div><strong>Expected:</strong> {currentScenario.expectedOutcome}</div>
          </div>

          <button onClick={onRunProbe} disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
            {isLoading ? (
              <>Measuring runtime...</>
            ) : (
              <>
                <RefreshCw size={14} /> Run resilience probe
              </>
            )}
          </button>
        </div>

        {assessment ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={`decision-lock-banner ${assessment.mode === 'FAIL_CLOSED' ? 'rejected' : assessment.mode === 'DEGRADED' ? 'countersign' : 'locked'}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    RESILIENCE STATE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {assessment.note}
                  </div>
                </div>
                <span className={`lock-status-badge ${assessment.mode === 'FAIL_CLOSED' ? 'badge-rejected' : assessment.mode === 'DEGRADED' ? 'badge-countersign' : 'badge-locked'}`}>
                  {assessment.mode === 'FAIL_CLOSED' && <AlertTriangle size={14} />}
                  {assessment.mode !== 'FAIL_CLOSED' && <ShieldCheck size={14} />}
                  {assessment.mode}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <strong>Breaker</strong>
                  <div>{assessment.breakerState}</div>
                </div>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <strong>Retries</strong>
                  <div>{assessment.retries}</div>
                </div>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <strong>Risk</strong>
                  <div>{assessment.riskScore}</div>
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <span className="panel-title">
                  <Zap size={14} /> Runtime Budget Snapshot
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ID: {assessment.id}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Queue depth</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{assessment.queueDepth}</div>
                </div>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>P95 latency</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{assessment.p95LatencyMs} ms</div>
                </div>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Error budget</div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{assessment.errorBudgetRemaining}%</div>
                </div>
                <div className="code-block" style={{ fontSize: '11px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Idempotency key</div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{assessment.idempotencyKey}</div>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                  TOOL HEALTH
                </div>
                <div className="citation-list">
                  {assessment.toolHealth.map((tool) => (
                    <span key={tool.name} className="citation-tag">
                      {tool.name} · {tool.status} · {tool.attempts} attempt{tool.attempts === 1 ? '' : 's'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <span className="panel-title">
                  <Timer size={14} /> Trace Spine
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {assessment.modelEndpoint}
                </span>
              </div>

              <div className="rounds-timeline" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {assessment.trace.map((step) => (
                  <div key={step.stage} className="round-card adjudicator">
                    <div className="round-meta">
                      <span className="round-speaker">{step.stage}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {step.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{step.detail}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong>Source:</strong> runtime probe · <strong>Probe target:</strong> {assessment.title}
              </div>
            </div>
          </div>
        ) : (
          <div className="panel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Run a resilience probe to see retries, breaker state, and ledger commit behavior.
          </div>
        )}
      </div>
    </div>
  );
}
