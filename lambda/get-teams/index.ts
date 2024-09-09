import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  // TODO: Implement authentication check
  // TODO: Fetch teams from database or external service

  const teams = [
    {
      id: 'team1',
      slug: 'awesome-team',
      name: 'Awesome Team',
      created_at: new Date().toISOString(),
    },
    // Add more teams as needed
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ teams }),
  };
};