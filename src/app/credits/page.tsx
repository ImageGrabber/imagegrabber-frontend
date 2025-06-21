'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import Header from '@/components/Header';
import DashboardLayout from '@/components/DashboardLayout';
import { Coins, Calendar, Globe, ArrowRight, Plus, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface CreditTransaction {
  id: string;
  type: 'deduction' | 'purchase';
  amount: number;
  description: string;
  url?: string;
  images_found?: number;
  created_at: string;
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [credits, setCredits] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditsAndHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }
      
      // Fetch current credits
      const creditsResponse = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });
      
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        setCredits(creditsData.credits);
      } else {
        console.error('Failed to fetch credits:', creditsResponse.statusText);
        setError('Failed to fetch credits');
        setCredits(0); // Set to 0 rather than throwing error
      }

      // Get transactions from database (don't let this fail the whole function)
      try {
        const transactionsResponse = await fetch('/api/transactions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });
        
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData.transactions || []);
        } else {
          console.error('Failed to fetch transactions:', transactionsResponse.statusText);
          setTransactions([]);
        }
      } catch (transactionError) {
        console.error('Error fetching transactions:', transactionError);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching credits and history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCreditsAndHistory();
    } else {
      setCredits(null);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);

  // Listen for credits updates
  useEffect(() => {
    const handleCreditsUpdate = () => {
      if (user) {
        fetchCreditsAndHistory();
      }
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);
    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCreditsColor = () => {
    if (credits === null) return 'text-gray-400';
    if (credits <= 0) return 'text-red-400';
    if (credits <= 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getTransactionIcon = (transaction: CreditTransaction) => {
    if (transaction.type === 'purchase') {
      return <Plus className="h-4 w-4 text-green-400" />;
    }
    return <Globe className="h-4 w-4 text-blue-400" />;
  };

  // Use dashboard layout - it handles authentication
  if (!user) {
    return <DashboardLayout><div /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50 border border-gray-700/50">
            <Coins className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white">Credits Dashboard</h1>
          <p className="text-gray-400">Track your credit balance and usage history</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-900/50 border border-red-700/50 p-4">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Current Balance Card */}
        <div className="mb-8 rounded-2xl bg-gray-900/80 border border-gray-700/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-gray-200">Current Balance</h2>
                <button
                  onClick={fetchCreditsAndHistory}
                  disabled={loading}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-all duration-200 disabled:opacity-50"
                  title="Refresh credits"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Coins className={`h-6 w-6 ${getCreditsColor()}`} />
                <span className={`text-3xl font-bold ${getCreditsColor()}`}>
                  {loading ? '...' : (error ? 'Error' : credits)}
                </span>
                <span className="text-gray-400">credits</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {credits !== null && credits <= 5 && (
                <Link 
                  href="/pricing"
                  className="flex items-center gap-2 rounded-full bg-blue-600/80 border border-blue-500/50 px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
                >
                  <Plus className="h-4 w-4" />
                  Buy Credits
                </Link>
              )}
            </div>
          </div>
          
          {credits !== null && (
            <div className="mt-4 rounded-lg bg-gray-800/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${
                  credits <= 0 ? 'text-red-400' : 
                  credits <= 5 ? 'text-yellow-400' : 
                  'text-green-400'
                }`}>
                  {credits <= 0 ? 'Out of Credits' : 
                   credits <= 5 ? 'Low Balance' : 
                   'Good Balance'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Usage History */}
        <div className="rounded-2xl bg-gray-900/80 border border-gray-700/50 backdrop-blur-sm">
          <div className="border-b border-gray-700/50 p-6">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-200">Usage History</h2>
            </div>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-500 mt-2">Your credit usage will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4 transition-all duration-200 hover:bg-gray-800/70"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700/50">
                        {getTransactionIcon(transaction)}
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-200">{transaction.description}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-gray-400">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {formatDate(transaction.created_at)}
                          </p>
                          {transaction.images_found && (
                            <p className="text-sm text-gray-400">
                              {transaction.images_found} images found
                            </p>
                          )}
                        </div>
                        {transaction.url && (
                          <a
                            href={transaction.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-1"
                          >
                            {new URL(transaction.url).hostname}
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-lg font-semibold ${
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                      <p className="text-sm text-gray-400">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-gray-800/80 border border-gray-600/50 px-6 py-3 font-medium text-gray-200 transition-all duration-200 hover:bg-gray-700/80"
          >
            <Globe className="h-4 w-4" />
            Extract Images
          </Link>
          
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-full bg-blue-600/80 border border-blue-500/50 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-blue-500/80"
          >
            <Plus className="h-4 w-4" />
            Buy More Credits
          </Link>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 