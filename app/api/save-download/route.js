import mongoose from 'mongoose';

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

// Define Picture schema
const pictureSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
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

    const { email, imageUrl } = await request.json();

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
