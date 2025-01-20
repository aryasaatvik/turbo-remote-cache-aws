import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TurboRemoteCache } from 'turbo-remote-cache-construct';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    if (!process.env.TURBO_TOKEN) {
      throw new Error('TURBO_TOKEN is not set');
    }

    const aryaAuthorizer = new NodejsFunction(this, 'AryaAuthorizer', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'arya-authorizer', 'index.ts'),
    });

    const userInfo = new NodejsFunction(this, 'UserInfo', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '..', 'lambda', 'get-user-info', 'index.ts'),
    });

    new TurboRemoteCache(this, 'TurboRemoteCache', {
      turboToken: process.env.TURBO_TOKEN,
      apiProps: {
        domainName: {
          domainName: 'turbo-remote-cache.arya.sh',
          certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:654654387918:certificate/458b8937-86f4-4c1d-86bb-d43b5e6d20c0'),
          endpointType: apigateway.EndpointType.EDGE,
          securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        },
      },
      authorizerFunction: aryaAuthorizer,
      userInfoFunction: userInfo,
      lambdaProps: {
        memorySize: 1024,
      },
      artifactsBucketProps: {
        bucketName: 'turbo-remote-cache-artifacts',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
      eventsTableProps: {
        tableName: 'turbo-remote-cache-events',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });
  }
}
