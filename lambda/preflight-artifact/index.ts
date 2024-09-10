import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });


//             .client
// .request(Method::OPTIONS, request_url)
// .header("User-Agent", self.user_agent.clone())
// .header("Access-Control-Request-Method", request_method)
// .header("Access-Control-Request-Headers", request_headers)
// .header("Authorization", format!("Bearer {}", token));

/**
 * Preflight request for the artifact resource
 *
 * @param event lambda event
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const requestMethod = event.headers['access-control-request-method'];
  const requestHeaders = event.headers['access-control-request-headers']?.split(',').map(header => header.trim()) ?? [];
  requestHeaders.push('slug');
  console.log('requestMethod', requestMethod);
  console.log('requestHeaders', requestHeaders);
  console.log('event', event);

  let command: GetObjectCommand | PutObjectCommand | undefined;
  if (requestMethod === 'GET') {
    command = new GetObjectCommand({
      Bucket: process.env.ARTIFACTS_BUCKET,
      Key: `artifacts/${event.pathParameters?.hash}`,
    });
  } else if (requestMethod === 'PUT') {
    command = new PutObjectCommand({
      Bucket: process.env.ARTIFACTS_BUCKET,
      Key: `artifacts/${event.pathParameters?.hash}`,
    });
  }

  if (!command) {
    return {
      statusCode: 400,
      body: 'Invalid request method',
    };
  }

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 60 * 24,
    unsignableHeaders: new Set(requestHeaders),
  });

  return {
    statusCode: 200,
    headers: {
      Location: presignedUrl,
    },
    body: '',
  };
};