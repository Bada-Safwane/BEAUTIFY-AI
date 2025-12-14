import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI;
const SECRET = process.env.SECRET;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();

    const database = client.db('GeminiDB');
    const users = database.collection('users');

    const user = await users.findOne({ email });

    if (user) {
      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, username: user.username, email: user.email },
        SECRET,
        { expiresIn: '7d' }
      );

      // Redirect to home with token in URL (will be picked up by frontend)
      return NextResponse.redirect(new URL(`/?googleAuth=true&token=${token}`, request.url));
    }
  } catch (error) {
    console.error('Google callback error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }

  return NextResponse.redirect(new URL('/', request.url));
}
