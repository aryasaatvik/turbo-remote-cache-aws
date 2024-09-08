import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
      };
    }

    const key = `artifacts/${hash}`;

    const getObjectResult = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    }));

    const body = await getObjectResult.Body?.transformToString();

    return {
      statusCode: 200,
      body: body || '',
      isBase64Encoded: false,
      headers: {
        'Content-Type': getObjectResult.ContentType || 'application/octet-stream',
        'Content-Length': getObjectResult.ContentLength?.toString() || '0',
        'x-artifact-tag': getObjectResult.Metadata?.['artifact-tag'] || '',
      },
    };

  } catch (error: any) {
    console.error('Error downloading artifact:', error);
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