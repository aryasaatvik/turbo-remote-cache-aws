import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { LambdaFunctions } from './lambda';
import { APIGateway } from './api';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
export interface TurboRemoteCacheProps {
  /**
   * Turbo Token
   * @deprecated Use authorizerFunction instead for authentication
   * Used only if custom authorizer is not provided
   * @example generate a random string using `openssl rand -base64 32`
   */
  turboToken?: string;

  /**
   * Custom authorizer lambda function for API authentication
   * This function should return the teamId in the authorizer context
   * Replaces the deprecated turboToken authentication
   * @example
   * ```typescript
   * new TurboRemoteCache(this, 'Cache', {
   *   authorizerFunction: myCustomAuthorizer,
   * });
   * ```
   */
  authorizerFunction?: lambda.Function;

  /**
   * Custom user info lambda function
   * Implements the /v2/user endpoint for retrieving authenticated user information
   * @example
   * ```typescript
   * new TurboRemoteCache(this, 'Cache', {
   *   userInfoFunction: myUserInfoFunction,
   * });
   * ```
   */
  userInfoFunction?: lambda.Function;

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
  apiProps?: Partial<apigateway.RestApiProps>;

  /**
   * S3 bucket props for the artifacts bucket
   * @default
   *  bucketName: 'turbo-remote-cache-artifacts',
   *  lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
   *  cors: [{
   *    allowedHeaders: ['*'],
   *    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
   *    allowedOrigins: ['*'],
   *    exposedHeaders: ['User-Agent', 'Content-Type', 'Content-Length', 'x-artifact-duration', 'x-artifact-tag'],
   *  }],
   *  removalPolicy: cdk.RemovalPolicy.DESTROY,
   */
  artifactsBucketProps?: Partial<s3.BucketProps>;

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
  eventsTableProps?: Partial<dynamodb.TableProps>;

  /**
   * Common lambda function props for all lambda functions
   */
  lambdaProps?: Partial<lambda.FunctionProps>;
}

export class TurboRemoteCache extends Construct {
  constructor(scope: Construct, id: string, props: TurboRemoteCacheProps) {
    super(scope, id);

    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      versioned: false,
      bucketName: 'turbo-remote-cache-artifacts',
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
        },
      ],
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          exposedHeaders: [
            'User-Agent',
            'Content-Type',
            'Content-Length',
            'x-artifact-duration',
            'x-artifact-tag',
          ],
        }
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
      lambdaProps: props.lambdaProps,
      authorizerFunction: props.authorizerFunction,
      userInfoFunction: props.userInfoFunction,
    });

    const api = new APIGateway(this, 'APIGateway', {
      lambdaFunctions,
      artifactsBucket,
      s3Credentials,
      apiProps: props.apiProps,
    });
  }
}