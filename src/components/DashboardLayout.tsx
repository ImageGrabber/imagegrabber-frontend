'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Globe, 
  History, 
  Coins, 
  CreditCard, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { openModal } = useModal();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const navigation = [
    { name: 'Extract Images', href: '/', icon: Globe },
    { name: 'Search History', href: '/history', icon: History },
    { name: 'Credits', href: '/credits', icon: Coins },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const fetchCredits = async () => {
    if (!user) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  // Listen for credits updates
  useEffect(() => {
    const handleCreditsUpdate = () => {
      fetchCredits();
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);
    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
  }, [user]);

  const getCreditsColor = () => {
    if (credits === null) return 'text-gray-400';
    if (credits <= 0) return 'text-red-400';
    if (credits <= 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto max-w-4xl px-4 pt-32">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50 border border-gray-700/50">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="mb-4 text-3xl font-bold text-white">Dashboard Access</h1>
            <p className="mb-8 text-gray-400">Please sign in to access your dashboard.</p>
            <button
              onClick={() => openModal('login')}
              className="rounded-full bg-blue-600/80 border border-blue-500/50 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col bg-gray-900/95 border-r border-gray-700/50 backdrop-blur-sm">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              </div>
              <span className="text-lg font-semibold text-white">FlowManager</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden rounded-full p-1 text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300' 
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
          </nav>


        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 px-4 lg:px-6 bg-gray-900/95 border-b border-gray-700/50 backdrop-blur-sm">
          {/* Mobile menu button and logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-full p-2 text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-lg font-semibold text-white">FlowManager</span>
            </div>
          </div>

          {/* Top bar actions */}
          <div className="flex items-center gap-3">
            {/* Credits display */}
            <Link
              href="/credits"
              className="flex items-center gap-2 rounded-full bg-gray-800/50 border border-gray-700/50 px-3 py-2 hover:bg-gray-700/50 transition-all duration-200"
              title="View Credits"
            >
              <Coins className={`h-4 w-4 ${getCreditsColor()}`} />
              <span className={`text-sm font-medium ${getCreditsColor()}`}>
                {credits !== null ? credits : '...'}
              </span>
              <span className="hidden sm:inline text-xs text-gray-400">credits</span>
            </Link>

            {/* Profile dropdown */}
            <div className="relative">
              <div className="flex items-center gap-3 rounded-full bg-gray-800/50 border border-gray-700/50 px-4 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30">
                  <User className="h-4 w-4 text-blue-300" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-200 truncate max-w-32">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings button */}
            <Link
              href="/settings"
              className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-all duration-200"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-red-600/20 hover:text-red-300 transition-all duration-200"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 