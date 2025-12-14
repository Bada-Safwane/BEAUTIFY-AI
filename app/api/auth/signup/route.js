import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const SECRET = process.env.SECRET;

export async function POST(request) {
  let client;

  try {
    const { username, email, password } = await request.json();

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const users = database.collection('users');
    const pendingCredits = database.collection('pendingCredits');
    const pictures = database.collection('pictures');

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    // Check for pending credits for this email
    const pendingCredit = await pendingCredits.findOne({
      email: email,
      claimed: false,
      expiresAt: { $gt: new Date() }
    });

    const initialCredits = pendingCredit ? pendingCredit.credits : 0;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await users.insertOne({
      username,
      email,
      password: hashedPassword,
      credits: initialCredits,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // If there were pending credits, mark them as claimed and save image if present
    if (pendingCredit) {
      await pendingCredits.updateOne(
        { _id: pendingCredit._id },
        { 
          $set: { 
            claimed: true, 
            claimedAt: new Date(),
            userId: result.insertedId.toString()
          } 
        }
      );
      console.log(`Claimed ${initialCredits} pending credits for ${email}`);

      // If there's an image URL in pending credits, save it to pictures
      if (pendingCredit.imageUrl && pendingCredit.imageUrl !== '') {
        await pictures.insertOne({
          email: email,
          userId: result.insertedId.toString(),
          username: username,
          image: pendingCredit.imageUrl,
          plan: pendingCredit.plan,
          createdAt: new Date()
        });
        console.log(`Saved pending image for user ${email}`);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, username, email },
      SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: result.insertedId,
        username,
        email,
        credits: initialCredits
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
