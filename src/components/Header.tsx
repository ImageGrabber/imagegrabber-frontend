'use client';

import Link from 'next/link';
import { Search, Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">ImageGrabber</span>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
              Extract
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              API
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="What are you looking for?" 
                className="bg-transparent border-none outline-none text-gray-600 placeholder-gray-400 w-48"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <User className="h-4 w-4 text-orange-600" />
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-medium text-gray-900">Christopher Calzoni</p>
                <p className="text-gray-500">Ukraine</p>
              </div>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
