import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TurboRemoteCache } from 'turbo-remote-cache-construct';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    if (!process.env.TURBO_TOKEN) {
      throw new Error('TURBO_TOKEN is not set');
    }

    new TurboRemoteCache(this, 'TurboRemoteCache', {
      turboToken: process.env.TURBO_TOKEN,
      apiProps: {
        // if you want to use a custom domain, uncomment the following
        // domainName: {
        //   domainName: 'your-custom-domain.com',
        //   certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'),
        //   endpointType: apigateway.EndpointType.EDGE,
        //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        // },
      },
      artifactsBucketProps: {
        bucketName: `turbo-remote-cache-artifacts-${this.account}-${this.region}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
      eventsTableProps: {
        tableName: `turbo-remote-cache-events-${this.account}-${this.region}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });
  }
}