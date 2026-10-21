import React from 'react';
import { RiskLevel, VerificationStatus, MitigationStatus } from '../types';

interface StatusBadgeProps {
  type: 'risk' | 'verification' | 'mitigation';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  let colorClasses = 'bg-gray-800 text-gray-300 border-gray-700';

  if (type === 'risk') {
    switch (value as RiskLevel) {
      case 'CRITICAL':
        colorClasses = 'bg-red-950/70 text-red-400 border-red-800/60 shadow-sm shadow-red-900/50';
        break;
      case 'HIGH':
        colorClasses = 'bg-orange-950/70 text-orange-400 border-orange-800/60';
        break;
      case 'MEDIUM':
        colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-800/60';
        break;
      case 'LOW':
        colorClasses = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
        break;
    }
  } else if (type === 'verification') {
    switch (value as VerificationStatus) {
      case 'HUMAN_CONFIRMED':
        colorClasses = 'bg-purple-950/70 text-purple-300 border-purple-800/60';
        break;
      case 'UNDER_REVIEW':
        colorClasses = 'bg-amber-950/70 text-amber-300 border-amber-800/60 animate-pulse';
        break;
      case 'HUMAN_REJECTED':
        colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
      case 'INCONCLUSIVE':
        colorClasses = 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60';
        break;
      case 'RESOLVED':
        colorClasses = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
        break;
      default:
        colorClasses = 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
        break;
    }
  } else if (type === 'mitigation') {
    switch (value as MitigationStatus) {
      case 'TEMPORARY_BLOCK':
        colorClasses = 'bg-rose-950/70 text-rose-300 border-rose-800/60';
        break;
      case 'RATE_LIMIT':
        colorClasses = 'bg-yellow-950/70 text-yellow-300 border-yellow-800/60';
        break;
      case 'MANUAL_APPROVAL_REQUIRED':
        colorClasses = 'bg-orange-950/70 text-orange-300 border-orange-800/60';
        break;
      case 'ALERT':
        colorClasses = 'bg-blue-950/70 text-blue-300 border-blue-800/60';
        break;
      default:
        colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
};
