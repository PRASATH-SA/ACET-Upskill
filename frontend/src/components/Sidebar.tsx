import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Search, 
  UserCheck, 
  Lock, 
  Link2, 
  Cpu, 
  Atom
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingReviewsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewsCount
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: ShieldAlert },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'investigation', label: 'Incident Investigation', icon: Search },
    { 
      id: 'verification', 
      label: 'Human Verification', 
      icon: UserCheck, 
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : undefined 
    },
    { id: 'protection', label: 'Protection Center', icon: Lock },
    { id: 'blockchain', label: 'Blockchain Explorer', icon: Link2 },
    { id: 'models', label: 'Model Evaluation', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-800 flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
          <Atom className="w-6 h-6 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">Aegis-Q Defense</h1>
          <p className="text-[10px] text-cyan-400 font-mono tracking-tight">ML · QML · EVM Sentinel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-850/60 shadow-sm shadow-cyan-950/80'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/40 text-[11px] text-gray-500 space-y-1">
        <div className="flex items-center justify-between font-mono">
          <span>QML Sim:</span>
          <span className="text-purple-400 font-semibold">Qiskit Active</span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span>Ledger:</span>
          <span className="text-cyan-400 font-semibold">EVM Anchored</span>
        </div>
      </div>
    </aside>
  );
};
