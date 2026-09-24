import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle, Vote, Users, Shield, Key, ArrowRight,
  CheckCircle, Loader2, Eye, EyeOff, RefreshCw
} from 'lucide-react';

function LoginPage() {
  const [isStudentLogin, setIsStudentLogin] = useState(true);
  const [formData, setFormData] = useState({ studentId: '', adminId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wakeCountdown, setWakeCountdown] = useState(null); // null = not waking up
  const wakeTimerRef = useRef(null);
  const pendingLoginRef = useRef(null); // stores { id, password } for auto-retry
  const { login } = useAuth();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (wakeTimerRef.current) clearInterval(wakeTimerRef.current);
    };
  }, []);

  const startWakeCountdown = (id, password) => {
    const WAIT_SECONDS = 30;
    setWakeCountdown(WAIT_SECONDS);
    pendingLoginRef.current = { id, password };

    wakeTimerRef.current = setInterval(() => {
      setWakeCountdown(prev => {
        if (prev <= 1) {
          clearInterval(wakeTimerRef.current);
          wakeTimerRef.current = null;
          // Auto-retry login
          attemptLogin(
            pendingLoginRef.current.id,
            pendingLoginRef.current.password,
            true // isRetry
          );
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const attemptLogin = async (id, password, isRetry = false) => {
    setLoading(true);
    setError('');
    if (!isRetry) setWakeCountdown(null);

    try {
      await login(id, password);
    } catch (err) {
      if (!err.response) {
        // Distinguish timeout vs CORS/network block
        if (err.code === 'ECONNABORTED') {
          // Genuine timeout — server might be slow / waking up
          if (isRetry) {
            setWakeCountdown(null);
            setError('Server is taking longer than expected. Please wait a moment and try signing in again.');
          } else {
            startWakeCountdown(id, password);
          }
        } else if (err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network')) {
          // Pure network failure — no internet or server is completely down
          setWakeCountdown(null);
          setError('Unable to reach the server. Please check your internet connection and try again.');
        } else {
          // CORS or browser-blocked response — server is up but request was blocked
          setWakeCountdown(null);
          setError('Could not connect to the server. Please try refreshing the page. If the issue persists, contact the administrator.');
        }
      } else if (err.response.status === 400) {
        setWakeCountdown(null);
        setError(err.response.data?.message || 'Invalid credentials. Please check your ID and password.');
      } else if (err.response.status === 500) {
        setWakeCountdown(null);
        setError('Server error. Please try again in a moment.');
      } else {
        setWakeCountdown(null);
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // If a wake-up countdown is running, cancel it and allow manual retry
    if (wakeTimerRef.current) {
      clearInterval(wakeTimerRef.current);
      wakeTimerRef.current = null;
      setWakeCountdown(null);
    }

    const id = isStudentLogin ? formData.studentId.trim() : formData.adminId.trim();
    const password = formData.password;

    if (!id) {
      setError(isStudentLogin ? 'Please enter your Student ID.' : 'Please enter your Admin ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    await attemptLogin(id, password, false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const switchMode = (student) => {
    // Cancel any ongoing wake-up timer when switching modes
    if (wakeTimerRef.current) {
      clearInterval(wakeTimerRef.current);
      wakeTimerRef.current = null;
    }
    setWakeCountdown(null);
    setIsStudentLogin(student);
    setFormData({ studentId: '', adminId: '', password: '' });
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="glass-card rounded-3xl p-8 sm:p-10 w-full max-w-md relative z-10 animate-scale-in border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg ring-1 ring-white/20">
              <Vote className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2 font-['Inter'] tracking-tight">
            Secure Sign In
          </h1>
          <p className="text-gray-400 font-medium tracking-wide">
            {isStudentLogin ? 'Student Voting Portal' : 'Administrator Action Desk'}
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex mb-8 p-1.5 glass-panel rounded-xl">
          <button
            type="button"
            id="btn-student-tab"
            onClick={() => switchMode(true)}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
              isStudentLogin
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Student
          </button>
          <button
            type="button"
            id="btn-admin-tab"
            onClick={() => switchMode(false)}
            className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
              !isStudentLogin
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </button>
        </div>

        {/* Server Wake-up Countdown Banner */}
        {wakeCountdown !== null && (
          <div className="mb-6 p-4 glass-panel border-amber-500/30 bg-amber-500/10 rounded-xl animate-pulse-soft">
            <div className="flex items-center mb-2">
              <RefreshCw className="h-5 w-5 text-amber-400 mr-3 flex-shrink-0 animate-spin" />
              <span className="text-amber-200 text-sm font-semibold">Server is waking up…</span>
            </div>
            <p className="text-amber-300/80 text-xs ml-8">
              Our free-tier server went to sleep. Auto-retrying your login in{' '}
              <span className="font-bold text-amber-200">{wakeCountdown}s</span>. Please wait.
            </p>
            <div className="mt-2 ml-8 w-full bg-amber-900/40 rounded-full h-1">
              <div
                className="bg-amber-400 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${(wakeCountdown / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 glass-panel border-red-500/30 bg-red-500/10 rounded-xl flex items-center animate-shake">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <span className="text-red-200 text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5 animate-slide-up">
          {/* ID Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300 flex items-center pl-1">
              {isStudentLogin
                ? <><Users className="h-4 w-4 mr-2 text-indigo-400" /> Student ID</>
                : <><Shield className="h-4 w-4 mr-2 text-purple-400" /> Admin ID</>
              }
            </label>
            <input
              type="text"
              id={isStudentLogin ? 'input-student-id' : 'input-admin-id'}
              name={isStudentLogin ? 'studentId' : 'adminId'}
              value={isStudentLogin ? formData.studentId : formData.adminId}
              onChange={handleChange}
              className="glass-input w-full"
              placeholder={isStudentLogin ? 'Enter your student ID' : 'Enter your admin ID'}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300 flex items-center pl-1">
              <Key className="h-4 w-4 mr-2 text-indigo-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="input-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="glass-input w-full pr-12"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-login-submit"
            disabled={loading}
            className="w-full glass-button relative overflow-hidden group mt-4 h-14"
          >
            <div className={`absolute inset-0 transition-opacity ${isStudentLogin
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
              : 'bg-gradient-to-r from-purple-600 to-pink-600'
            } opacity-90 group-hover:opacity-100`} />
            <div className="relative flex items-center justify-center gap-2 font-bold text-lg tracking-wide">
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{isStudentLogin ? 'Sign In to Vote' : 'Admin Sign In'}</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <div className="grid grid-cols-1 gap-2 text-xs text-justify text-gray-500 p-2">
            {isStudentLogin ? (
              <>
                <div className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> <span>One-time vote per student — votes cannot be changed once submitted.</span></div>
                <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> <span>All submissions are encrypted and permanently recorded.</span></div>
                <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> <span>Session is automatically terminated after voting.</span></div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" /> <span>Zero-trust Admin Authentication required.</span></div>
                <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" /> <span>For strict overrides, contact global administrator.</span></div>
                <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" /> <span>All actions are immutably logged and audited.</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
