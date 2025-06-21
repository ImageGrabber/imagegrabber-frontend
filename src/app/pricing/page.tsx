'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import AuthModal from '@/components/AuthModal';
import Notification from '@/components/Notification';

const paidTiers = [
  {
    name: 'Starter',
    id: 'starter',
    price: '$9',
    description: 'Perfect for individuals and small projects.',
    features: [
      'Unlimited image extractions',
      'WordPress integration',
      'Standard email support',
      'No ads',
    ],
    buttonText: 'Get Started',
  },
  {
    name: 'Professional',
    id: 'professional',
    price: '$29',
    description: 'Ideal for growing businesses and agencies.',
    features: [
      'Unlimited image extractions',
      'WordPress & Shopify integration',
      'Priority email support',
      'Bulk push & advanced features',
    ],
    buttonText: 'Get Started',
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: '$99',
    description: 'For large-scale operations and teams.',
    features: [
      'Unlimited image extractions',
      'All integrations',
      'Dedicated account manager',
      'API Access (coming soon)',
    ],
    buttonText: 'Get Started',
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [notification, setNotification] = useState({ isVisible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

  const handleCheckout = async (planId: string, planName: string) => {
    if (!user) {
      openModal('login');
      return;
    }

    setLoadingPlan(planName);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = 'Could not create checkout session.';
        try {
          const errorData = JSON.parse(errorBody);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // The body was not valid JSON
            errorMessage = errorBody || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }

    } catch (error: any) {
      setNotification({
        isVisible: true,
        type: 'error',
        title: 'Checkout Error',
        message: error.message,
      });
      console.error('Checkout failed:', error);
    } finally {
      setLoadingPlan(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isVisible: false })}
      />
      <AuthModal />
      <main className="isolate">
        <div className="relative pt-24">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
            />
          </div>
          <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">Simple, predictable pricing</h1>
                <p className="mt-6 text-lg leading-8 text-gray-300">
                  Start with 10 free credits. Upgrade to a monthly plan for unlimited extractions and premium features.
                </p>
              </div>
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-7xl lg:grid-cols-4">
                {/* Free Plan Card */}
                <div className="flex flex-col justify-between rounded-3xl p-8 shadow-xl bg-gray-800 border border-gray-700">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">Free</h3>
                        <p className="mt-4 text-sm leading-6 text-gray-300">For personal use or to try out our platform.</p>
                        <p className="mt-6 flex items-baseline gap-x-1">
                            <span className="text-4xl font-bold tracking-tight text-white">10</span>
                            <span className="text-sm font-semibold leading-6 text-gray-400">free credits</span>
                        </p>
                        <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                            <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-blue-400" />Up to 10 image extractions</li>
                            <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-blue-400" />Basic image analysis</li>
                            <li className="flex gap-x-3"><Check className="h-6 w-5 flex-none text-blue-400" />Community support</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => openModal('register')}
                        className="mt-8 block rounded-full py-2 px-3 text-center text-sm font-semibold leading-6 bg-blue-600/80 border border-blue-500/50 text-white hover:bg-blue-500/80 transition-all duration-200"
                    >
                        Sign up for free
                    </button>
                </div>

                {/* Paid Plans */}
                {paidTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="flex flex-col justify-between rounded-3xl p-8 shadow-xl bg-gray-800 border border-gray-700"
                  >
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-white">{tier.name}</h3>
                      <p className="mt-4 text-sm leading-6 text-gray-300">{tier.description}</p>
                      <p className="mt-6 flex items-baseline gap-x-1">
                        <span className="text-4xl font-bold tracking-tight text-white">{tier.price}</span>
                        <span className="text-sm font-semibold leading-6 text-gray-400">/ month</span>
                      </p>
                      <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex gap-x-3">
                            <Check className="h-6 w-5 flex-none text-blue-400" aria-hidden="true" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => handleCheckout(tier.id, tier.name)}
                      disabled={loadingPlan === tier.name}
                      className="mt-8 block rounded-full py-2 px-3 text-center text-sm font-semibold leading-6 bg-gray-800/80 border border-gray-600/50 text-gray-200 hover:bg-gray-700/80 transition-all duration-200 disabled:opacity-50"
                    >
                      {loadingPlan === tier.name ? 'Processing...' : tier.buttonText}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-center text-sm text-gray-500">
                Monthly billing. Cancel anytime. Local taxes may be added during the checkout. All prices in USD.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 