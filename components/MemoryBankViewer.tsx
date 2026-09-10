'use client';

import React, { useState } from 'react';
import { MemoryEntity } from '@/lib/types';
import {
  Database,
  Search,
  CheckCircle,
  AlertCircle,
  Building,
  ShieldAlert,
  FileText,
} from 'lucide-react';

interface MemoryBankViewerProps {
  entities: MemoryEntity[];
}

export function MemoryBankViewer({ entities }: MemoryBankViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filtered = entities.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(item.attributes).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SERVICE':
        return <Database size={16} className="speaker-proposer" />;
      case 'MODEL':
        return <Building size={16} className="speaker-challenger" />;
      case 'RELEASE':
        return <ShieldAlert size={16} className="speaker-challenger" />;
      case 'AUDIT':
        return <FileText size={16} className="speaker-adjudicator" />;
      default:
        return <FileText size={16} className="speaker-adjudicator" />;
    }
  };

  return (
    <div className="view-container">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            <Database size={16} /> Evidence Bank (Runtime State Store)
          </h2>
          <p className="brand-subtitle">
            Long-term cross-session state, model baselines, and signed audit records
          </p>
        </div>
        <span className="status-badge">
          <Database size={14} /> {entities.length} PERSISTED ENTITIES
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search evidence by service, model, release, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'SERVICE', 'MODEL', 'RELEASE', 'AUDIT'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn-secondary"
              style={{
                background: selectedCategory === cat ? 'var(--bg-surface-hover)' : 'transparent',
                borderColor: selectedCategory === cat ? 'var(--border-highlight)' : 'var(--border-subtle)',
                color: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
        {filtered.map((entity) => (
          <div key={entity.id} className="panel-card">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getCategoryIcon(entity.category)}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{entity.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ID: {entity.id}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: entity.trustScore >= 0.8 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              >
                {entity.trustScore >= 0.8 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                Trust: {Math.round(entity.trustScore * 100)}%
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
                ENTITY ATTRIBUTES
              </div>
              <div className="code-block" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {JSON.stringify(entity.attributes, null, 2)}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '8px',
              }}
            >
              <span>Verified By: <strong style={{ color: 'var(--text-secondary)' }}>{entity.verifiedBy}</strong></span>
              <span>Anomalies: <strong style={{ color: entity.historicalAnomalies > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{entity.historicalAnomalies}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
