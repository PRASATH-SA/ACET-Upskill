import React from 'react';
import { Shield, AlertTriangle, User as UserIcon, RefreshCw, LogOut } from 'lucide-react';
import { PolicyConfig } from '../types';

interface NavbarProps {
  pageTitle: string;
  policyConfig?: PolicyConfig;
  onEmergencyToggle: () => void;
  onRefresh: () => void;
  username?: string;
  role?: string;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  pageTitle,
  policyConfig,
  onEmergencyToggle,
  onRefresh,
  username = 'analyst',
  role = 'analyst',
  onLogout
}) => {
  const isEmergency = policyConfig?.emergency_disabled ?? false;
  const policyMode = policyConfig?.policy_mode ?? 'MONITOR_ONLY';

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-semibold text-white tracking-wide">{pageTitle}</h2>
      </div>

      {/* Center & Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Policy Mode Chip */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400">Policy:</span>
          <span className="font-semibold text-cyan-300 font-mono">{policyMode}</span>
        </div>

        {/* Emergency Killswitch */}
        <button
          onClick={onEmergencyToggle}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            isEmergency
              ? 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'
              : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-red-900/60 hover:text-red-400'
          }`}
          title="Emergency killswitch disables all mitigations immediately"
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${isEmergency ? 'text-red-400' : 'text-gray-400'}`} />
          <span>{isEmergency ? 'KILLSWITCH ACTIVE' : 'Killswitch'}</span>
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition"
          title="Refresh dashboard data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-gray-800">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${
              role === 'admin' 
                ? 'bg-purple-950/80 border-purple-800 text-purple-400' 
                : 'bg-cyan-950/80 border-cyan-800 text-cyan-400'
            }`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white leading-tight capitalize">{username}</p>
              <p className="text-[10px] text-cyan-400 font-mono uppercase">
                {role === 'admin' ? 'SOC Admin' : 'SOC Analyst'}
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-950/40 hover:border-red-900/50 transition flex items-center space-x-1"
              title="Sign out of SOC Dashboard"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

