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
    path: `${props.artifactsBucket.bucketName}/artifacts/{hash}`,
    options: {
      credentialsRole: props.s3Credentials,
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

  props.hashResource.addMethod('GET', getIntegration, {
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
}
