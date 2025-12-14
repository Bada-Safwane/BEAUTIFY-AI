import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.ID,
        secretAccessKey: process.env.SECRET,
    }
});

const uploadToS3 = async (file) => {
    try {
        const fileExtension = file.originalname.split('.').pop();
        const key = `${uuidv4()}.${fileExtension}`;

        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: key,
            Body: file.buffer
        };

        await s3Client.send(new PutObjectCommand(params));
        const location = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${key}`;
        console.log(`File uploaded successfully. ${location}`);
        return location;

    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload file to S3');
    }
};

export { uploadToS3 };