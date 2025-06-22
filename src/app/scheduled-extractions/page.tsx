'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Repeat, Plus, Loader2, AlertTriangle, Trash2, Edit, ToggleLeft, ToggleRight, Calendar, Zap } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Schedule {
  id: string;
  url: string;
  frequency: 'daily' | 'weekly';
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
}

export default function ScheduledExtractionsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [url, setUrl] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    console.log('DEBUG_CLIENT: Starting fetchSchedules...');
    setIsLoadingList(true);
    try {
      const response = await fetch('/api/scheduled-extractions', { cache: 'no-store' });
      console.log('DEBUG_CLIENT: Fetch response status:', response.status);
      if (!response.ok) {
        console.error('DEBUG_CLIENT: Response not OK');
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      console.log('DEBUG_CLIENT: Successfully fetched data:', data);
      setSchedules(data);
    } catch (err) {
      console.error('DEBUG_CLIENT: Error in fetchSchedules:', err);
      setError('Could not load your schedules.');
    } finally {
      console.log('DEBUG_CLIENT: Finished fetchSchedules.');
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreateSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scheduled-extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, frequency }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create schedule.');
      }
      setUrl('');
      setFrequency('daily');
      await fetchSchedules(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSchedule = async (id: string, currentStatus: boolean) => {
    // Optimistically update the UI
    setSchedules(schedules.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));

    try {
      await fetch(`/api/scheduled-extractions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
    } catch (err) {
      // Revert if API call fails
      setSchedules(schedules.map(s => s.id === id ? { ...s, is_active: currentStatus } : s));
      setError('Failed to update schedule status.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    // Optimistically remove from UI
    const originalSchedules = schedules;
    setSchedules(schedules.filter(s => s.id !== id));

    try {
      await fetch(`/api/scheduled-extractions/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      // Revert if API call fails
      setSchedules(originalSchedules);
      setError('Failed to delete schedule.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mt-10 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                <Repeat />
                Scheduled Extractions
              </h1>
              <p className="text-gray-400">
                Set up recurring extractions for websites that update regularly.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Create New Schedule</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label htmlFor="schedule-url" className="block text-sm font-medium text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  id="schedule-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., https://www.example.com"
                  className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="schedule-frequency" className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  id="schedule-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 mt-3">
                <AlertTriangle size={18} />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <div className="mt-4 text-right">
              <button
                onClick={handleCreateSchedule}
                disabled={isLoading || !url}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus size={16} />}
                Create Schedule
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Your Schedules</h2>
            {isLoadingList ? (
              <div className="text-center text-gray-500 py-8">
                <Loader2 className="animate-spin h-8 w-8 mx-auto" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center text-gray-500 bg-gray-800/30 py-8 rounded-lg">
                <p>You have no scheduled extractions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map(schedule => (
                  <div key={schedule.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-white truncate">{schedule.url}</p>
                      <div className="text-sm text-gray-400 flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 capitalize">
                          <Zap size={14} className={schedule.is_active ? 'text-green-500' : 'text-gray-600'} />
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </span>
                        <span className="flex items-center gap-1.5 capitalize">
                          <Repeat size={14} />
                          {schedule.frequency}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          Next run in {formatDistanceToNow(parseISO(schedule.next_run_at))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                        className="text-gray-400 hover:text-white"
                        title={schedule.is_active ? 'Pause' : 'Resume'}
                      >
                        {schedule.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 