'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import React from 'react';

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
    <div className="space-y-2 text-sm text-gray-700">
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
      <div className="mt-2 text-xs text-gray-500">
        Access token should start with <code>shpat_</code>.<br/>
        Product ID is optional - leave empty to upload as theme assets.
      </div>
    </div>
  );

  if (loading || isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-blue-900 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-blue-900 py-8">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col md:flex-row gap-8 mt-8">
            {/* Sidebar (Platform Tabs) */}
            <aside className="w-full md:w-1/3">
              <div className="flex flex-row md:flex-col gap-4 md:gap-6 bg-white rounded-lg shadow-md p-4 md:p-6">
                <button
                  className={`flex-1 md:flex-none text-center px-4 py-3 rounded font-semibold transition-colors border-2 ${selectedPlatform === 'wordpress' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setSelectedPlatform('wordpress')}
                >
                  WordPress
                </button>
                <button
                  className={`flex-1 md:flex-none text-center px-4 py-3 rounded font-semibold transition-colors border-2 ${selectedPlatform === 'shopify' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setSelectedPlatform('shopify')}
                >
                  Shopify
                </button>
              </div>
            </aside>

            {/* Main Content */}
            <main className="w-full md:w-2/3">
              <div className="rounded-lg bg-white p-6 md:p-8 shadow-xl mt-4 md:mt-0">
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Integration Settings</h1>
                {message && (
                  <div className={`mb-6 rounded-lg p-4 ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}
                <form onSubmit={saveSettings} className="space-y-8">
                  {/* WordPress Settings */}
                  {selectedPlatform === 'wordpress' && (
                    <div className="rounded-lg border border-gray-200 p-6">
                      <h2 className="mb-4 text-xl font-semibold text-gray-900 flex items-center">
                        <svg className="mr-2 h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        WordPress Integration
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            WordPress URL
                          </label>
                          <input
                            type="url"
                            value={settings.wordpress_url || ''}
                            onChange={(e) => handleInputChange('wordpress_url', e.target.value)}
                            placeholder="https://yoursite.com"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                          </label>
                          <input
                            type="text"
                            value={settings.wordpress_username || ''}
                            onChange={(e) => handleInputChange('wordpress_username', e.target.value)}
                            placeholder="Your WordPress username"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Application Password
                          </label>
                          <input
                            type="password"
                            value={settings.wordpress_password || ''}
                            onChange={(e) => handleInputChange('wordpress_password', e.target.value)}
                            placeholder="WordPress Application Password (not your login password)"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Generate this in WordPress Admin → Users → Your Profile → Application Passwords
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Shopify Settings */}
                  {selectedPlatform === 'shopify' && (
                    <div className="rounded-lg border border-gray-200 p-6">
                      <h2 className="mb-4 text-xl font-semibold text-gray-900 flex items-center">
                        <svg className="mr-2 h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Shopify Integration
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Store Name
                          </label>
                          <input
                            type="text"
                            value={settings.shopify_store || ''}
                            onChange={(e) => handleInputChange('shopify_store', e.target.value)}
                            placeholder="yourstore.myshopify.com"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={settings.shopify_product_id || ''}
                            onChange={(e) => handleInputChange('shopify_product_id', e.target.value)}
                            placeholder="123456789"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Leave empty to upload as theme assets
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Access Token
                          </label>
                          <input
                            type="password"
                            value={settings.shopify_access_token || ''}
                            onChange={(e) => handleInputChange('shopify_access_token', e.target.value)}
                            placeholder="Shopify Admin API access token"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Create a private app in Shopify Admin to get this token
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="mt-4 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
                {/* Integration Steps Below Form */}
                <div className="mt-10">
                  {selectedPlatform === 'wordpress' ? wordpressSteps : shopifySteps}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
} 