import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    const v8Resource = api.root.addResource('v8');
    const artifactsResource = v8Resource.addResource('artifacts');

    const eventsResource = artifactsResource.addResource('events');
    // POST /v8/artifacts/events
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(props.lambdaFunctions.recordEventsFunction));

    const statusResource = artifactsResource.addResource('status');
    // GET /v8/artifacts/status
    statusResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.statusFunction));

    const hashResource = artifactsResource.addResource('{hash}');

    // GET /v8/artifacts/{hash}
    getArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // HEAD /v8/artifacts/{hash}
    headArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // PUT /v8/artifacts/{hash}
    putArtifactIntegration(this, {
      artifactsBucket: props.artifactsBucket,
      s3Credentials: props.s3Credentials,
      api,
      hashResource,
    });

    // POST /v8/artifacts
    artifactsResource.addMethod('POST', new apigateway.LambdaIntegration(props.lambdaFunctions.artifactQueryFunction));

    // turbo login
    const turborepoResource = api.root.addResource('turborepo');
    const tokenResource = turborepoResource.addResource('token');

    // GET /v8/turborepo/token
    tokenResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.initiateLoginFunction));

    // GET /v8/turborepo/success
    const successResource = turborepoResource.addResource('success');
    successResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.loginSuccessFunction));

    const v2Resource = api.root.addResource('v2');

    const userResource = v2Resource.addResource('user');

    // GET /v2/user
    userResource.addMethod('GET', new apigateway.LambdaIntegration(props.lambdaFunctions.getUserInfoFunction));
  }
}