'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';

const Overview = () => {
  const { history } = useSearchHistory();

  const data = history.map(item => ({
    date: new Date(item.created_at).toLocaleDateString(),
    images: item.image_count,
  }));

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #4B5563',
              }}
            />
            <Line type="monotone" dataKey="images" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Overview; 