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
    path: `${props.artifactsBucket.bucketName}/artifacts/{hash}`,
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

  props.hashResource.addMethod('HEAD', headIntegration, {
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
}
