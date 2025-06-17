'use client';

import { useState } from 'react';
import { Paperclip } from 'lucide-react'; // lucide-react already in your project

interface Props {
  isLoading: boolean;
  onScrape: (url: string) => void;
}

export default function HeroTabs({ isLoading, onScrape }: Props) {
  const [url, setUrl] = useState('');

  const handleExtract = () => {
    if (!url.trim()) return;
    onScrape(url.trim());
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* the card */}
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-4 text-primary">
            <Paperclip className="h-5 w-5" />
          </span>
          <input
            type="url"
            placeholder="Enter any URL, like google.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            disabled={isLoading}
            onClick={handleExtract}
            className="rounded-lg bg-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-400 disabled:opacity-50"
          >
            {isLoading ? '…' : 'Extract'}
          </button>
        </div>
      </div>
    </div>
  );
}
