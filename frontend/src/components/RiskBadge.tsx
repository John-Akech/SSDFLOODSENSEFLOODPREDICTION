import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface RiskBadgeProps {
  level?: 'low' | 'medium' | 'high' | 'critical' | 'uncertain';
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'uncertain';
  className?: string;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, severity, className = '' }) => {
  const { t } = useLanguage();
  // Support both 'level' and 'severity' props for backward compatibility
  const riskLevel = level || severity;

  if (!riskLevel) {
    console.error('[RiskBadge] No risk level provided');
    return null;
  }

  const config = {
    low: { style: 'risk-badge risk-low', label: `${t('low')} ${t('riskLevel')}` },
    medium: { style: 'risk-badge risk-medium', label: `${t('medium')} ${t('riskLevel')}` },
    high: { style: 'risk-badge risk-high', label: `${t('high')} ${t('riskLevel')}` },
    critical: { style: 'risk-badge risk-critical', label: `${t('critical')} ${t('riskLevel')}` },
    uncertain: { style: 'risk-badge bg-gray-100 text-gray-700 border-gray-300', label: 'Uncertain' }
  };

  const { style, label } = config[riskLevel];

  return (
    <span className={`${style} ${className}`} role="status" aria-label={`${t('riskLevel')}: ${riskLevel}`}>
      <span className={`w-1.5 h-1.5 rounded-full hidden ${riskLevel === 'low' ? 'bg-emerald-600' :
        riskLevel === 'medium' ? 'bg-amber-600' :
          riskLevel === 'high' ? 'bg-orange-600' :
            riskLevel === 'critical' ? 'bg-red-600' : 'bg-gray-600'
        }`} />
      {label}
    </span>
  );
};

export default RiskBadge;
