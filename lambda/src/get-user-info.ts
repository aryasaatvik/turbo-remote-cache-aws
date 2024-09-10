import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  // TODO: Implement proper authentication using the bearer token
  const authHeader = event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const token = authHeader.split(' ')[1];
  // TODO: Validate the token and fetch user information

  // Mock user data (replace with actual user data fetching logic)
  const user = {
    id: '123456',
    username: 'johndoe',
    email: 'johndoe@example.com',
    name: 'John Doe',
    created_at: new Date().toISOString()
  };

  return {
    statusCode: 200,
    body: JSON.stringify({ user }),
  };
};