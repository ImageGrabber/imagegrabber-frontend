'use client';

interface SearchBoxProps {
  onSearch: (query: string) => void;
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search images..."
        onChange={(e) => onSearch(e.target.value)}
        className="w-64 rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <svg
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
} 