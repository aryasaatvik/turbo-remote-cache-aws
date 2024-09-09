import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30),
        },
      ],
    });

    const s3Credentials = new iam.Role(this, 'S3CredentialsRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('apigateway.amazonaws.com'),
        new iam.AccountPrincipal(this.account)
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    artifactsBucket.grantReadWrite(s3Credentials);

    const recordEventsFunction = new lambda.Function(this, 'RecordEventsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'record-events')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const statusFunction = new lambda.Function(this, 'StatusFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'status')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const uploadArtifactFunction = new lambda.Function(this, 'UploadArtifactFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'upload-artifact')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const downloadArtifactFunction = new lambda.Function(this, 'DownloadArtifactFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'download-artifact')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const artifactExistsFunction = new lambda.Function(this, 'ArtifactExistsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'artifact-exists')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const artifactQueryFunction = new lambda.Function(this, 'ArtifactQueryFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'artifact-query')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    // Grant necessary permissions
    artifactsBucket.grantReadWrite(uploadArtifactFunction);
    artifactsBucket.grantRead(downloadArtifactFunction);
    artifactsBucket.grantRead(artifactExistsFunction);
    artifactsBucket.grantRead(artifactQueryFunction);
    artifactsBucket.grantReadWrite(recordEventsFunction);
    artifactsBucket.grantRead(statusFunction);

    const logGroup = logs.LogGroup.fromLogGroupName(this, 'LogGroup', '/aws/apigateway/turbo-remote-cache-api');

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'TurboRemoteCacheApi', {
      restApiName: 'Turbo Remote Cache API',
      description: 'API for Turborepo Remote Cache',
      cloudWatchRole: true,
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      binaryMediaTypes: ['application/octet-stream'],
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    // Create resources and methods
    const v8Resource = api.root.addResource('v8');
    const artifactsResource = v8Resource.addResource('artifacts');

    const eventsResource = artifactsResource.addResource('events');
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(recordEventsFunction));

    const statusResource = artifactsResource.addResource('status');
    statusResource.addMethod('GET', new apigateway.LambdaIntegration(statusFunction));

    const hashResource = artifactsResource.addResource('{hash}');
    hashResource.addMethod('PUT', new apigateway.LambdaIntegration(uploadArtifactFunction));
    hashResource.addMethod('GET', new apigateway.LambdaIntegration(downloadArtifactFunction));
    hashResource.addMethod('HEAD', new apigateway.LambdaIntegration(artifactExistsFunction));

    artifactsResource.addMethod('POST', new apigateway.LambdaIntegration(artifactQueryFunction));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Turbo Remote Cache API URL',
    });
  }
}