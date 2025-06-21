import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// NOTE: You will need to create products and prices in your Stripe dashboard
// and store the price IDs as environment variables.
// Example: STARTER_PLAN_PRICE_ID=price_12345
const PLAN_PRICE_IDS = {
  starter: process.env.STARTER_PLAN_PRICE_ID!,
  professional: process.env.PROFESSIONAL_PLAN_PRICE_ID!,
  enterprise: process.env.ENTERPRISE_PLAN_PRICE_ID!,
};

const CREDITS_PER_PLAN = {
    starter: 200,
    professional: 1000,
    enterprise: 5000,
}

type PlanId = keyof typeof PLAN_PRICE_IDS;

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });

  try {
    // Refresh the session to ensure it's not stale
    await supabaseServer.auth.getSession(); 
    
    const { data: { user } } = await supabaseServer.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const { planId } = await req.json();

    if (!planId || !PLAN_PRICE_IDS[planId as PlanId]) {
      return new NextResponse('Invalid plan ID', { status: 400 });
    }

    const priceId = PLAN_PRICE_IDS[planId as PlanId];
    const creditsPurchased = CREDITS_PER_PLAN[planId as PlanId];
    const successUrl = `${req.headers.get('origin')}/`;
    const cancelUrl = `${req.headers.get('origin')}/pricing`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        creditsPurchased: creditsPurchased.toString(),
      },
    });

    if (!session.url) {
        throw new Error('Could not create checkout session');
    }

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error(`Error creating checkout session: ${error.message}`);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 