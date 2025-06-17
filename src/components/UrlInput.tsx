'use client';

interface UrlInputProps {
  onScrape: (url: string) => void;
  isLoading: boolean;
}

export default function UrlInput({ onScrape, isLoading }: UrlInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const url = formData.get('url') as string;
    if (url) onScrape(url);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <input
        type="url"
        name="url"
        placeholder="Enter URL to scrape images from..."
        required
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Scraping...</span>
          </div>
        ) : (
          'Scrape'
        )}
      </button>
    </form>
  );
} 