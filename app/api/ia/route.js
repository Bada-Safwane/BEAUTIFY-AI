import { GoogleGenAI } from "@google/genai";
import { uploadToS3 } from "@/app/utils/utils";

export const maxDuration = 300; // Increase to 5 minutes for image processing
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const prompt = formData.get('prompt') || 'enhance this photo with professional lighting and make the person handsome and attractive without changing their features too much';


    if (!file) {
      return Response.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine mime type from file
    const mimeType = file.type || 'image/jpeg';

    console.log('Starting AI image processing...');
    const ai = new GoogleGenAI({});

    const promptArray = [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ];

    console.log('Calling Gemini API...');
    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: promptArray,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI processing timeout - please try again with a smaller image or simpler prompt')), 280000) // 280 seconds
      )
    ]);

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        // Get generated image data
        const imageData = part.inlineData.data;
        const imageBuffer = Buffer.from(imageData, "base64");

        // Prepare file for S3 upload
        const fileForS3 = {
          buffer: imageBuffer,
          originalname: `generated-${Date.now()}.png`
        };

        // Upload to S3
        const s3Url = await uploadToS3(fileForS3);
        console.log("Image uploaded to S3:", s3Url);

        return Response.json({ 
          success: true,
          imageUrl: s3Url,
          message: "Image processed and uploaded successfully"
        });
      }
    }

    console.error('No valid image data in AI response');
    return Response.json(
      { error: 'No valid response from AI - please try again' },
      { status: 500 }
    );
  } catch (error) {
    console.error('API Error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process image. Please try again.';
    
    if (error.message?.includes('timeout')) {
      errorMessage = 'Processing took too long. Try using a smaller image or simpler prompt.';
    } else if (error.message?.includes('API error')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'Service limit reached. Please try again later.';
    }
    
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
