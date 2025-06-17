'use client';

import { useState } from 'react';
import { Paperclip } from 'lucide-react';

interface Props {
  isLoading: boolean;
  onScrape: (url: string) => void;
}

export default function HeroSection({ isLoading, onScrape }: Props) {
  const [url, setUrl] = useState('');

  const handleExtract = () => {
    if (!url.trim()) return;
    onScrape(url.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExtract();
    }
  };

  return (
    <section className="relative min-h-[600px] pt-20 pb-16">
      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <div className="mb-12 pt-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Extract images
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            from any public specific url
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50 p-2 focus-within:border-orange-500 focus-within:bg-white">
                <div className="flex items-center pl-4">
                  <Paperclip className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  placeholder="Where are you want to extract?"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 bg-transparent py-4 text-lg text-gray-900 placeholder-gray-500 outline-none"
                />
                <div className="flex items-center gap-2 pr-2">
                  <button className="rounded-xl p-3 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </button>
                  <button
                    disabled={isLoading || !url.trim()}
                    onClick={handleExtract}
                    className="rounded-xl bg-orange-500 px-8 py-3 text-white font-semibold shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Extracting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Extract
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <span className="text-gray-500">Popular:</span>
                {['instagram', 'pinterest', 'unsplash', 'dribbble', 'behance'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setUrl(`https://${tag}.com`)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 