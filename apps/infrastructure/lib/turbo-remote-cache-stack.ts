import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TurboRemoteCache } from 'turbo-remote-cache-construct';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new TurboRemoteCache(this, 'TurboRemoteCache', {
      apiProps: {
        domainName: {
          domainName: 'turbo-remote-cache.arya.sh',
          certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:654654387918:certificate/458b8937-86f4-4c1d-86bb-d43b5e6d20c0'),
          endpointType: apigateway.EndpointType.EDGE,
          securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        },
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