import { APIGatewayTokenAuthorizerHandler } from "aws-lambda";

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  let token = event.authorizationToken;
  if (token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  const turboToken = process.env.TURBO_TOKEN;

  if (token === turboToken) {
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }]
      }
    };
  } else {
    throw new Error('Unauthorized');
  }
};
