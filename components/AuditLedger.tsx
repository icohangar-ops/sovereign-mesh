'use client';

import React, { useState } from 'react';
import { SignedDecisionLock } from '@/lib/types';
import {
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Hash,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

interface AuditLedgerProps {
  locks: SignedDecisionLock[];
}

export function AuditLedger({ locks }: AuditLedgerProps) {
  const [selectedLock, setSelectedLock] = useState<SignedDecisionLock | null>(
    locks.length > 0 ? locks[0] : null
  );

  const downloadCertificate = (lock: SignedDecisionLock) => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(lock, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `agent_control_plane_cert_${lock.id}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="view-container">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <FileCheck size={16} /> Signed Trace Ledger & Certificates
          </h2>
          <p className="brand-subtitle">
            Cryptographically signed consensus records, SHA-256 trace hashes, and verifiable audit chains
          </p>
        </div>
        <span className="status-badge">
          <Hash size={14} /> {locks.length} SIGNED CERTIFICATES
        </span>
      </div>

      <div className="arena-grid">
        {/* Left: Certificate List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {locks.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
              No traces signed yet. Run a scenario in the Consensus Arena.
            </div>
          ) : (
            locks.map((lock) => (
              <div
                key={lock.id}
                onClick={() => setSelectedLock(lock)}
                className={`round-card ${
                  selectedLock?.id === lock.id ? 'active' : ''
                }`}
                style={{
                  cursor: 'pointer',
                  borderLeft: `3px solid ${
                    lock.status === 'LOCKED'
                      ? 'var(--accent-emerald)'
                      : lock.status === 'REJECTED'
                      ? 'var(--accent-rose)'
                      : 'var(--accent-amber)'
                  }`,
                }}
              >
                <div className="round-meta">
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>
                    {lock.title}
                  </span>
                  <span
                    className={`tag-badge ${
                      lock.status === 'LOCKED'
                        ? 'tag-standard'
                        : lock.status === 'REJECTED'
                        ? 'tag-attack'
                        : ''
                    }`}
                    style={
                      lock.status === 'COUNTERSIGN_REQUIRED'
                        ? { background: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.4)' }
                        : {}
                    }
                  >
                    {lock.status}
                  </span>
                </div>

                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  ID: {lock.id} • R0: {lock.r0Score}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Resource: <strong style={{ color: 'var(--text-primary)' }}>{lock.targetResource}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Selected Certificate Detail */}
        {selectedLock ? (
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="panel-title">
                  <FileCode size={16} /> Cryptographic Proof Certificate
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Decision ID: {selectedLock.decisionId}
                </span>
              </div>
              <button
                onClick={() => downloadCertificate(selectedLock)}
                className="btn-secondary"
              >
                <Download size={14} /> Export JSON-LD
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="code-block" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consensus Score (R0):</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: selectedLock.r0Score >= 0.85 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                  {selectedLock.r0Score} / 1.00
                </div>
              </div>
              <div className="code-block" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Adjudicator Status:</span>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  {selectedLock.status}
                </div>
              </div>
              <div className="code-block" style={{ fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Proposing Agent:</span>
                <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {selectedLock.proposerId}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                SHA-256 CRYPTOGRAPHIC SIGNATURE
              </div>
              <div className="code-block" style={{ color: 'var(--accent-amber)', fontSize: '11px' }}>
                {selectedLock.signatureHash}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                AUDIT TRAIL & CITATIONS
              </div>
              <div className="citation-list">
                {selectedLock.auditTrail.memoryContextUsed.map((ctx, i) => (
                  <span key={i} className="citation-tag">
                    {ctx}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                FULL DELIBERATION RECORD
              </div>
              <div className="rounds-timeline" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {selectedLock.rounds.map((round) => (
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
                      <span className="round-speaker">
                        {round.agentName} ({round.speaker})
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Conf: {Math.round(round.confidenceScore * 100)}%
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {round.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="panel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a certificate to view cryptographic details
          </div>
        )}
      </div>
    </div>
  );
}
