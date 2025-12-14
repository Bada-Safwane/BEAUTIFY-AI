import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { MongoClient, ObjectId } from 'mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const uri = process.env.MONGODB_URI;

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const { userId, email, plan, credits, imageUrl, context, requiresSignup } = session.metadata;

    let client;
    
    try {
      client = new MongoClient(uri);
      await client.connect();

      const database = client.db('GeminiDB');
      const users = database.collection('users');
      const pictures = database.collection('pictures');
      const pendingCredits = database.collection('pendingCredits');

      // Scenario 1: Logged-in user purchasing credits
      if (userId && userId !== 'guest') {
        const creditAmount = parseInt(credits);
        
        await users.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $inc: { credits: creditAmount },
            $set: { updatedAt: new Date() }
          }
        );

        console.log(`Added ${creditAmount} credits to user ${userId}`);

        // If they have an image from download context, save it
        if (imageUrl && imageUrl !== '' && context === 'download') {
          const user = await users.findOne({ _id: new ObjectId(userId) });
          
          await pictures.insertOne({
            email: email,
            userId: userId,
            username: user?.username || null,
            image: imageUrl,
            plan: plan,
            createdAt: new Date()
          });

          console.log(`Saved image for logged-in user ${email}`);
        }
      }
      // Scenario 2: Guest purchasing single image (download context)
      else if (plan === 'single' && context === 'download' && imageUrl && imageUrl !== '') {
        // Just save the image for immediate download, no credits needed
        await pictures.insertOne({
          email: email,
          userId: null,
          username: null,
          image: imageUrl,
          plan: plan,
          createdAt: new Date()
        });

        console.log(`Saved single image for guest ${email}`);
      }
      // Scenario 3: Guest purchasing 3-pack or 10-pack (requires signup)
      else if (requiresSignup === 'true') {
        const creditAmount = parseInt(credits);
        
        // Store pending credits until user signs up
        await pendingCredits.insertOne({
          email: email,
          credits: creditAmount,
          plan: plan,
          stripeSessionId: session.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          claimed: false
        });

        console.log(`Stored ${creditAmount} pending credits for ${email}`);
      }

    } catch (error) {
      console.error('Database error in webhook:', error);
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  return NextResponse.json({ received: true });
}
