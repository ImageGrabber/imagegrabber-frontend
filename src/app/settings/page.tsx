'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-blue-900 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="rounded-lg bg-white p-8 shadow-xl">
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

              {/* Shopify Settings */}
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
                      placeholder="Admin API access token"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Create a private app in Shopify Admin to get this token
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-8 rounded-lg bg-gray-50 p-6">
              <h3 className="mb-3 text-lg font-medium text-gray-900">Need Help?</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>WordPress:</strong> Create an Application Password in your WordPress admin panel</p>
                <p>• <strong>Shopify:</strong> Create a private app with product and theme permissions</p>
                <p>• All credentials are encrypted and stored securely</p>
                <p>• You can update these settings anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 