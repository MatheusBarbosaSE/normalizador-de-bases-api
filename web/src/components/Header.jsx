import React from 'react';

const Header = () => {
  return (
    <div
      className="flex items-center gap-3 px-4 shrink-0"
      style={{
        height: 42,
        background: "var(--color-chrome)",
        borderBottom: "1px solid var(--color-chrome-border)",
      }}
    >
      <div className="flex items-center gap-2 mr-2">
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 22, height: 22, background: "var(--color-accent)" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" fill="white" opacity="0.9" />
            <rect x="7" y="1" width="4" height="4" fill="white" opacity="0.6" />
            <rect x="1" y="7" width="4" height="4" fill="white" opacity="0.6" />
            <rect x="7" y="7" width="4" height="4" fill="white" opacity="0.9" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-text-chrome)" }}>
          Normalizador API
        </span>
      </div>
    </div>
  );
};

export default Header;
