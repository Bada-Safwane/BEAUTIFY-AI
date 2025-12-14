import { GoogleGenAI } from "@google/genai";
import { uploadToS3 } from "@/app/utils/utils";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const prompt = formData.get('prompt') || 'enhance this photo with professional lighting and improvements to make them more handsome and attractive while keeping their natural features';


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

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: promptArray,
    });

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

    return Response.json(
      { error: 'No valid response from AI' },
      { status: 500 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
