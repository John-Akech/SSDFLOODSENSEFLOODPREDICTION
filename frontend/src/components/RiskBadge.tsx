import React from 'react';

interface RiskBadgeProps {
  level?: 'low' | 'medium' | 'high' | 'critical';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  className?: string;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, severity, className = '' }) => {
  // Support both 'level' and 'severity' props for backward compatibility
  const riskLevel = level || severity || 'low';
  
  const config = {
    low: { style: 'risk-badge risk-low', label: 'Low Risk' },
    medium: { style: 'risk-badge risk-medium', label: 'Medium Risk' },
    high: { style: 'risk-badge risk-high', label: 'High Risk' },
    critical: { style: 'risk-badge risk-critical', label: 'Critical Risk' }
  };

  const { style, label } = config[riskLevel];

  return (
    <span className={`${style} ${className}`} role="status" aria-label={`Risk level: ${riskLevel}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        riskLevel === 'low' ? 'bg-emerald-600' :
        riskLevel === 'medium' ? 'bg-amber-600' :
        riskLevel === 'high' ? 'bg-orange-600' : 'bg-red-600'
      }`} />
      {label}
    </span>
  );
};

export default RiskBadge;
