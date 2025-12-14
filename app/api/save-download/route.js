import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const SECRET = process.env.SECRET || 'your-secret-key-change-this';

// Connect to MongoDB if not already connected
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

// Define Picture schema
const pictureSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: false,
  },
  username: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: true,
  },
  plan: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Picture = mongoose.models.Picture || mongoose.model('Picture', pictureSchema);

export async function POST(request) {
  try {
    await connectDB();

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
      }
    }

    if (!email || !imageUrl) {
      return Response.json(
        { error: 'Email and image URL are required' },
        { status: 400 }
      );
    }

    // Create new picture record
    const newPicture = new Picture({
      email,
      image: imageUrl,
      userId,
      username,
      plan,
    });

    await newPicture.save();

    return Response.json({
      success: true,
      message: 'Download record saved successfully',
    });
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    return Response.json(
      { error: error.message || 'Failed to save download record' },
      { status: 500 }
    );
  }
}
