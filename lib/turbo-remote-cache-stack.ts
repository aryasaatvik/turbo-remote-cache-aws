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

    const statusFunction = new lambda.Function(this, 'StatusFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const recordEventsFunction = new lambda.Function(this, 'RecordEventsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'record-events.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    const artifactQueryFunction = new lambda.Function(this, 'ArtifactQueryFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'artifact-query.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: artifactsBucket.bucketName,
      },
    });

    // turbo login
    const initiateLoginFunction = new lambda.Function(this, 'InitiateLoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'initiate-login.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    const loginSuccessFunction = new lambda.Function(this, 'LoginSuccessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'login-success.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    const getUserInfoFunction = new lambda.Function(this, 'GetUserInfoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get-user-info.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
    });

    // Grant necessary permissions
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
    });

    // Create resources and methods
    const v8Resource = api.root.addResource('v8');
    const artifactsResource = v8Resource.addResource('artifacts');

    const eventsResource = artifactsResource.addResource('events');
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(recordEventsFunction));

    const statusResource = artifactsResource.addResource('status');
    statusResource.addMethod('GET', new apigateway.LambdaIntegration(statusFunction));

    const hashResource = artifactsResource.addResource('{hash}');

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

    const putIntegration = new apigateway.AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'PUT',
      path: `${artifactsBucket.bucketName}/artifacts/{hash}`,
      options: {
        credentialsRole: s3Credentials,
        integrationResponses: [
          {
            statusCode: '202',
            responseTemplates: {
              'application/json': JSON.stringify({
                urls: [
                  "https://$util.escapeJavaScript($context.domainName)/artifacts/$input.params('hash')"
                ]
              }),
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
            },
          },
          {
            selectionPattern: '4\\d{2}',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({ message: 'Bad request' }),
            },
          },
        ],
        requestParameters: {
          'integration.request.path.hash': 'method.request.path.hash',
          'integration.request.header.Content-Length': 'method.request.header.Content-Length',
          'integration.request.header.x-amz-meta-artifact-duration': 'method.request.header.x-artifact-duration',
          'integration.request.header.x-amz-meta-artifact-client-ci': 'method.request.header.x-artifact-client-ci',
          'integration.request.header.x-amz-meta-artifact-client-interactive': 'method.request.header.x-artifact-client-interactive',
          'integration.request.header.x-amz-meta-artifact-tag': 'method.request.header.x-artifact-tag',
        },
      },
    });

    hashResource.addMethod('PUT', putIntegration, {
      requestParameters: {
        'method.request.path.hash': true,
        'method.request.header.Content-Length': true,
        'method.request.header.x-artifact-duration': false,
        'method.request.header.x-artifact-client-ci': false,
        'method.request.header.x-artifact-client-interactive': false,
        'method.request.header.x-artifact-tag': false,
      },
      methodResponses: [
        {
          statusCode: '202',
          responseModels: {
            'application/json': new apigateway.Model(this, 'PutArtifactResponseModel', {
              restApi: api,
              contentType: 'application/json',
              modelName: 'PutArtifactResponse',
              schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  urls: {
                    type: apigateway.JsonSchemaType.ARRAY,
                    items: { type: apigateway.JsonSchemaType.STRING },
                  },
                },
                required: ['urls'],
              },
            }),
          },
          responseParameters: {
            'method.response.header.Content-Type': true,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    artifactsResource.addMethod('POST', new apigateway.LambdaIntegration(artifactQueryFunction));

    // turbo login
    const turborepoResource = api.root.addResource('turborepo');
    const tokenResource = turborepoResource.addResource('token');
    tokenResource.addMethod('GET', new apigateway.LambdaIntegration(initiateLoginFunction));

    const successResource = turborepoResource.addResource('success');
    successResource.addMethod('GET', new apigateway.LambdaIntegration(loginSuccessFunction));

    const v2Resource = api.root.addResource('v2');

    const userResource = v2Resource.addResource('user');
    userResource.addMethod('GET', new apigateway.LambdaIntegration(getUserInfoFunction));
  }
}