'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Coins } from 'lucide-react';

const Balance = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
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

    if (user) {
      fetchCredits();
    }

    window.addEventListener('creditsUpdated', fetchCredits);
    return () => window.removeEventListener('creditsUpdated', fetchCredits);
  }, [user]);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Total Balance</h2>
        <Coins className="text-gray-400" />
      </div>
      <div className="text-4xl font-bold text-white mb-2">
        <p>{credits !== null ? credits : '...'} credits</p>
      </div>
      <p className="text-gray-400">This is your current credit balance.</p>
    </div>
  );
};

export default Balance; 