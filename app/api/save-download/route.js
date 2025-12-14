import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const SECRET = process.env.SECRET || 'your-secret-key-change-this';
const uri = process.env.MONGODB_URI;

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  let client;

  try {
    const { email, imageUrl, plan } = await request.json();
    
    // Validate input
    if (!email || !imageUrl) {
      return NextResponse.json(
        { error: 'Email and image URL are required' },
        { status: 400 }
      );
    }
    
    // Get token from header if available
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = null;
    let username = null;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
        username = decoded.username;
      }
    }

    // Connect to database
    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const pictures = database.collection('pictures');

    // Insert the picture record
    const result = await pictures.insertOne({
      email: email,
      userId: userId || null,
      username: username || null,
      image: imageUrl,
      plan: plan || 'unknown',
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Image saved successfully',
      pictureId: result.insertedId.toString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to save image' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
