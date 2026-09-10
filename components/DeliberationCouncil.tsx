'use client';

import React from 'react';
import {
  SignedDecisionLock,
  RebacCheckResult,
  EnterpriseScenario,
} from '@/lib/types';
import {
  Sparkles,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Scale,
  Crosshair,
  ShoppingCart,
  ShieldAlert,
  Lock,
  Check,
  UserCheck,
  FileText,
} from 'lucide-react';

interface DeliberationCouncilProps {
  currentScenario: EnterpriseScenario;
  onSelectScenario: (scenario: EnterpriseScenario) => void;
  scenarios: EnterpriseScenario[];
  activeLock: SignedDecisionLock | null;
  lastRebac: RebacCheckResult | null;
  onRunDeliberation: () => void;
  onCountersign: () => void;
  isLoading: boolean;
}

export function DeliberationCouncil({
  currentScenario,
  onSelectScenario,
  scenarios,
  activeLock,
  lastRebac,
  onRunDeliberation,
  onCountersign,
  isLoading,
}: DeliberationCouncilProps) {
  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'PROPOSER':
        return <ShoppingCart size={16} className="speaker-proposer" />;
      case 'CHALLENGER':
        return <Crosshair size={16} className="speaker-challenger" />;
      case 'ADJUDICATOR':
        return <Scale size={16} className="speaker-adjudicator" />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className="view-container">
      {/* Enterprise Scenario Quick Selector */}
      <div className="scenario-banner">
        <div className="scenario-header">
          <span className="scenario-title">AI Infra Stress Scenarios</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Select a benchmark scenario to observe the control plane under load
          </span>
        </div>

        <div className="scenario-grid">
          {scenarios.map((scen) => (
            <div
              key={scen.id}
              onClick={() => onSelectScenario(scen)}
              className={`scenario-card ${
                currentScenario.id === scen.id ? 'active' : ''
              }`}
            >
              <div className="scenario-badge-row">
                <span
                  className={`tag-badge ${
                    scen.difficulty === 'ATTACK_VECTOR'
                      ? 'tag-attack'
                      : 'tag-standard'
                  }`}
                >
                  {scen.category.replace('_', ' ')}
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Expected: {scen.expectedOutcome}
                </span>
              </div>
              <div className="scenario-name">{scen.name}</div>
              <div className="scenario-desc">{scen.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Arena Layout */}
      <div className="arena-grid">
        {/* Left Column: Action Proposal & Interceptor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action Card */}
          <div className="panel-card">
            <div className="panel-header">
              <span className="panel-title">
                <ShoppingCart size={16} /> Initiating Agent Action
              </span>
              <span className="tag-badge tag-standard">
                {currentScenario.initiatingAgentId}
              </span>
            </div>

            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                  TARGET RESOURCE & PERMISSION
                </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                {currentScenario.proposedAction.resource} : {currentScenario.proposedAction.permission}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                PAYLOAD ARGUMENTS
              </div>
              <div className="code-block" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                {JSON.stringify(currentScenario.proposedAction.parameters, null, 2)}
              </div>
            </div>

            <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                  RAW REQUEST TEXT
                </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-surface-elevated)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{currentScenario.simulatedPayload}&rdquo;
              </div>
            </div>

            <button
              onClick={onRunDeliberation}
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {isLoading ? (
                <>Deliberating across Fleet...</>
              ) : (
                <>
                  <Sparkles size={16} /> Execute Consensus Council
                </>
              )}
            </button>
          </div>

          {/* Model Armor & ReBAC Gate Preview */}
          {lastRebac && (
            <div className="panel-card">
              <div className="panel-header">
                <span className="panel-title">
                  <ShieldAlert size={14} /> Policy Gate & Model Armor
                </span>
                <span
                  className={`lock-status-badge ${
                    lastRebac.decision === 'ALLOW'
                      ? 'badge-locked'
                      : lastRebac.decision === 'DENY'
                      ? 'badge-rejected'
                      : 'badge-countersign'
                  }`}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  {lastRebac.decision}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {lastRebac.reason}
              </p>
              {lastRebac.armorCheck.flags.length > 0 && (
                <div style={{ color: 'var(--accent-rose)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  ⚠️ {lastRebac.armorCheck.flags.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Deliberation Rounds & Decision Lock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeLock ? (
            <>
              {/* Decision Lock Status Banner */}
              <div
                className={`decision-lock-banner ${
                  activeLock.status === 'LOCKED'
                    ? 'locked'
                    : activeLock.status === 'REJECTED'
                    ? 'rejected'
                    : 'countersign'
                }`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ADJUDICATOR VERDICT
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeLock.title}
                    </div>
                  </div>
                  <span
                    className={`lock-status-badge ${
                      activeLock.status === 'LOCKED'
                        ? 'badge-locked'
                        : activeLock.status === 'REJECTED'
                        ? 'badge-rejected'
                        : 'badge-countersign'
                    }`}
                  >
                    {activeLock.status === 'LOCKED' && <Check size={14} />}
                    {activeLock.status === 'REJECTED' && <ShieldX size={14} />}
                    {activeLock.status === 'COUNTERSIGN_REQUIRED' && <AlertTriangle size={14} />}
                    {activeLock.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: '4px 0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Consensus Confidence ($R_0$):{' '}
                    <strong
                      style={{
                        color:
                          activeLock.r0Score >= 0.85
                            ? 'var(--accent-emerald)'
                            : 'var(--accent-amber)',
                      }}
                    >
                      {activeLock.r0Score}
                    </strong>{' '}
                    / 1.00 (Floor: 0.85)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</div>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                    SHA-256: {activeLock.signatureHash.slice(0, 16)}...
                  </div>
                </div>

                {activeLock.status === 'COUNTERSIGN_REQUIRED' && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '10px 14px',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Human Security Gate Required:</strong> Review anomaly evidence before authorizing funds release.
                    </div>
                    <button
                      onClick={onCountersign}
                      className="btn-primary"
                      style={{
                        background: 'var(--accent-amber)',
                        color: '#000',
                        padding: '6px 14px',
                        fontSize: '12px',
                      }}
                    >
                      <UserCheck size={14} /> Human Countersign & Authorize
                    </button>
                  </div>
                )}
              </div>

              {/* Debate Rounds Timeline */}
              <div className="panel-card">
                <div className="panel-header">
                  <span className="panel-title">
                    <Scale size={16} /> Deliberation Timeline (CHP v1.0)
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    3 AGENTS PARTICIPATING
                  </span>
                </div>

                <div className="rounds-timeline">
                  {activeLock.rounds.map((round) => (
                    <div
                      key={round.roundNumber}
                      className={`round-card ${
                        round.speaker === 'PROPOSER'
                          ? 'proposer'
                          : round.speaker === 'CHALLENGER'
                          ? 'challenger'
                          : 'adjudicator'
                      }`}
                    >
                      <div className="round-meta">
                        <div className="round-speaker">
                          {getSpeakerIcon(round.speaker)}
                          <span
                            className={
                              round.speaker === 'PROPOSER'
                                ? 'speaker-proposer'
                                : round.speaker === 'CHALLENGER'
                                ? 'speaker-challenger'
                                : 'speaker-adjudicator'
                            }
                          >
                            Round {round.roundNumber}: {round.agentName}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Score: {Math.round(round.confidenceScore * 100)}%
                        </span>
                      </div>

                      <div className="round-body">{round.content}</div>

                      {round.evidenceCitations.length > 0 && (
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                            EVIDENCE & MEMORY CITATIONS:
                          </div>
                          <div className="citation-list">
                            {round.evidenceCitations.map((cite, i) => (
                              <span key={i} className="citation-tag">
                                {cite}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div
              className="panel-card"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <Lock size={36} style={{ color: 'var(--accent-cyan)' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Consensus Hardening Protocol Standby
              </div>
              <p style={{ maxWidth: '440px', fontSize: '12px' }}>
                Select a scenario on the left and click <strong>Execute Consensus Council</strong> to trigger multi-agent challenge rounds and view the verified decision lock.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
