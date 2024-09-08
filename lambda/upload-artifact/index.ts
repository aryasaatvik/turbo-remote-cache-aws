import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('event', event);
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

    const contentLength = event.body?.length;
    console.log('contentLength', contentLength);

    const artifactDuration = event.headers['x-artifact-duration'];
    const artifactClientCi = event.headers['x-artifact-client-ci'];
    const artifactClientInteractive = event.headers['x-artifact-client-interactive'];
    const artifactTag = event.headers['x-artifact-tag'];

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const key = `artifacts/${hash}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: event.body,
      ContentType: 'application/octet-stream',
      Metadata: {
        'artifact-duration': artifactDuration || '',
        'artifact-client-ci': artifactClientCi || '',
        'artifact-client-interactive': artifactClientInteractive || '',
        'artifact-tag': artifactTag || '',
      },
    }));

    const artifactUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }), { expiresIn: 3600 });

    return {
      statusCode: 202,
      body: JSON.stringify({
        urls: [artifactUrl],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    console.error('Error uploading artifact:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};