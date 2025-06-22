'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface SearchHistoryItem {
  id: string;
  url: string;
  title: string | null;
  image_count: number;
  results: { url: string; filename: string }[];
  created_at: string;
}

interface SearchHistoryContextType {
  history: SearchHistoryItem[];
  addToHistory: (url: string, imageCount?: number, title?: string) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
}

const SearchHistoryContext = createContext<SearchHistoryContextType | undefined>(undefined);

export const SearchHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const { user } = useAuth();

  // Load history from database when user changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        console.log('SearchHistory: No user, clearing history');
        setHistory([]);
        return;
      }

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        const response = await fetch('/api/search-history', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Ensure all items have a `results` array
            const sanitizedData = data.map(item => ({
              ...item,
              results: item.results || [],
            }));
            setHistory(sanitizedData);
            console.log(`SearchHistory: Loaded ${sanitizedData.length} items from database`);
          }
        } else {
          console.error('Failed to fetch search history:', response.statusText);
          setHistory([]);
        }
      } catch (error) {
        console.error('Error loading search history:', error);
        setHistory([]);
      }
    };

    fetchHistory();
  }, [user]);

  const addToHistory = async (url: string, imageCount?: number, title?: string) => {
    if (!user) {
      console.log('SearchHistory: No user, not adding to history');
      return;
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const response = await fetch('/api/search-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          url,
          title: title || new URL(url).hostname,
          imageCount: imageCount || 0
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('SearchHistory: Added to database:', data.history);
        
        // Update local state - remove duplicates and add new item at the beginning
        setHistory(prev => {
          const filtered = prev.filter(item => item.url !== url);
          return [data.history, ...filtered].slice(0, 50);
        });
      } else {
        console.error('Failed to add search history:', response.statusText);
      }
    } catch (error) {
      console.error('Error adding to search history:', error);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const response = await fetch('/api/search-history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('SearchHistory: Cleared all history from database');
        setHistory([]);
      } else {
        console.error('Failed to clear search history:', response.statusText);
      }
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const removeFromHistory = async (id: string) => {
    if (!user) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const response = await fetch(`/api/search-history?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        console.log('SearchHistory: Removed item from database:', id);
        setHistory(prev => prev.filter(item => item.id !== id));
      } else {
        console.error('Failed to remove search history item:', response.statusText);
      }
    } catch (error) {
      console.error('Error removing search history item:', error);
    }
  };

  const value = {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
};

export const useSearchHistory = () => {
  const context = useContext(SearchHistoryContext);
  if (context === undefined) {
    throw new Error('useSearchHistory must be used within a SearchHistoryProvider');
  }
  return context;
}; 