import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// This is your Stripe CLI webhook secret for testing your endpoint locally.
// You will need to add this to your .env.local file.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    if (!sig) {
      throw new Error('No stripe-signature header found.');
    }
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const creditsPurchased = session.metadata?.creditsPurchased ? parseInt(session.metadata.creditsPurchased, 10) : 0;

      if (!userId || !creditsPurchased) {
        console.error('❌ Missing metadata for userId or creditsPurchased in checkout session');
        return new NextResponse('Webhook Error: Missing metadata', { status: 400 });
      }

      try {
        // Fetch the user's current credit balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          throw new Error(`Could not find profile for user ${userId}: ${profileError?.message}`);
        }

        const currentCredits = profile.credits || 0;
        const newCredits = currentCredits + creditsPurchased;

        // Update the user's credit balance
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Could not update credits for user ${userId}: ${updateError.message}`);
        }
        
        console.log(`✅ Successfully added ${creditsPurchased} credits to user ${userId}. New balance: ${newCredits}`);

      } catch (error: any) {
        console.error(error.message);
        return new NextResponse(`Webhook processing error: ${error.message}`, { status: 500 });
      }
      
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse('OK', { status: 200 });
} 