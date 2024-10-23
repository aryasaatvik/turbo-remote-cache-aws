import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const token = process.env.TURBO_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'TURBO_TOKEN not set in environment variables' }),
    };
  }

  const user = {
    email: 'user@example.com', // You can keep this mock email or remove it if not needed
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      user,
    }),
  };
};