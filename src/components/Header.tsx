'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Settings, User, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, signOut, loading } = useAuth();
  const { openModal } = useModal();

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <span className="text-2xl font-bold text-white">FlowManager</span>
            </Link>
          </div>

          {/* Center Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
             <Link href="/" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Extract
            </Link>
            <Link href="#" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Pricing
            </Link>
            <Link href="#" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Contact
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500"></div>
            ) : user ? (
              <div className="relative">
                {/* User Menu */}
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/10"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900/50">
                    <User className="h-4 w-4 text-blue-300" />
                  </div>
                  <div className="hidden text-left text-sm md:block">
                    <p className="font-medium text-white">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-[#111122] py-1 shadow-lg"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      href="/history"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <History className="h-4 w-4" />
                      Search History
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('login')}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openModal('register')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
