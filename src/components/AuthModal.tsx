'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, ArrowLeft, User } from 'lucide-react';

export default function AuthModal() {
  const { isModalOpen, closeModal, modalMode, customMessage, setModalMode } = useModal();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(modalMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (isModalOpen) {
      setMode(modalMode);
    }
  }, [isModalOpen, modalMode]);

  const handleClose = () => {
    closeModal();
    resetForm();
  }

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          handleClose();
        }
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              display_name: name,
            }
          }
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the confirmation link!');
        }
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password reset link sent! Check your email.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot-password') => {
    setMode(newMode);
    resetForm();
  };

  if (!isModalOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Welcome Back';
      case 'register':
        return 'Create Account';
      case 'forgot-password':
        return 'Reset Password';
      default:
        return 'Welcome Back';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'login':
          return 'Signing In...';
        case 'register':
          return 'Creating Account...';
        case 'forgot-password':
          return 'Sending Reset Link...';
        default:
          return 'Loading...';
      }
    } else {
      switch (mode) {
        case 'login':
          return 'Sign In';
        case 'register':
          return 'Create Account';
        case 'forgot-password':
          return 'Send Reset Link';
        default:
          return 'Submit';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700/50 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {mode === 'forgot-password' && (
              <button
                onClick={() => switchMode('login')}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-100">
              {getTitle()}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Custom Message */}
        {customMessage && (
          <div className="mb-6 rounded-lg bg-blue-900/50 border border-blue-700/50 p-4">
            <p className="text-sm text-blue-200">{customMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field - Only show for registration */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 pl-10 pr-4 py-3 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 pl-10 pr-4 py-3 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password Field - Only show for login and register */}
          {mode !== 'forgot-password' && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/80 pl-10 pr-4 py-3 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          )}

          {/* Forgot Password Link - Only show in login mode */}
          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-900/50 border border-red-700/50 p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="rounded-lg bg-green-900/50 border border-green-700/50 p-3">
              <p className="text-sm text-green-200">{message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-blue-600 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {getSubmitText()}
              </div>
            ) : (
              getSubmitText()
            )}
          </button>
        </form>

        {/* Mode Switch - Only show for login and register modes */}
        {mode !== 'forgot-password' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

        {/* Back to Login - Only show in forgot password mode */}
        {mode === 'forgot-password' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Remember your password?{' '}
              <button
                onClick={() => switchMode('login')}
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Back to Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 