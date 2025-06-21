'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CreditsDisplay() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCredits = async () => {
    if (!user) return;
    
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCredits();
    } else {
      setCredits(null);
    }
  }, [user]);

  // Refresh credits when user performs actions
  useEffect(() => {
    const handleCreditsUpdate = () => {
      if (user) {
        fetchCredits();
      }
    };

    // Listen for custom events that might change credits
    window.addEventListener('creditsUpdated', handleCreditsUpdate);
    
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdate);
    };
  }, [user]);

  if (!user || credits === null) {
    return null;
  }

  const getCreditsColor = () => {
    if (credits <= 0) return 'text-red-400 bg-red-900/50 border-red-700/50';
    if (credits <= 5) return 'text-yellow-400 bg-yellow-900/50 border-yellow-700/50';
    return 'text-green-400 bg-green-900/50 border-green-700/50';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border ${getCreditsColor()}`}>
        <Coins className="h-4 w-4" />
        <span>{loading ? '...' : credits}</span>
        <span className="text-xs opacity-75">credits</span>
      </div>
      
      {credits <= 5 && (
        <Link 
          href="/pricing"
          className="flex items-center gap-1 rounded-full bg-blue-600/80 border border-blue-500/50 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
          title="Buy more credits"
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Buy</span>
        </Link>
      )}
    </div>
  );
} 