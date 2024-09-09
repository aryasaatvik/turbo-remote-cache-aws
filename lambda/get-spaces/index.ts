import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  // TODO: Implement authentication check
  const teamId = event.queryStringParameters?.teamId;

  // TODO: Fetch spaces from database or external service based on teamId or user
  const spaces = [
    {
      id: 'space1',
      name: 'Development Space',
      slug: 'dev-space',
    },
    {
      id: 'space2',
      name: 'Production Space',
      slug: 'prod-space',
    },
    // Add more spaces as needed
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ spaces }),
  };
};