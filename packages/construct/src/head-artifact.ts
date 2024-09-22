import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface HeadArtifactIntegrationProps {
  artifactsBucket: s3.Bucket;
  s3Credentials: iam.Role;
  api: apigateway.RestApi;
  hashResource: apigateway.Resource;
}

export function headArtifactIntegration(scope: Construct, props: HeadArtifactIntegrationProps) {
  const headIntegration = new apigateway.AwsIntegration({
    service: 's3',
    integrationHttpMethod: 'HEAD',
    path: `${props.artifactsBucket.bucketName}/{slug}/{hash}`,
    options: {
      credentialsRole: props.s3Credentials,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Content-Length': 'integration.response.header.Content-Length',
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
            'method.response.header.ETag': 'integration.response.header.ETag',
            'method.response.header.Last-Modified': 'integration.response.header.Last-Modified',
            'method.response.header.x-artifact-duration': 'integration.response.header.x-amz-meta-artifact-duration',
          },
        },
        {
          selectionPattern: '404',
          statusCode: '404',
        },
      ],
      requestParameters: {
        'integration.request.path.hash': 'method.request.path.hash',
        'integration.request.path.slug': 'method.request.querystring.slug',
      },
    },
  });

  props.hashResource.addMethod('HEAD', headIntegration, {
    operationName: 'artifactExists',
    requestParameters: {
      'method.request.path.hash': true,
      'method.request.querystring.slug': true,
    },
    methodResponses: [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.x-artifact-duration': true,
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

  const headArtifactDocumentationPart = {
    description: 'Check that a cache artifact with the given `hash` exists. This request returns response headers only and is equivalent to a `GET` request to this endpoint where the response contains no body.',
    summary: 'Check if a cache artifact exists',
    tags: ['artifacts'],
  }

  new apigateway.CfnDocumentationPart(scope, 'HeadArtifactDocumentationPart', {
    location: {
      type: 'METHOD',
      method: 'HEAD',
      path: '/v8/artifacts/{hash}',
    },
    properties: JSON.stringify(headArtifactDocumentationPart),
    restApiId: props.api.restApiId,
  });
}
