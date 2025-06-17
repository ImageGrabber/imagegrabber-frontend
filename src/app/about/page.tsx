'use client';

import Header from '@/components/Header';
import { Search, Filter, Settings, Code } from 'lucide-react';

export default function About() {
  return (
    <>
      <Header />
      
   
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 pt-32 pb-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            About ImageGrabber
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Powerful image extraction technology designed for developers, designers, and content creators
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our advanced technology ensures you can extract, organize, and download images from any website with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Search className="h-8 w-8" />}
              title="Smart Discovery"
              description="Advanced algorithms find images across all page elements, including background images, SVGs, and dynamically-loaded assets"
            />
            <FeatureCard
              icon={<Filter className="h-8 w-8" />}
              title="Filter & Sort"
              description="Organize images by size, type, and quality. Filter out unwanted content and find exactly what you need"
            />
            <FeatureCard
              icon={<Settings className="h-8 w-8" />}
              title="Bulk Download"
              description="Download individual images or entire collections as ZIP files. Perfect for large-scale content acquisition"
            />
            <FeatureCard
              icon={<Code className="h-8 w-8" />}
              title="API Access"
              description="Integrate image extraction into your workflow with our developer-friendly REST API and comprehensive documentation"
            />
          </div>
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                How It Works
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <p className="text-gray-600">Enter any website URL in our extraction tool</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <p className="text-gray-600">Our algorithms scan and identify all images on the page</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <p className="text-gray-600">Filter, preview, and select the images you want</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
                  <p className="text-gray-600">Download individually or as a complete ZIP archive</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Try It Now
              </h4>
              <p className="text-gray-600 mb-4">
                Extract images from any website in seconds
              </p>
              <a 
                href="/" 
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Start Extracting
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- FeatureCard Component ---------- */
function FeatureCard({ 
  icon, 
  title, 
  description
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
} 