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

      // Try to find user by email in case they just signed up
      let user = null;
      if (userId && userId !== 'guest') {
        user = await users.findOne({ _id: new ObjectId(userId) });
      } else {
        user = await users.findOne({ email: email });
      }

      const creditAmount = parseInt(credits);

      // Scenario 1: User exists (either logged in or just signed up)
      if (user) {
        // If there's an image from download context, deduct 1 credit from the purchased amount
        if (imageUrl && imageUrl !== '' && context === 'download') {
          // Add credits minus 1 (since the image download uses 1 credit)
          const creditsToAdd = creditAmount - 1;
          
          await users.updateOne(
            { _id: user._id },
            { 
              $inc: { credits: creditsToAdd },
              $set: { updatedAt: new Date() }
            }
          );

          // Save the image
          await pictures.insertOne({
            email: email,
            userId: user._id.toString(),
            username: user.username || null,
            image: imageUrl,
            plan: plan,
            createdAt: new Date()
          });
        } else {
          // Pricing page purchase - add all credits
          await users.updateOne(
            { _id: user._id },
            { 
              $inc: { credits: creditAmount },
              $set: { updatedAt: new Date() }
            }
          );
        }

        // Clean up any pending credits for this user
        await pendingCredits.deleteMany({ email: email });
      }
      // Scenario 2: No user found - store as pending credits
      else {
        await pendingCredits.insertOne({
          email: email,
          credits: creditAmount,
          plan: plan,
          imageUrl: imageUrl || '',
          stripeSessionId: session.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          claimed: false
        });
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
