import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { LambdaFunctions } from './lambda';
import { getArtifactIntegration } from './get-artifact';
import { headArtifactIntegration } from './head-artifact';
import { putArtifactIntegration } from './put-artifact';

interface APIGatewayProps {
  apiProps?: apigateway.RestApiProps;
  lambdaFunctions: LambdaFunctions;
  artifactsBucket: s3.Bucket;
  s3Credentials: iam.Role;
}

export class APIGateway extends Construct {
  constructor(scope: Construct, id: string, props: APIGatewayProps) {
    super(scope, id);
    const logGroup = logs.LogGroup.fromLogGroupName(this, 'LogGroup', '/aws/apigateway/turbo-remote-cache-api');

    const api = new apigateway.RestApi(this, 'TurboRemoteCacheApi', {
      restApiName: 'Turborepo Remote Cache API',
      description: 'Turborepo is an intelligent build system optimized for JavaScript and TypeScript codebases.',
      cloudWatchRole: true,
      deployOptions: {
        documentationVersion: '8.0.0',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      binaryMediaTypes: ['application/octet-stream'],
      ...props.apiProps,
    });

    new apigateway.CfnDocumentationVersion(this, 'DocumentationVersion', {
      documentationVersion: '8.0.0',
      restApiId: api.restApiId,
    });

    const v8Resource = api.root.addResource('v8');
    const artifactsResource = v8Resource.addResource('artifacts');

    const eventsResource = artifactsResource.addResource('events');
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(props.lambdaFunctions.recordEventsFunction), {
      operationName: 'recordEvents',
      methodResponses: [{ statusCode: '200' }],
      requestParameters: {
        'method.request.header.x-artifact-client-ci': false,
        'method.request.header.x-artifact-client-interactive': false,
      },
      requestModels: {
        'application/json': new apigateway.Model(this, 'RecordEventsModel', {
          restApi: api,
          contentType: 'application/json',
          modelName: 'RecordEventsModel',
          schema: {
            type: apigateway.JsonSchemaType.ARRAY,
            items: {
              type: apigateway.JsonSchemaType.OBJECT,
              properties: {
                sessionId: { type: apigateway.JsonSchemaType.STRING },
                source: { type: apigateway.JsonSchemaType.STRING, enum: ['LOCAL', 'REMOTE'] },
                event: { type: apigateway.JsonSchemaType.STRING, enum: ['HIT', 'MISS'] },
                hash: { type: apigateway.JsonSchemaType.STRING },
                duration: { type: apigateway.JsonSchemaType.NUMBER },
              },
              required: ['sessionId', 'source', 'hash', 'event'],
            },
          },
        }),
      },
    });

    const recordEventDocumentationPart = {
      description: 'Records an artifacts cache usage event. The body of this request is an array of cache usage events. The supported event types are `HIT` and `MISS`. The source is either `LOCAL` the cache event was on the users filesystem cache or `REMOTE` if the cache event is for a remote cache. When the event is a `HIT` the request also accepts a number `duration` which is the time taken to generate the artifact in the cache.',
      summary: 'Record an artifacts cache usage event',
      tags: ['artifacts'],
    }

    new apigateway.CfnDocumentationPart(this, 'ArtifactsEventsDocumentationPart', {
      location: {
        type: 'METHOD',
        method: 'POST',
        path: '/v8/artifacts/events',
      },
      properties: JSON.stringify(recordEventDocumentationPart),
      restApiId: api.restApiId,
    });

    const statusResource = artifactsResource.addResource('status');
    statusResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.statusFunction), {
      operationName: 'status',
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': new apigateway.Model(this, 'StatusResponseModel', {
              restApi: api,
              contentType: 'application/json',
              modelName: 'StatusResponseModel',
              schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                  status: { type: apigateway.JsonSchemaType.STRING, enum: ['disabled', 'enabled', 'over_limit', 'paused'] },
                },
                required: ['status'],
              },
            }),
          },
        },
      ],
    });

    const statusDocumentationPart = {
      description: 'Check the status of Remote Caching for this principal. Returns a JSON-encoded status indicating if Remote Caching is enabled, disabled, or disabled due to usage limits.',
      summary: 'Get status of Remote Caching for this principal',
      tags: ['artifacts'],
    }

    new apigateway.CfnDocumentationPart(this, 'ArtifactsStatusDocumentationPart', {
      location: {
        type: 'METHOD',
        method: 'GET',
        path: '/v8/artifacts/status',
      },
      properties: JSON.stringify(statusDocumentationPart),
      restApiId: api.restApiId,
    });

    const hashResource = artifactsResource.addResource('{hash}');

    // GET /v8/artifacts/{hash}
    getArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // HEAD /v8/artifacts/{hash}
    // Check that a cache artifact with the given `hash` exists. This request returns response headers only
    // and is equivalent to a `GET` request to this endpoint where the response contains no body.
    headArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // PUT /v8/artifacts/{hash}
    // Uploads a cache artifact identified by the `hash` specified on the path.
    // The cache artifact can then be downloaded with the provided `hash`.
    putArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // POST /v8/artifacts
    // Query information about an array of artifacts.
    artifactsResource.addMethod('POST', new apigateway.LambdaIntegration(props.lambdaFunctions.artifactQueryFunction), {
      operationName: 'artifactQuery',
      methodResponses: [{ statusCode: '200' }],
      requestModels: {
        'application/json': new apigateway.Model(this, 'ArtifactQueryModel', {
          restApi: api,
          contentType: 'application/json',
          modelName: 'ArtifactQueryModel',
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              hashes: { type: apigateway.JsonSchemaType.ARRAY, items: { type: apigateway.JsonSchemaType.STRING } },
            },
            required: ['hashes'],
          },
        }),
      },
    });

    const artifactQueryDocumentationPart = {
      description: 'Query information about an array of artifacts.',
      summary: 'Query information about an artifact',
      tags: ['artifacts'],
    }

    new apigateway.CfnDocumentationPart(this, 'ArtifactsQueryDocumentationPart', {
      location: {
        type: 'METHOD',
        method: 'POST',
        path: '/v8/artifacts',
      },
      properties: JSON.stringify(artifactQueryDocumentationPart),
      restApiId: api.restApiId,
    });

    // turbo login
    // TODO: implement turbo login for third party JWTs
    // const turborepoResource = api.root.addResource('turborepo');
    // const tokenResource = turborepoResource.addResource('token');

    // // GET /v8/turborepo/token
    // tokenResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.initiateLoginFunction), {
    //   operationName: 'initiateLogin',
    // });

    // const initiateLoginDocumentationPart = {
    //   description: 'Initiates a login process for Turborepo.',
    //   summary: 'Initiate login',
    //   tags: ['login'],
    // }

    // new apigateway.CfnDocumentationPart(this, 'TurborepoInitiateLoginDocumentationPart', {
    //   location: {
    //     type: 'METHOD',
    //     method: 'GET',
    //     path: '/v8/turborepo/token',
    //   },
    //   properties: JSON.stringify(initiateLoginDocumentationPart),
    //   restApiId: api.restApiId,
    // });

    // // GET /v8/turborepo/success
    // const successResource = turborepoResource.addResource('success');
    // successResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.loginSuccessFunction), {
    //   operationName: 'loginSuccess',
    // });

    // const loginSuccessDocumentationPart = {
    //   description: 'Handles the success of a login process for Turborepo.',
    //   summary: 'Login success',
    //   tags: ['login'],
    // }

    // new apigateway.CfnDocumentationPart(this, 'TurborepoLoginSuccessDocumentationPart', {
    //   location: {
    //     type: 'METHOD',
    //     method: 'GET',
    //     path: '/v8/turborepo/success',
    //   },
    //   properties: JSON.stringify(loginSuccessDocumentationPart),
    //   restApiId: api.restApiId,
    // });

    // const v2Resource = api.root.addResource('v2');

    // const userResource = v2Resource.addResource('user');

    // // GET /v2/user
    // userResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.getUserInfoFunction), {
    //   operationName: 'getUserInfo',
    // });

    // const getUserInfoDocumentationPart = {
    //   description: 'Retrieves information about the authenticated user.',
    //   summary: 'Get user info',
    //   tags: ['login'],
    // }

    // new apigateway.CfnDocumentationPart(this, 'TurborepoUserInfoDocumentationPart', {
    //   location: {
    //     type: 'METHOD',
    //     method: 'GET',
    //     path: '/v2/user',
    //   },
    //   properties: JSON.stringify(getUserInfoDocumentationPart),
    //   restApiId: api.restApiId,
    // });

    // cloudfront domain name for CNAME
    new cdk.CfnOutput(this, 'CloudfrontAliasDomainName', {
      value: api.domainName?.domainNameAliasDomainName ?? 'N/A',
    });
  }
}