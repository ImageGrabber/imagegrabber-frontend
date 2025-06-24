'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Notification from '@/components/Notification';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Codepen, Settings, Save, Box } from 'lucide-react';

type NotificationState = {
  type: 'success' | 'error';
  title: string;
  message: string;
  isVisible: boolean;
};

interface UserSettings {
  wordpress_url?: string;
  wordpress_username?: string;
  wordpress_password?: string;
  shopify_store?: string;
  shopify_access_token?: string;
  shopify_product_id?: string;
}

const SettingsPage = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('wordpress');

  // WP & Shopify State
  const [settings, setSettings] = useState<UserSettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [notification, setNotification] = useState<NotificationState>({ isVisible: false, type: 'success', title: '', message: '' });

  // Load WP/Shopify Settings
  const loadWpShopifySettings = useCallback(async () => {
    if (!user) return;
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      setNotification({ isVisible: true, type: 'error', title: 'Load Error', message: 'Could not retrieve WordPress/Shopify settings.' });
    } finally {
      setLoadingSettings(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWpShopifySettings();
    } else {
      setLoadingSettings(false);
    }
  }, [user, loadWpShopifySettings]);

  const handleSettingsChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveWpShopifySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('user_settings').upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() });
      if (error) throw error;
      setNotification({ isVisible: true, type: 'success', title: 'Success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setNotification({ isVisible: true, type: 'error', title: 'Error Saving', message: `Failed to save settings: ${errorMessage}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Button & Input Styles
  const buttonClasses = "px-4 py-2 rounded-lg font-semibold text-white shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClasses = `${buttonClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
  const disabledButtonClasses = `${buttonClasses} bg-gray-400 cursor-not-allowed`;
  const tabButtonBase = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500";
  const activeTabClass = "bg-slate-800 text-white";
  const inactiveTabClass = "text-gray-400 hover:bg-slate-800/50 hover:text-white";

  // Input Styles
  const inputBaseClass = "w-full rounded-md border p-2 bg-gray-800/80 border-gray-600/50 text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <DashboardLayout>
      <Notification {...notification} onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))} />
      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white">Settings</h1>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl backdrop-blur-sm">
          {/* Tab Navigation */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-2">
              <button onClick={() => setActiveTab('wordpress')} className={`${tabButtonBase} ${activeTab === 'wordpress' ? activeTabClass : inactiveTabClass}`}>
                <Box className="h-4 w-4" /> WordPress
              </button>
              <button onClick={() => setActiveTab('shopify')} className={`${tabButtonBase} ${activeTab === 'shopify' ? activeTabClass : inactiveTabClass}`}>
                <Settings className="h-4 w-4" /> Shopify
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'wordpress' && (
              <form onSubmit={saveWpShopifySettings}>
                <h2 className="text-xl font-semibold mb-2 text-white">WordPress Integration</h2>
                <p className="text-gray-400 mb-6">Configure your WordPress credentials to push images directly to your media library.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">WordPress URL</label>
                    <input 
                      type="url" 
                      placeholder="https://yoursite.com" 
                      value={settings.wordpress_url || ''} 
                      onChange={(e) => handleSettingsChange('wordpress_url', e.target.value)} 
                      className={inputBaseClass} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input 
                      type="text" 
                      placeholder="Your WordPress username" 
                      value={settings.wordpress_username || ''} 
                      onChange={(e) => handleSettingsChange('wordpress_username', e.target.value)} 
                      className={inputBaseClass} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Application Password</label>
                    <input 
                      type="password" 
                      placeholder="WordPress application password" 
                      value={settings.wordpress_password || ''} 
                      onChange={(e) => handleSettingsChange('wordpress_password', e.target.value)} 
                      className={inputBaseClass} 
                    />
                    <p className="text-xs text-gray-500 mt-1">Generate this in WordPress Admin → Users → Application Passwords</p>
                  </div>
                </div>
                
                <button type="submit" disabled={isSaving || loadingSettings} className={`${isSaving || loadingSettings ? disabledButtonClasses : primaryButtonClasses} mt-6 flex items-center justify-center gap-2`}>
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save WordPress Settings'
                  )}
                </button>
              </form>
            )}

            {activeTab === 'shopify' && (
              <form onSubmit={saveWpShopifySettings}>
                <h2 className="text-xl font-semibold mb-2 text-white">Shopify Integration</h2>
                <p className="text-gray-400 mb-6">Configure your Shopify store to push images as product media.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Store Name</label>
                    <input 
                      type="text" 
                      placeholder="your-store-name" 
                      value={settings.shopify_store || ''} 
                      onChange={(e) => handleSettingsChange('shopify_store', e.target.value)} 
                      className={inputBaseClass} 
                    />
                    <p className="text-xs text-gray-500 mt-1">Just the store name, not the full URL</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Access Token</label>
                    <input 
                      type="password" 
                      placeholder="Shopify access token" 
                      value={settings.shopify_access_token || ''} 
                      onChange={(e) => handleSettingsChange('shopify_access_token', e.target.value)} 
                      className={inputBaseClass} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Product ID (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Default product ID for images" 
                      value={settings.shopify_product_id || ''} 
                      onChange={(e) => handleSettingsChange('shopify_product_id', e.target.value)} 
                      className={inputBaseClass} 
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to choose product during push</p>
                  </div>
                </div>
                
                <button type="submit" disabled={isSaving || loadingSettings} className={`${isSaving || loadingSettings ? disabledButtonClasses : primaryButtonClasses} mt-6 flex items-center justify-center gap-2`}>
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Shopify Settings'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage; 