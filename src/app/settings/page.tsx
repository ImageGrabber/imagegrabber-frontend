'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface UserSettings {
  wordpress_url?: string;
  wordpress_username?: string;
  wordpress_password?: string;
  shopify_store?: string;
  shopify_access_token?: string;
  shopify_product_id?: string;
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'wordpress' | 'shopify'>('wordpress');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      loadSettings();
    }
  }, [user, loading, router]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      setMessage({ type: 'error', text: `Failed to load settings: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setMessage({ type: 'error', text: `Failed to save settings: ${errorMessage}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Integration steps (static for now)
  const wordpressSteps = (
    <div className="space-y-2 text-sm text-gray-700">
      <h3 className="font-semibold mb-2">WordPress Integration Steps</h3>
      <ol className="list-decimal list-inside space-y-1">
        <li>Log in to your WordPress admin dashboard</li>
        <li>Go to <b>Users</b> → <b>Your Profile</b></li>
        <li>Scroll down to <b>Application Passwords</b> section</li>
        <li>Enter a name for the application (e.g., "ImageGrabber")</li>
        <li>Click <b>Add New Application Password</b></li>
        <li>Copy the generated password (it will only be shown once)</li>
        <li>Fill in the WordPress section here and click <b>Save Settings</b></li>
      </ol>
      <div className="mt-2 text-xs text-gray-500">
        Use the Application Password, not your login password.<br/>
        The Application Password format: <code>xxxx xxxx xxxx xxxx xxxx xxxx</code>
      </div>
    </div>
  );

  const shopifySteps = (
    <div className="space-y-2 text-sm text-white">
      <h3 className="font-semibold mb-2">Shopify Integration Steps</h3>
      <ol className="list-decimal list-inside space-y-1">
        <li>Log in to your Shopify admin dashboard</li>
        <li>Go to <b>Apps</b> → <b>App and sales channel settings</b></li>
        <li>Click <b>Develop apps</b> &rarr; <b>Create an app</b></li>
        <li>Enter app name (e.g., "ImageGrabber") and create app</li>
        <li>Configure Admin API scopes: <b>write_products</b>, <b>write_themes</b>, <b>write_files</b></li>
        <li>Install the app and copy the <b>Admin API access token</b></li>
        <li>Fill in the Shopify section here and click <b>Save Settings</b></li>
      </ol>
      <div className="mt-2 text-xs text-white">
        Access token should start with <code>shpat_</code>.<br/>
        Product ID is optional - leave empty to upload as theme assets.
      </div>
    </div>
  );

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-8 mt-8 items-center">
            {/* Tabs on top */}
            <div className="flex flex-row gap-4 w-full max-w-lg bg-white/10 border border-white/10 backdrop-blur-md shadow-lg rounded-xl p-4 justify-center">
              <button
                className={`flex-1 text-center px-4 py-3 rounded-lg font-semibold transition-all border-2 ${selectedPlatform === 'wordpress'
                  ? 'bg-blue-600/80 border-blue-500/80 text-white shadow-lg backdrop-blur-md'
                  : 'bg-transparent border-transparent text-gray-200 hover:bg-white/10 hover:border-white/20'}
                `}
                onClick={() => setSelectedPlatform('wordpress')}
              >
                WordPress
              </button>
              <button
                className={`flex-1 text-center px-4 py-3 rounded-lg font-semibold transition-all border-2 ${selectedPlatform === 'shopify'
                  ? 'bg-blue-600/80 border-blue-500/80 text-white shadow-lg backdrop-blur-md'
                  : 'bg-transparent border-transparent text-gray-200 hover:bg-white/10 hover:border-white/20'}
                `}
                onClick={() => setSelectedPlatform('shopify')}
              >
                Shopify
              </button>
            </div>

            {/* Main Content Card below */}
            <main className="w-full max-w-2xl">
              <div className="bg-white/10 border border-white/10 backdrop-blur-md shadow-xl rounded-2xl p-8 mt-0">
                <h1 className="mb-8 text-3xl font-bold text-gray-100">Integration Settings</h1>
                {message && (
                  <div className={`mb-6 rounded-lg p-4 ${
                    message.type === 'success' 
                      ? 'bg-green-400/10 text-green-200 border border-green-400/20' 
                      : 'bg-red-400/10 text-red-200 border border-red-400/20'
                  }`}>
                    {message.text}
                  </div>
                )}
                <form onSubmit={saveSettings} className="space-y-8">
                  {/* WordPress Settings */}
                  {selectedPlatform === 'wordpress' && (
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
                      <h2 className="mb-4 text-xl font-semibold text-gray-100 flex items-center">
                        <svg className="mr-2 h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        WordPress Integration
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            WordPress URL
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-blue-400/40 focus:bg-white/20 transition"
                            value={settings.wordpress_url || ''}
                            onChange={e => handleInputChange('wordpress_url', e.target.value)}
                            placeholder="https://yourwordpresssite.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-blue-400/40 focus:bg-white/20 transition"
                            value={settings.wordpress_username || ''}
                            onChange={e => handleInputChange('wordpress_username', e.target.value)}
                            placeholder="WordPress Username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Application Password
                          </label>
                          <input
                            type="password"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-blue-400/40 focus:bg-white/20 transition"
                            value={settings.wordpress_password || ''}
                            onChange={e => handleInputChange('wordpress_password', e.target.value)}
                            placeholder="Application Password"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-white">
                          {wordpressSteps}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Shopify Settings */}
                  {selectedPlatform === 'shopify' && (
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6">
                      <h2 className="mb-4 text-xl font-semibold text-gray-100 flex items-center">
                        <svg className="mr-2 h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Shopify Integration
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Store URL
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-green-400/40 focus:bg-white/20 transition"
                            value={settings.shopify_store || ''}
                            onChange={e => handleInputChange('shopify_store', e.target.value)}
                            placeholder="yourstore.myshopify.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Access Token
                          </label>
                          <input
                            type="password"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-green-400/40 focus:bg-white/20 transition"
                            value={settings.shopify_access_token || ''}
                            onChange={e => handleInputChange('shopify_access_token', e.target.value)}
                            placeholder="Admin API Access Token"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-200 mb-2">
                            Product ID (optional)
                          </label>
                          <input
                            type="text"
                            className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder-gray-400 p-2 focus:ring-2 focus:ring-green-400/40 focus:bg-white/20 transition"
                            value={settings.shopify_product_id || ''}
                            onChange={e => handleInputChange('shopify_product_id', e.target.value)}
                            placeholder="Product ID (optional)"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-gray-200">
                          {shopifySteps}
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    className="w-full mt-4 rounded-lg bg-blue-600/80 text-white font-semibold py-3 shadow-lg hover:bg-blue-700/80 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>
              </div>
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 