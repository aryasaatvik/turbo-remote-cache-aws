import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { LambdaFunctions } from './lambda';
import { APIGateway } from './api';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
export interface TurboRemoteCacheProps {
  /**
   * API Gateway props
   * @default
   *  restApiName: 'Turborepo Remote Cache API',
   *  description: 'Turborepo is an intelligent build system optimized for JavaScript and TypeScript codebases.',
   *  cloudWatchRole: true,
   *  deployOptions: {
   *    documentationVersion: '8.0.0',
   *    loggingLevel: apigateway.MethodLoggingLevel.INFO,
   *    accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
   *    accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
   *    dataTraceEnabled: true,
   *    tracingEnabled: true,
   *  },
   *  binaryMediaTypes: ['application/octet-stream'],
   */
  apiProps?: apigateway.RestApiProps,
  /**
   * S3 bucket props for the artifacts bucket
   * @default
   *  bucketName: 'turbo-remote-cache-artifacts',
   *  lifecycleRules: [
   *    {
   *      expiration: cdk.Duration.days(30),
   *    },
   *  ],
   *  removalPolicy: cdk.RemovalPolicy.DESTROY,
   */
  artifactsBucketProps?: s3.BucketProps,
  /**
   * DynamoDB table props for the events table
   * @default
   *  tableName: 'turbo-remote-cache-events',
   *  billingMode: dynamodb.BillingMode.PROVISIONED,
   *  readCapacity: 5,
   *  writeCapacity: 5,
   *  timeToLiveAttribute: 'ttl',
   *  removalPolicy: cdk.RemovalPolicy.DESTROY,
   */
  eventsTableProps?: dynamodb.TableProps
}

export class TurboRemoteCache extends Construct {
  constructor(scope: Construct, id: string, props: TurboRemoteCacheProps) {
    super(scope, id);

    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      versioned: false,
      bucketName: 'turbo-remote-cache-artifacts',
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      ...props.artifactsBucketProps,
    });

    const s3Credentials = new iam.Role(this, 'S3CredentialsRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    artifactsBucket.grantReadWrite(s3Credentials);

    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'turbo-remote-cache-events',
      partitionKey: { name: 'hash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      ...props.eventsTableProps,
    });

    const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions', {
      artifactsBucket,
      eventsTable,
    });

    const api = new APIGateway(this, 'APIGateway', {
      lambdaFunctions,
      artifactsBucket,
      s3Credentials,
      apiProps: props.apiProps,
    });
  }
}