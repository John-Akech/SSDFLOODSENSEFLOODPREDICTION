import React from 'react';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const config = {
    low: { style: 'risk-badge risk-low', label: 'Low Risk' },
    medium: { style: 'risk-badge risk-medium', label: 'Medium Risk' },
    high: { style: 'risk-badge risk-high', label: 'High Risk' },
    critical: { style: 'risk-badge risk-critical', label: 'Critical Risk' }
  };

  const { style, label } = config[level];

  return (
    <span className={`${style} ${className}`} role="status" aria-label={`Risk level: ${level}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        level === 'low' ? 'bg-emerald-600' :
        level === 'medium' ? 'bg-amber-600' :
        level === 'high' ? 'bg-orange-600' : 'bg-red-600'
      }`} />
      {label}
    </span>
  );
};

export default RiskBadge;
