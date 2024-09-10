import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface CacheEvent {
  sessionId: string;
  source: 'LOCAL' | 'REMOTE';
  event: 'HIT' | 'MISS';
  hash: string;
  duration?: number;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const cacheEvents: CacheEvent[] = JSON.parse(event.body);

    if (!Array.isArray(cacheEvents) || cacheEvents.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body format' }),
      };
    }

    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    const timestamp = new Date().toISOString();
    const key = `events/${timestamp}-${Math.random().toString(36).substring(2, 15)}.json`;

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(cacheEvents),
      ContentType: 'application/json',
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Events recorded successfully' }),
    };
  } catch (error) {
    console.error('Error recording events:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};