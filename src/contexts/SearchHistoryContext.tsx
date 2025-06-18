'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export interface SearchHistoryItem {
  id: string;
  url: string;
  timestamp: Date;
  imageCount?: number;
  title?: string;
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

  // Load history from localStorage when user changes
  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`search_history_${user.id}`);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          setHistory(parsedHistory);
        } catch (error) {
          console.error('Error loading search history:', error);
        }
      }
    } else {
      setHistory([]);
    }
  }, [user]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (user && history.length > 0) {
      localStorage.setItem(`search_history_${user.id}`, JSON.stringify(history));
    }
  }, [history, user]);

  const addToHistory = (url: string, imageCount?: number, title?: string) => {
    if (!user) return;

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      url,
      timestamp: new Date(),
      imageCount,
      title: title || new URL(url).hostname
    };

    setHistory(prev => {
      // Remove duplicate URLs and keep only the latest entry
      const filtered = prev.filter(item => item.url !== url);
      // Add new item at the beginning and keep only the last 50 items
      return [newItem, ...filtered].slice(0, 50);
    });
  };

  const clearHistory = () => {
    setHistory([]);
    if (user) {
      localStorage.removeItem(`search_history_${user.id}`);
    }
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
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