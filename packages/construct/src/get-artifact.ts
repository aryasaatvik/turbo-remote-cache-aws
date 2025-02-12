import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface GetArtifactIntegrationProps {
  artifactsBucket: s3.Bucket;
  s3Credentials: iam.Role;
  api: apigateway.RestApi;
  hashResource: apigateway.Resource;
}

export function getArtifactIntegration(scope: Construct, props: GetArtifactIntegrationProps) {
  const getIntegration = new apigateway.AwsIntegration({
    service: 's3',
    integrationHttpMethod: 'GET',
    path: `${props.artifactsBucket.bucketName}/{teamId}/{hash}`,
    options: {
      credentialsRole: props.s3Credentials,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
            'method.response.header.Content-Length': 'integration.response.header.Content-Length',
            'method.response.header.ETag': 'integration.response.header.ETag',
            'method.response.header.Last-Modified': 'integration.response.header.Last-Modified',
            'method.response.header.x-artifact-duration': 'integration.response.header.x-amz-meta-artifact-duration',
            'method.response.header.x-artifact-tag': 'integration.response.header.x-amz-meta-artifact-tag',
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
        'integration.request.path.teamId': 'method.request.querystring.teamId',
      },
    },
  });

  props.hashResource.addMethod('GET', getIntegration, {
    operationName: 'downloadArtifact',
    requestParameters: {
      'method.request.path.hash': true,
      'method.request.querystring.teamId': true,
    },
    methodResponses: [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Content-Type': true,
          'method.response.header.Content-Length': true,
          'method.response.header.ETag': true,
          'method.response.header.Last-Modified': true,
          'method.response.header.x-artifact-duration': true,
          'method.response.header.x-artifact-tag': true,
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

  const getArtifactDocumentationPart = {
    description: 'Downloads a cache artifact indentified by its `hash` specified on the request path. The artifact is downloaded as an octet-stream. The client should verify the content-length header and response body.',
    summary: 'Download a cache artifact',
    tags: ['artifacts'],
  }

  new apigateway.CfnDocumentationPart(scope, 'GetArtifactDocumentationPart', {
    location: {
      type: 'METHOD',
      method: 'GET',
      path: '/v8/artifacts/{hash}',
    },
    properties: JSON.stringify(getArtifactDocumentationPart),
    restApiId: props.api.restApiId,
  });
}
