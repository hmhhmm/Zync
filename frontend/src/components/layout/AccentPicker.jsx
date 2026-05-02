const ACCENTS = [
  { key: 'purple', label: 'Purple', dot: '#a78bfa' },
  { key: 'teal',   label: 'Teal',   dot: '#14b8a6' },
  { key: 'amber',  label: 'Amber',  dot: '#f59e0b' },
];

function getStored() {
  return localStorage.getItem('zync-accent') ?? 'purple';
}

function apply(key) {
  document.documentElement.dataset.accent = key;
  localStorage.setItem('zync-accent', key);
}

// Apply on module load so the choice persists across refreshes
apply(getStored());

import { useState } from 'react';

export default function AccentPicker() {
  const [active, setActive] = useState(getStored);

  const pick = (key) => {
    apply(key);
    setActive(key);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 6px', borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--icon-btn-bg)' }}>
      {ACCENTS.map(({ key, label, dot }) => (
        <button
          key={key}
          title={label}
          onClick={() => pick(key)}
          style={{
            width: 16, height: 16, borderRadius: '50%', border: 'none',
            background: dot, cursor: 'pointer', flexShrink: 0,
            outline: active === key ? `2px solid ${dot}` : '2px solid transparent',
            outlineOffset: 2,
            transition: 'outline-color 0.15s ease, transform 0.15s ease',
            transform: active === key ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );
}
