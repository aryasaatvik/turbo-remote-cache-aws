import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    const hash = event.pathParameters?.hash;
    if (!hash) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing hash parameter' }),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0',
          'x-artifact-tag': '',
        },
      };
    }

    const key = `artifacts/${hash}`;

    try {
      const headResult = await s3Client.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));

      return {
        statusCode: 200,
        body: '',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': headResult.ContentLength?.toString() || '0',
          'x-artifact-tag': headResult.Metadata?.['artifact-tag'] || '',
        },
      };
    } catch (error: any) {
      // if (error.name === 'NotFound' && error.code === 'NoSuchKey') {
      return {
        statusCode: 404,
        body: '',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '0',
          'x-artifact-tag': '',
        },
      };
      // }
      // throw error;
    }
  } catch (error: any) {
    console.error('Error checking artifact existence:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '0',
        'x-artifact-tag': '',
      },
    };
  }
};