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
        console.log('Saving image with userId:', userId, 'username:', username, 'email:', email);
      }
    }

    if (!email || !imageUrl) {
      return NextResponse.json(
        { error: 'Email and image URL are required' },
        { status: 400 }
      );
    }

    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const pictures = database.collection('pictures');

    // Insert the picture record
    const result = await pictures.insertOne({
      email,
      userId: userId || null,
      username: username || null,
      image: imageUrl,
      plan: plan || null,
      createdAt: new Date()
    });

    console.log('Picture saved successfully:', result.insertedId);

    return NextResponse.json({
      success: true,
      message: 'Download record saved successfully',
      pictureId: result.insertedId
    });
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save download record' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
