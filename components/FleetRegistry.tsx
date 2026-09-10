'use client';

import React from 'react';
import { EnterpriseAgent } from '@/lib/types';
import {
  ShieldAlert,
  ShoppingCart,
  Receipt,
  Crosshair,
  Scale,
  Cpu,
  Lock,
} from 'lucide-react';

interface FleetRegistryProps {
  agents: EnterpriseAgent[];
}

export function FleetRegistry({ agents }: FleetRegistryProps) {
  const getIcon = (role: string) => {
    switch (role) {
      case 'procurement':
        return <ShoppingCart size={18} className="speaker-proposer" />;
      case 'soc_remediation':
        return <ShieldAlert size={18} className="speaker-challenger" />;
      case 'erp_ledger':
        return <Receipt size={18} className="speaker-adjudicator" />;
      case 'challenger':
        return <Crosshair size={18} className="speaker-challenger" />;
      case 'adjudicator':
        return <Scale size={18} className="speaker-adjudicator" />;
      default:
        return <Cpu size={18} />;
    }
  };

  const getRiskBadge = (tier: EnterpriseAgent['riskTier']) => {
    switch (tier) {
      case 'CRITICAL':
        return <span className="tag-badge tag-attack">CRITICAL TIER</span>;
      case 'HIGH':
        return <span className="tag-badge tag-attack">HIGH TIER</span>;
      case 'MEDIUM':
        return <span className="tag-badge" style={{ background: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)' }}>MEDIUM TIER</span>;
      default:
        return <span className="tag-badge tag-standard">LOW TIER</span>;
    }
  };

  return (
    <div className="view-container">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <Lock size={16} /> Agent Mesh Manifest
          </h2>
          <p className="brand-subtitle">
            Authenticated and policy-governed agents under Google Zanzibar Zero-Trust control
          </p>
        </div>
        <span className="status-badge">
          <span className="pulse-dot"></span> {agents.length} AGENTS ONLINE
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
        {agents.map((agent) => (
          <div key={agent.id} className="round-card" style={{ borderLeft: '3px solid var(--border-active)' }}>
            <div className="round-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIcon(agent.role)}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{agent.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ID: {agent.id}
                  </div>
                </div>
              </div>
              {getRiskBadge(agent.riskTier)}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {agent.description}
            </p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                CAPABILITY SCOPES
              </div>
              <div className="citation-list">
                {agent.capabilities.map((cap) => (
                  <span key={cap} className="citation-tag">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} /> Model: <strong style={{ color: 'var(--text-secondary)' }}>{agent.assignedModel}</strong>
              </span>
              <span>Executions: <strong style={{ color: 'var(--text-primary)' }}>{agent.totalExecutions}</strong></span>
              <span>
                Violations: <strong style={{ color: agent.policyViolations > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{agent.policyViolations}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
