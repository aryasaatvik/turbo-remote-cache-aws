import { APIGatewayTokenAuthorizerHandler } from "aws-lambda";

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  let token = event.authorizationToken;
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }

  const methodArnParts = event.methodArn.split(':');
  const region = methodArnParts[3];
  const accountId = methodArnParts[4];
  const apiParts = methodArnParts[5].split('/');
  const apiId = apiParts[0];
  const stage = apiParts[1];

  const response = await fetch('https://auth.arya.sh/turborepo/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Unauthorized');
  }

  const userData = await response.json();

  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`
      }]
    },
    context: {
      userId: userData.user.id,
      teamId: userData.team.id,
      teamSlug: userData.team.slug,
    },
  };
};
