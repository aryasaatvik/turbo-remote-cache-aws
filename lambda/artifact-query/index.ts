import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

interface ArtifactInfo {
  size: number;
  taskDurationMs: number;
  tag?: string;
}

interface ArtifactQueryResult {
  [hash: string]: ArtifactInfo | { error: { message: string } };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const bucketName = process.env.BUCKET_NAME;
    if (!bucketName) {
      throw new Error('BUCKET_NAME environment variable is not set');
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const { hashes }: { hashes: string[] } = JSON.parse(event.body);

    if (!Array.isArray(hashes) || hashes.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body format' }),
      };
    }

    const result: ArtifactQueryResult = {};

    await Promise.all(hashes.map(async (hash) => {
      const key = `artifacts/${hash}`;
      try {
        const headResult = await s3Client.send(new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }));

        result[hash] = {
          size: headResult.ContentLength || 0,
          taskDurationMs: parseInt(headResult.Metadata?.['artifact-duration'] || '0', 10),
          tag: headResult.Metadata?.['artifact-tag'],
        };
      } catch (error: any) {
        if (error.code === 'NotFound') {
          result[hash] = { error: { message: 'Artifact not found' } };
        } else {
          throw error;
        }
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error: any) {
    console.error('Error querying artifacts:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};