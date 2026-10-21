import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'cyber' | 'quantum' | 'danger' | 'warning' | 'success';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyber'
}) => {
  const iconColor = {
    cyber: 'text-cyan-400 bg-cyan-950/50 border-cyan-800/40',
    quantum: 'text-purple-400 bg-purple-950/50 border-purple-800/40',
    danger: 'text-red-400 bg-red-950/50 border-red-800/40',
    warning: 'text-amber-400 bg-amber-950/50 border-amber-800/40',
    success: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40'
  }[variant];

  return (
    <div className="cyber-card p-5 transition-all duration-200 hover:translate-y-[-2px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
