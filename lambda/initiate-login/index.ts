import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const token = process.env.TURBO_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'TURBO_TOKEN not set in environment variables' }),
    };
  }

  const redirectUrl = new URL(event.queryStringParameters?.redirect_uri || '');
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('email', 'user@example.com');

  if (!redirectUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing redirect_uri parameter' }),
    };
  }

  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl.href,
    },
    body: '',
  };
};