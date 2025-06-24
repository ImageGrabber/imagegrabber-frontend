'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ClassificationHistoryItem {
  id: string;
  url: string;
  title: string;
  description: string;
  contentType: 'product' | 'blog' | 'review' | 'landing' | 'article' | 'other';
  confidence: number;
  images: string[];
  created_at: string;
  method: 'openai' | 'huggingface' | 'keyword';
}

interface ClassificationHistoryContextType {
  history: ClassificationHistoryItem[];
  addToHistory: (item: Omit<ClassificationHistoryItem, 'id' | 'created_at'>) => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loading: boolean;
}

const ClassificationHistoryContext = createContext<ClassificationHistoryContextType | undefined>(undefined);

export const useClassificationHistory = () => {
  const context = useContext(ClassificationHistoryContext);
  if (!context) {
    throw new Error('useClassificationHistory must be used within a ClassificationHistoryProvider');
  }
  return context;
};

interface ClassificationHistoryProviderProps {
  children: ReactNode;
}

export const ClassificationHistoryProvider = ({ children }: ClassificationHistoryProviderProps) => {
  const [history, setHistory] = useState<ClassificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load classification history from database
  const loadHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/classification-history');
      if (response.ok) {
        const data = await response.json();
        // Transform database format to match our interface
        const transformedData = data.map((item: any) => ({
          id: item.id,
          url: item.url,
          title: item.title,
          description: item.description,
          contentType: item.content_type,
          confidence: item.confidence,
          images: item.images || [],
          created_at: item.created_at,
          method: item.method
        }));
        setHistory(transformedData);
      } else {
        console.error('Failed to load classification history');
      }
    } catch (error) {
      console.error('Error loading classification history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load history when user changes
  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [user]);

  const addToHistory = async (item: Omit<ClassificationHistoryItem, 'id' | 'created_at'>) => {
    if (!user) return;

    try {
      const response = await fetch('/api/classification-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: item.url,
          title: item.title,
          description: item.description,
          contentType: item.contentType,
          confidence: item.confidence,
          images: item.images,
          method: item.method
        }),
      });

      if (response.ok) {
        const newItem = await response.json();
        // Transform database format to match our interface
        const transformedItem = {
          id: newItem.id,
          url: newItem.url,
          title: newItem.title,
          description: newItem.description,
          contentType: newItem.content_type,
          confidence: newItem.confidence,
          images: newItem.images || [],
          created_at: newItem.created_at,
          method: newItem.method
        };
        setHistory(prevHistory => [transformedItem, ...prevHistory]);
      } else {
        console.error('Failed to save classification to database');
      }
    } catch (error) {
      console.error('Error saving classification:', error);
    }
  };

  const removeFromHistory = async (id: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/classification-history?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
      } else {
        console.error('Failed to delete classification from database');
      }
    } catch (error) {
      console.error('Error deleting classification:', error);
    }
  };

  const clearHistory = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/classification-history', {
        method: 'DELETE',
      });

      if (response.ok) {
        setHistory([]);
      } else {
        console.error('Failed to clear classification history from database');
      }
    } catch (error) {
      console.error('Error clearing classification history:', error);
    }
  };

  const value = { history, addToHistory, removeFromHistory, clearHistory, loading };

  return (
    <ClassificationHistoryContext.Provider value={value}>
      {children}
    </ClassificationHistoryContext.Provider>
  );
}; 