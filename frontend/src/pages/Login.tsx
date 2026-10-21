import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Atom, 
  Cpu, 
  Link2, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { AuthUser } from '../types';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('analyst');
  const [password, setPassword] = useState<string>('analyst123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await api.login(username.trim(), password);
      onLoginSuccess({
        username: data.username,
        role: data.role
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#070B12] text-gray-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background Decorative Cyber Grids & Glow Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#070B12] to-black pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 shadow-lg shadow-cyan-950/50 mb-4 quantum-glow">
            <Atom className="w-8 h-8 text-cyan-400 animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white uppercase flex items-center justify-center gap-2">
            <span>Aegis-Q</span>
            <span className="text-cyan-400">Sentinel</span>
          </h1>
          <p className="text-xs font-mono text-cyan-400/80 mt-1 uppercase tracking-widest">
            Security Operations Center Gateway
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            Hybrid ML-QML DDoS Detection, Automated Defense and Immutable Blockchain Registry
          </p>
        </div>

        {/* Cyber Card Box */}
        <div className="cyber-card p-7 border-cyan-900/60 bg-gray-950/80 shadow-2xl relative rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Analyst Authentication
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 font-semibold">
              JWT SHA-256
            </span>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
                SOC Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. analyst"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-900/90 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick-Fill Presets for Evaluation */}
            <div className="pt-1">
              <span className="text-[11px] text-gray-400 font-medium block mb-2">
                Quick-Select Authorized Credentials:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('analyst', 'analyst123')}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition flex items-center justify-between ${
                    username === 'analyst'
                      ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-300'
                      : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-bold text-white text-[11px]">Analyst</p>
                    <p className="font-mono text-[10px] text-gray-500">analyst123</p>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'admin123')}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition flex items-center justify-between ${
                    username === 'admin'
                      ? 'border-purple-500/80 bg-purple-950/40 text-purple-300'
                      : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-bold text-white text-[11px]">Admin</p>
                    <p className="font-mono text-[10px] text-gray-500">admin123</p>
                  </div>
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-2.5 px-4 rounded-xl font-bold text-sm tracking-wider uppercase text-gray-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Access Defense Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Features List */}
          <div className="mt-6 pt-5 border-t border-gray-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/60">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 font-mono">XGBoost ML</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/60">
              <Atom className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 font-mono">Qiskit QML</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800/60">
              <Link2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 font-mono">EVM Ledger</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-gray-500 mt-6 font-mono">
          Strict Zero-Trust Access • RFC 8785 Canonical JSON • Immutable Audit Log
        </p>
      </div>
    </div>
  );
};
