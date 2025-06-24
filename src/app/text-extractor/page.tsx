'use client';
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Loader2, AlertTriangle, Search, Copy, Download, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';

interface ExtractedData {
  url: string;
  title: string;
  metaDescription: string;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  keywords: string[];
  textContent: string;
  wordCount: number;
  characterCount: number;
  extractedAt: string;
}

export default function TextExtractorPage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { user } = useAuth();
  const { openModal } = useModal();

  const handleExtract = async () => {
    if (!user) {
      openModal('login', 'Please log in to extract text and metadata.');
      return;
    }

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        openModal('login', 'Your session has expired. Please sign in again.');
        return;
      }
      
      const res = await fetch('/api/text-extractor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          const data = await res.json();
          setError(data.error || 'You are out of credits. Please upgrade to continue.');
          return;
        }
        throw new Error('Failed to extract text and metadata');
      }

      const data = await res.json();
      setExtractedData(data);
      
      window.dispatchEvent(new CustomEvent('creditsUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong - try again');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadData = () => {
    if (!extractedData) return;
    
    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracted-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderHeadingSection = (level: string, headings: string[]) => {
    if (headings.length === 0) return null;
    
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white capitalize">{level} Headings ({headings.length})</h3>
          <button
            onClick={() => copyToClipboard(headings.join('\n'), `${level}-headings`)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {copiedSection === `${level}-headings` ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <Copy size={16} />
            )}
            Copy All
          </button>
        </div>
        <div className="space-y-2">
          {headings.map((heading, index) => (
            <div key={index} className="text-sm text-gray-300 bg-gray-700/30 rounded-lg p-2">
              {heading}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mt-10 mb-6">
            <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
              <FileText />
              Text & Metadata Extractor
            </h1>
            <p className="text-gray-400">
              Extract page titles, meta descriptions, Open Graph tags, headings, and text content for SEO audits and content analysis.
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://www.example.com)"
                  className="w-full bg-gray-900/80 border border-gray-600/60 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleExtract}
                disabled={isLoading || !url.trim()}
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
                {isLoading ? 'Extracting...' : 'Extract'}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/30 rounded-lg p-3 mt-4">
                <AlertTriangle size={18} />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          {extractedData && (
            <div className="space-y-6">
              {/* Header with download button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300 font-medium">{extractedData.url}</span>
                </div>
                <button
                  onClick={downloadData}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download JSON
                </button>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="text-gray-400 text-sm">Word Count</div>
                  <div className="text-white font-semibold text-xl">{extractedData.wordCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="text-gray-400 text-sm">Character Count</div>
                  <div className="text-white font-semibold text-xl">{extractedData.characterCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="text-gray-400 text-sm">Extracted At</div>
                  <div className="text-white font-semibold text-sm">{new Date(extractedData.extractedAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Title and Meta Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Page Title</h3>
                    <button
                      onClick={() => copyToClipboard(extractedData.title, 'title')}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      {copiedSection === 'title' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                      Copy
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm">{extractedData.title}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Meta Description</h3>
                    <button
                      onClick={() => copyToClipboard(extractedData.metaDescription, 'meta-description')}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      {copiedSection === 'meta-description' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                      Copy
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm">{extractedData.metaDescription}</p>
                </div>
              </div>

              {/* Open Graph Tags */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Open Graph Tags</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(extractedData.openGraph).map(([key, value]) => (
                    value && (
                      <div key={key} className="bg-gray-700/30 rounded-lg p-3">
                        <div className="text-gray-400 text-sm capitalize">{key}</div>
                        <div className="text-white text-sm mt-1 break-words">{value}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Keywords */}
              {extractedData.keywords.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Keywords ({extractedData.keywords.length})</h3>
                    <button
                      onClick={() => copyToClipboard(extractedData.keywords.join(', '), 'keywords')}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      {copiedSection === 'keywords' ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                      Copy All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.keywords.map((keyword, index) => (
                      <span key={index} className="bg-blue-600/20 border border-blue-500/30 text-blue-300 px-2 py-1 rounded-lg text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Headings */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Headings Structure</h3>
                {renderHeadingSection('h1', extractedData.headings.h1)}
                {renderHeadingSection('h2', extractedData.headings.h2)}
                {renderHeadingSection('h3', extractedData.headings.h3)}
                {renderHeadingSection('h4', extractedData.headings.h4)}
                {renderHeadingSection('h5', extractedData.headings.h5)}
                {renderHeadingSection('h6', extractedData.headings.h6)}
              </div>

              {/* Text Content */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Text Content</h3>
                  <button
                    onClick={() => copyToClipboard(extractedData.textContent, 'text-content')}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    {copiedSection === 'text-content' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                    Copy All
                  </button>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {extractedData.textContent ? (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{extractedData.textContent}</p>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No text content found on this page</p>
                      <p className="text-gray-600 text-xs mt-1">This might be a single-page app or the content is loaded dynamically</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 