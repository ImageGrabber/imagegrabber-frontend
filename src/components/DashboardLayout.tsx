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
  ChevronRight,
  Upload,
  Network,
  Repeat,
  LayoutDashboard,
  ImageDown,
  Scaling,
  Image,
  Clock,
  Scissors,
  Sparkles,
  FileText,
  Palette,
  Brain,
  Search,
  Type,
  Crop,
  Home,
  HelpCircle,
  Bot,
  ScanSearch,
  Tags,
  Wand2,
  ChevronDown,
  LayoutGrid,
  Target,
  Boxes,
  Droplet,
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

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid, isHeading: false },
    { name: 'History', href: '/history', icon: History, isHeading: false },

    { name: 'Image Tools', isHeading: true },
    { name: 'Single Extraction', href: '/extract', icon: Target, isHeading: false },
    { name: 'Batch Extraction', href: '/batch', icon: Boxes, isHeading: false },
    { name: 'Sitemap Crawler', href: '/sitemap-crawler', icon: Network, isHeading: false },
    { name: 'Domain Crawler', href: '/domain-crawler', icon: Globe, isHeading: false },

    { name: 'AI Tools', isHeading: true },
    { name: 'Content Classifier', href: '/content-classifier', icon: FileText, isHeading: false },
    { name: 'Brand Detector', href: '/brand-detector', icon: Tags, isHeading: false },
    { name: 'Watermark Remover', href: '/watermark-remover', icon: Droplet, isHeading: false },
    { name: 'Color & Font Detector', href: '/color-and-font-detector', icon: Palette, isHeading: false },
    { name: 'Text Extractor', href: '/text-extractor', icon: Type, isHeading: false },
    { name: 'Background Remover', href: '/background-remover', icon: Crop, isHeading: false },
    { name: 'Optimizer', href: '/optimizer', icon: Wand2, isHeading: false },

    { name: 'Scheduling', isHeading: true },
    { name: 'Scheduled Extractions', href: '/scheduled-extractions', icon: Clock, isHeading: false },
    
    { name: 'Account', isHeading: true },
    { name: 'Settings', href: '/settings', icon: Settings, isHeading: false },
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
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {menuItems.map((item) =>
                item.isHeading ? (
                  <h3 key={item.name} className="px-3 pt-4 pb-2 text-xs font-semibold uppercase text-gray-500">
                    {item.name}
                  </h3>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href!}
                    className={`flex items-center space-x-3 rounded-md px-3 py-2 text-gray-300 transition-all duration-200 hover:bg-gray-700/50 hover:text-white ${
                      pathname === item.href ? 'bg-gray-700/50 text-white' : ''
                    }`}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span>{item.name}</span>
                  </Link>
                )
              )}
            </nav>
          </div>
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
        <main className="flex-1 relative">
          {/* Particle Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Decorative background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full filter blur-3xl opacity-30 animate-pulse delay-2000"></div>
            <div className="absolute -top-20 -left-40 w-[400px] h-[400px] border-2 border-white/5 rounded-full" />
            <div className="absolute -bottom-20 -right-40 w-[400px] h-[400px] border border-white/5 rounded-full" />
            
            {/* Floating Particles */}
            <div className="absolute inset-0">
              {/* Large particles */}
              <div className="absolute top-20 left-20 w-8 h-8 bg-white/15 rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '4s'}}></div>
              <div className="absolute top-40 right-32 w-6 h-6 bg-blue-400/25 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '5s'}}></div>
              <div className="absolute top-60 left-1/3 w-6 h-6 bg-purple-400/30 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '3s'}}></div>
              <div className="absolute bottom-40 right-20 w-10 h-10 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '4.5s'}}></div>
              <div className="absolute bottom-60 left-24 w-6 h-6 bg-blue-300/20 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '5.5s'}}></div>
              
              {/* Medium particles */}
              <div className="absolute top-32 right-1/4 w-4 h-4 bg-white/25 rounded-full animate-pulse" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
              <div className="absolute top-72 left-40 w-4 h-4 bg-purple-300/40 rounded-full animate-pulse" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
              <div className="absolute bottom-32 right-40 w-4 h-4 bg-blue-200/30 rounded-full animate-pulse" style={{animationDelay: '2s', animationDuration: '3.5s'}}></div>
              <div className="absolute bottom-20 left-1/2 w-4 h-4 bg-white/30 rounded-full animate-pulse" style={{animationDelay: '0.5s', animationDuration: '5s'}}></div>
              
              {/* Small particles */}
              <div className="absolute top-16 left-1/2 w-3 h-3 bg-white/20 rounded-full animate-ping" style={{animationDelay: '0s', animationDuration: '4s'}}></div>
              <div className="absolute top-80 right-16 w-2 h-2 bg-blue-100/35 rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '3s'}}></div>
              <div className="absolute bottom-16 left-16 w-3 h-3 bg-purple-200/25 rounded-full animate-ping" style={{animationDelay: '2s', animationDuration: '5s'}}></div>
              <div className="absolute bottom-80 right-1/3 w-2 h-2 bg-white/30 rounded-full animate-ping" style={{animationDelay: '1.5s', animationDuration: '4.5s'}}></div>
              
              {/* Floating particles with custom animation */}
              <div className="absolute top-24 right-12 w-6 h-6 bg-gradient-to-r from-blue-400/15 to-purple-400/15 rounded-full" style={{animation: 'float 8s ease-in-out infinite'}}></div>
              <div className="absolute top-56 left-12 w-8 h-8 bg-gradient-to-r from-purple-300/10 to-blue-300/10 rounded-full" style={{animation: 'float 10s ease-in-out infinite reverse'}}></div>
              <div className="absolute bottom-24 right-1/4 w-6 h-6 bg-gradient-to-r from-white/15 to-blue-200/15 rounded-full" style={{animation: 'float 9s ease-in-out infinite'}}></div>
              <div className="absolute bottom-56 left-1/4 w-4 h-4 bg-gradient-to-r from-blue-100/25 to-purple-100/25 rounded-full" style={{animation: 'float 7s ease-in-out infinite reverse'}}></div>
            </div>
          </div>
          
          {/* Content with higher z-index */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 