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
    
    console.log('=== CHECKOUT SESSION REQUEST ===');
    console.log('Plan:', plan);
    console.log('Email:', email);
    console.log('ImageUrl:', imageUrl);
    console.log('Context:', context);
    
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
        console.log('Token decoded - UserId:', userId);
      }
    } else {
      console.log('No auth token provided');
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
    const metadata = {
      userId: userId || 'guest',
      email: userEmail,
      plan: plan,
      credits: selectedPlan.credits.toString(),
      imageUrl: imageUrl || '',
      context: context || 'pricing', // 'pricing' or 'download'
      requiresSignup: (userId === null || userId === 'guest') && plan !== 'single' ? 'true' : 'false',
    };
    
    console.log('=== CREATING STRIPE SESSION WITH METADATA ===');
    console.log(JSON.stringify(metadata, null, 2));
    
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
      metadata,
    });
    
    console.log('Stripe session created:', session.id);

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
