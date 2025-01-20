import { APIGatewayTokenAuthorizerHandler } from "aws-lambda";

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  let token = event.authorizationToken;
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  const turboToken = process.env.TURBO_TOKEN;

  const methodArnParts = event.methodArn.split(':');
  const region = methodArnParts[3];
  const accountId = methodArnParts[4];
  const apiParts = methodArnParts[5].split('/');
  const apiId = apiParts[0];
  const stage = apiParts[1];

  if (token === turboToken) {
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
        teamId: 'team_turbo_default'
      }
    };
  } else {
    throw new Error('Unauthorized');
  }
};
