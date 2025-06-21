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
      const key = `search_history_${user.id}`;
      const savedHistory = localStorage.getItem(key);
      console.log('SearchHistory: Loading history for user', user.id, 'from key:', key);
      console.log('SearchHistory: Saved data:', savedHistory);
      
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          console.log('SearchHistory: Loaded history items:', parsedHistory.length);
          setHistory(parsedHistory);
        } catch (error) {
          console.error('Error loading search history:', error);
        }
      } else {
        console.log('SearchHistory: No saved history found');
        setHistory([]);
      }
    } else {
      console.log('SearchHistory: No user, clearing history');
      setHistory([]);
    }
  }, [user]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (user && history.length > 0) {
      const key = `search_history_${user.id}`;
      const data = JSON.stringify(history);
      console.log('SearchHistory: Saving history for user', user.id, 'to key:', key);
      console.log('SearchHistory: Saving', history.length, 'items');
      localStorage.setItem(key, data);
    }
  }, [history, user]);

  const addToHistory = (url: string, imageCount?: number, title?: string) => {
    if (!user) {
      console.log('SearchHistory: No user, not adding to history');
      return;
    }

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      url,
      timestamp: new Date(),
      imageCount,
      title: title || new URL(url).hostname
    };

    console.log('SearchHistory: Adding to history:', newItem);

    setHistory(prev => {
      // Remove duplicate URLs and keep only the latest entry
      const filtered = prev.filter(item => item.url !== url);
      // Add new item at the beginning and keep only the last 50 items
      const newHistory = [newItem, ...filtered].slice(0, 50);
      console.log('SearchHistory: New history length:', newHistory.length);
      return newHistory;
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