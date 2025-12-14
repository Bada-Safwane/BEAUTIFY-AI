import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const SECRET = process.env.SECRET || 'your-secret-key-change-this';

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

// GET - Get user account info and images
export async function GET(request) {
  let client;

  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const users = database.collection('users');
    const pictures = database.collection('pictures');

    // Get user info
    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's images - query by userId as string
    console.log('Fetching images for userId:', decoded.userId);
    const userImages = await pictures
      .find({ userId: decoded.userId.toString() })
      .sort({ createdAt: -1 })
      .toArray();

    console.log('Found', userImages.length, 'images for user');

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        credits: user.credits,
        createdAt: user.createdAt
      },
      images: userImages
    });

  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get account info' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// PUT - Update user account info
export async function PUT(request) {
  let client;

  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { username, email, credits } = await request.json();

    // Build update object dynamically
    const updateFields = {
      updatedAt: new Date()
    };

    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const users = database.collection('users');

    // If credits is provided, update only credits (for credit deduction)
    if (credits !== undefined) {
      updateFields.credits = credits;

      const result = await users.updateOne(
        { _id: new ObjectId(decoded.userId) },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: { credits }
      });
    }

    // Otherwise, update username and email (profile update)
    if (!username || !email) {
      return NextResponse.json(
        { success: false, error: 'Username and email are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if new username/email already exists for another user
    const existingUser = await users.findOne({
      _id: { $ne: new ObjectId(decoded.userId) },
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    updateFields.username = username;
    updateFields.email = email;

    // Update user
    const result = await users.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username,
        email
      }
    });

  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update account' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
