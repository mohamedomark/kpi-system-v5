import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  BarChart3,
  CheckCircle2,
  Target,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password?: string) => Promise<void>;
  onGuestContinue?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGuestContinue }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Subtle Gradient Blurs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: System Information & Highlights */}
        <div className="md:col-span-6 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure Single Sign-On
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Employee KPI Performance & Management System
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Comprehensive Performance Matrix with real-time score calculations, employee self-appraisals, feedback loops, and goal tracking.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <BarChart3 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">KPI Performance Matrix</h4>
                <p className="text-[11px] text-slate-400">Departmental metrics, weight distribution, and automatic score calculations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <Target className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Goals & Feedback Loops</h4>
                <p className="text-[11px] text-slate-400">Track individual targets, self-appraisals, and manager reviews.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Role-Based Access Control</h4>
                <p className="text-[11px] text-slate-400">Customized views for Employees, Evaluators, Accountants, and Administrators.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Manual Login Form Card */}
        <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-400" />
              Sign In To Account
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your username and password to access the KPI Portal.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {onGuestContinue && (
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={onGuestContinue}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
              >
                Continue as Viewer / Guest Mode
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
