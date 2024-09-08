import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    const uploadArtifactFunction = new lambda.Function(this, 'UploadArtifactFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/upload-artifact'),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const downloadArtifactFunction = new lambda.Function(this, 'DownloadArtifactFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/download-artifact'),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const recordEventsFunction = new lambda.Function(this, 'RecordEventsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/record-events'),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    artifactsBucket.grantReadWrite(uploadArtifactFunction);
    artifactsBucket.grantRead(downloadArtifactFunction);
    artifactsBucket.grantPut(recordEventsFunction);

    const api = new apigateway.RestApi(this, 'TurboRemoteCacheApi', {
      restApiName: 'Turbo Remote Cache API',
      description: 'API for Turborepo Remote Cache',
    });

    const artifactsResource = api.root.addResource('v8').addResource('artifacts');

    const eventsResource = artifactsResource.addResource('events');
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(recordEventsFunction));

    const hashResource = artifactsResource.addResource('{hash}');
    hashResource.addMethod('PUT', new apigateway.LambdaIntegration(uploadArtifactFunction));
    hashResource.addMethod('GET', new apigateway.LambdaIntegration(downloadArtifactFunction));
    hashResource.addMethod('HEAD', new apigateway.LambdaIntegration(downloadArtifactFunction));

    const statusResource = artifactsResource.addResource('status');

    const statusCheckFunction = new lambda.Function(this, 'StatusCheckFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/status-check'),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    artifactsBucket.grantRead(statusCheckFunction);

    statusResource.addMethod('GET', new apigateway.LambdaIntegration(statusCheckFunction));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Turbo Remote Cache API URL',
    });
  }
}