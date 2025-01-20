import type { APIGatewayProxyHandler } from 'aws-lambda';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { Hash } from '@aws-sdk/hash-node';
import { parseUrl } from '@aws-sdk/url-parser';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { formatUrl } from '@aws-sdk/util-format-url';

/**
 * Preflight request for the artifact resource
 *
 * @param event lambda event
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestMethod = event.headers['access-control-request-method'];
  const signableHeaders = event.headers['access-control-request-headers']?.split(',').map(header => header.trim()).filter(header => header !== 'Authorization');
  const requestHeaders = signableHeaders?.reduce((acc: Record<string, string>, header) => {
    if (event.headers[header]) {
      acc[header] = event.headers[header];
    }
    return acc;
  }, {});

  if (!requestMethod) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required headers' }),
    };
  }

  const teamId = event.requestContext.authorizer?.teamId;

  if (!teamId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing teamId' }),
    };
  }

  let command: GetObjectCommand | PutObjectCommand | undefined;
  if (requestMethod === 'GET') {
    command = new GetObjectCommand({
      Bucket: process.env.ARTIFACTS_BUCKET,
      Key: `${teamId}/${event.pathParameters?.hash}`,
    });
  } else if (requestMethod === 'PUT') {
    command = new PutObjectCommand({
      Bucket: process.env.ARTIFACTS_BUCKET,
      Key: `${teamId}/${event.pathParameters?.hash}`,
      ContentType: event.headers['content-type'],
    });
  }

  if (!command) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request method' }),
    };
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    throw new Error('AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION must be set');
  }

  const presigner = new S3RequestPresigner({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
    region: process.env.AWS_REGION,
    sha256: Hash.bind(null, 'sha256'),
  });

  const url = parseUrl(`https://${process.env.ARTIFACTS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${teamId}/${event.pathParameters?.hash}`);
  const request = new HttpRequest({
    ...url,
    method: requestMethod,
    query: {
      teamId: teamId,
    },
    headers: requestHeaders,
  });
  const presignedUrl = await presigner.presign(request, {
    expiresIn: 60 * 60 * 24,
    signableHeaders: signableHeaders ? new Set(signableHeaders) : undefined,
  });
  const formattedUrl = formatUrl(presignedUrl);

  // turborepo cli appends teamId to the url, so we need to remove it to ensure valid signature
  const responseUrl = new URL(formattedUrl);
  responseUrl.searchParams.delete('teamId');

  return {
    statusCode: 200,
    headers: {
      location: responseUrl.href,
      allow_authorization_header: false,
    },
    body: '',
  };
};
