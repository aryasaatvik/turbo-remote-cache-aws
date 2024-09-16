import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import { LambdaFunctions } from './lambda';
import { getArtifactIntegration } from './get-artifact';
import { headArtifactIntegration } from './head-artifact';
import { putArtifactIntegration } from './put-artifact';

interface APIGatewayProps {
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
      domainName: {
        domainName: 'turbo-remote-cache.arya.sh',
        certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:654654387918:certificate/458b8937-86f4-4c1d-86bb-d43b5e6d20c0'),
        endpointType: apigateway.EndpointType.EDGE,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      binaryMediaTypes: ['application/octet-stream'],
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

    // const cfnMethod = eventsResource.node.findChild('POST') as apigateway.CfnMethod
    // cfnMethod.addPropertyOverride('Description', 'Records an artifacts cache usage event. The body of this request is an array of cache usage events. The supported event types are `HIT` and `MISS`. The source is either `LOCAL` the cache event was on the users filesystem cache or `REMOTE` if the cache event is for a remote cache. When the event is a `HIT` the request also accepts a number `duration` which is the time taken to generate the artifact in the cache.')

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

    const hashResource = artifactsResource.addResource('{hash}');

    // GET /v8/artifacts/{hash}
    // Downloads a cache artifact identified by its `hash`. The artifact is downloaded as an octet-stream.
    // The client should verify the content-length header and response body.
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

    // turbo login
    const turborepoResource = api.root.addResource('turborepo');
    const tokenResource = turborepoResource.addResource('token');

    // GET /v8/turborepo/token
    tokenResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.initiateLoginFunction), {
      operationName: 'initiateLogin',
    });

    // GET /v8/turborepo/success
    const successResource = turborepoResource.addResource('success');
    successResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.loginSuccessFunction), {
      operationName: 'loginSuccess',
    });

    const v2Resource = api.root.addResource('v2');

    const userResource = v2Resource.addResource('user');

    // GET /v2/user
    userResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.getUserInfoFunction), {
      operationName: 'getUserInfo',
    });

    // cloudfront domain name for CNAME
    new cdk.CfnOutput(this, 'CloudfrontAliasDomainName', {
      value: api.domainName?.domainNameAliasDomainName ?? 'N/A',
    });
  }
}