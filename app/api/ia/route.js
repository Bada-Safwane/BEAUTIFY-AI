import { GoogleGenAI } from "@google/genai";
import { uploadToS3 } from "@/app/utils/utils";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const prompt = formData.get('prompt') || 'Enhance the uploaded photo while keeping the person’s identity completely unchanged. Make only subtle, natural improvements: gently brighten the face, improve lighting and clarity, smooth small imperfections without removing unique features, slightly enhance skin tone, whiten teeth very lightly if appropriate, and make the expression look a bit happier by softening facial tension and improving the overall mood of the image. Do NOT alter facial structure, hairstyle, body shape, age, or any defining physical traits. The result should look like the same real person on their best day—natural, authentic, and not edited in an obvious or unrealistic way.';


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
      model: "gemini-2.5-flash-image",
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
