import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface PutArtifactIntegrationProps {
  artifactsBucket: s3.Bucket;
  s3Credentials: iam.Role;
  api: apigateway.RestApi;
  hashResource: apigateway.Resource;
}

export function putArtifactIntegration(scope: Construct, props: PutArtifactIntegrationProps) {
  const putIntegration = new apigateway.AwsIntegration({
    service: 's3',
    integrationHttpMethod: 'PUT',
    path: `${props.artifactsBucket.bucketName}/artifacts/{hash}`,
    options: {
      credentialsRole: props.s3Credentials,
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

  props.hashResource.addMethod('PUT', putIntegration, {
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
          'application/json': new apigateway.Model(scope, 'PutArtifactResponseModel', {
            restApi: props.api,
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
}