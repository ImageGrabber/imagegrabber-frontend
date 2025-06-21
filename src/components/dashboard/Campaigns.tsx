'use client';
import React from 'react';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';

const Campaigns = () => {
  const { history } = useSearchHistory();
  const { user } = useAuth();

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Popular Campaigns</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="p-2">Name</th>
              <th className="p-2">Admin</th>
              <th className="p-2">Date Added</th>
              <th className="p-2">Image Count</th>
              <th className="p-2">Operation</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 5).map((item, index) => (
              <tr key={index} className="border-b border-gray-800">
                <td className="p-2 text-white">{item.title}</td>
                <td className="p-2 text-gray-300 flex items-center gap-2">
                  <User className="h-4 w-4" /> {user?.user_metadata?.full_name || 'You'}
                </td>
                <td className="p-2 text-gray-300">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="p-2 text-gray-300">{item.image_count}</td>
                <td className="p-2">
                  <button className="bg-blue-600/50 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Campaigns; 