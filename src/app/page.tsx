'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Balance from '@/components/dashboard/Balance';
import Campaigns from '@/components/dashboard/Campaigns';
import Overview from '@/components/dashboard/Overview';
import TopCampaigns from '@/components/dashboard/TopCampaigns';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';

export interface Image {
  url: string;
  filename: string;
  size?: number; // in bytes
  width?: number;
  height?: number;
  type?: string; // image/jpeg, image/png, etc.
  quality?: 'low' | 'medium' | 'high';
}

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-4 space-y-6">
              <Overview />
              <TopCampaigns />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              <Balance />
              {/* Ads Card */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Ads</h2>
                 <div className="h-48 bg-gray-700/50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Ads coming soon...</p>
                </div>
              </div>
            </div>

            {/* Popular Campaigns Table (Full Width) */}
            <div className="lg:col-span-6">
              <Campaigns />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show landing page for non-logged-in users
  return (
    <div className="min-h-screen">
      <Header />
      <div>
        <HeroSection isLoading={false} onScrape={() => {}} />
      </div>
    </div>
  );
}




