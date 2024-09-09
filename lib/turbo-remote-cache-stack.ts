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

    const initiateLoginFunction = new lambda.Function(this, 'InitiateLoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'initiate-login')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    const loginSuccessFunction = new lambda.Function(this, 'LoginSuccessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'login-success')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    const getUserInfoFunction = new lambda.Function(this, 'GetUserInfoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'get-user-info')),
    });

    const getTeamsFunction = new lambda.Function(this, 'GetTeamsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'get-teams')),
    });

    const getSpecificTeamFunction = new lambda.Function(this, 'GetSpecificTeamFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'get-specific-team')),
    });

    const getSpacesFunction = new lambda.Function(this, 'GetSpacesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist', 'get-spaces')),
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
    const putIntegration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'PUT',
      path: `${artifactsBucket.bucketName}/artifacts/{hash}`,
      options: {
        credentialsRole: s3Credentials,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({ success: true }),
            },
          },
        ],
        requestParameters: {
          'integration.request.path.hash': 'method.request.path.hash',
          'integration.request.header.Content-Type': 'method.request.header.Content-Type',
        },
      },
    });
    hashResource.addMethod('PUT', putIntegration, {
      requestParameters: {
        'method.request.path.hash': true,
        'method.request.header.Content-Type': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    const getIntegration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `${artifactsBucket.bucketName}/artifacts/{hash}`,
      options: {
        credentialsRole: s3Credentials,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': 'integration.response.header.Content-Type',
            },
            contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY,
          },
          {
            selectionPattern: '404',
            statusCode: '404',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'Object not found',
                error: "$util.escapeJavaScript($input.path('$.errorMessage'))"
              }),
            },
          },
          {
            selectionPattern: '5\\d{2}',
            statusCode: '500',
            responseTemplates: {
              'application/json': JSON.stringify({
                message: 'Internal server error',
                error: "$util.escapeJavaScript($input.path('$.errorMessage'))"
              }),
            },
          },
        ],
        requestParameters: {
          'integration.request.path.hash': 'method.request.path.hash',
        },
      },
    });

    hashResource.addMethod('GET', getIntegration, {
      requestParameters: {
        'method.request.path.hash': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '500',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    const headIntegration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'HEAD',
      path: `${artifactsBucket.bucketName}/artifacts/{hash}`,
      options: {
        credentialsRole: s3Credentials,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Length': 'integration.response.header.Content-Length',
              'method.response.header.Content-Type': 'integration.response.header.Content-Type',
              'method.response.header.ETag': 'integration.response.header.ETag',
              'method.response.header.Last-Modified': 'integration.response.header.Last-Modified',
            },
          },
          {
            selectionPattern: '404',
            statusCode: '404',
          },
        ],
        requestParameters: {
          'integration.request.path.hash': 'method.request.path.hash',
        },
      },
    });

    hashResource.addMethod('HEAD', headIntegration, {
      requestParameters: {
        'method.request.path.hash': true,
      },
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Length': true,
            'method.response.header.Content-Type': true,
            'method.response.header.ETag': true,
            'method.response.header.Last-Modified': true,
          },
        },
        {
          statusCode: '404',
        },
      ],
    });

    artifactsResource.addMethod('POST', new apigateway.LambdaIntegration(artifactQueryFunction));

    // Create resources and methods for new endpoints
    const turborepoResource = api.root.addResource('turborepo');
    const tokenResource = turborepoResource.addResource('token');
    tokenResource.addMethod('GET', new apigateway.LambdaIntegration(initiateLoginFunction));

    const successResource = turborepoResource.addResource('success');
    successResource.addMethod('GET', new apigateway.LambdaIntegration(loginSuccessFunction));

    const v2Resource = api.root.addResource('v2');

    const userResource = v2Resource.addResource('user');
    userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserInfoFunction));

    const teamsResource = v2Resource.addResource('teams');
    teamsResource.addMethod('GET', new apigateway.LambdaIntegration(getTeamsFunction));

    const specificTeamResource = teamsResource.addResource('{teamId}');
    specificTeamResource.addMethod('GET', new apigateway.LambdaIntegration(getSpecificTeamFunction));

    const v0Resource = api.root.addResource('v0');
    const spacesResource = v0Resource.addResource('spaces');
    spacesResource.addMethod('GET', new apigateway.LambdaIntegration(getSpacesFunction));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Turbo Remote Cache API URL',
    });
  }
}