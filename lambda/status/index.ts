import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

type RemoteCacheStatus = 'disabled' | 'enabled' | 'over_limit' | 'paused';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    // Check if the bucket exists and is accessible
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

    // TODO: check additional conditions such as usage limits, account status, etc.
    const status: RemoteCacheStatus = 'enabled';

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error: any) {
    console.error('Error checking status:', error);

    if (error.code === 'NotFound' || error.code === 'Forbidden') {
      // If the bucket doesn't exist or is not accessible, consider the cache disabled
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'disabled' }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};