import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SECRET = process.env.SECRET || 'your-secret-key-change-this';

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    const { plan, email, imageUrl, context } = await request.json();
    
    // Get token from header if available
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = null;
    let userEmail = email;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
        userEmail = decoded.email;
      }
    }

    // Define pricing plans
    const plans = {
      'single': {
        name: 'Single Image Enhancement',
        amount: 399, // $3.99 in cents
        credits: 1,
        description: 'Enhance 1 image'
      },
      '3-pack': {
        name: '3 Image Credits',
        amount: 999, // $9.99 in cents
        credits: 3,
        description: 'Enhance 3 images'
      },
      '10-pack': {
        name: '10 Image Credits',
        amount: 2500, // $25.00 in cents
        credits: 10,
        description: 'Enhance 10 images'
      }
    };

    const selectedPlan = plans[plan];
    
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}?payment=success${context === 'download' && plan === 'single' ? '&download=true' : ''}`,
      cancel_url: `${request.headers.get('origin')}?payment=cancelled`,
      customer_email: userEmail,
      metadata: {
        userId: userId || 'guest',
        email: userEmail,
        plan: plan,
        credits: selectedPlan.credits.toString(),
        imageUrl: imageUrl || '',
        context: context || 'pricing',
        requiresSignup: (userId === null || userId === 'guest') && plan !== 'single' ? 'true' : 'false',
      },
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
