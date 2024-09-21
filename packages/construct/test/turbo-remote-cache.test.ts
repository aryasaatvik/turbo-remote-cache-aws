import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Template } from 'aws-cdk-lib/assertions';
import { TurboRemoteCache } from '../src';

describe('TurboRemoteCache Construct', () => {
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    stack = new cdk.Stack();
    new TurboRemoteCache(stack, 'TestConstruct', {});
    template = Template.fromStack(stack);
  });

  test('S3 Bucket Created', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'turbo-remote-cache-artifacts',
    });
  });

  test('DynamoDB Table Created', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'turbo-remote-cache-events',
    });
  });

  test('API Gateway Created', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Turborepo Remote Cache API',
    });
  });

  test('Lambda Functions Created', () => {
    template.resourceCountIs('AWS::Lambda::Function', 6);
  });

  test('S3 Bucket Lifecycle Rule', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [
          {
            ExpirationInDays: 30,
            Status: 'Enabled',
          },
        ],
      },
    });
  });

  test('Custom Domain Configuration', () => {
    const stackWithCustomDomain = new cdk.Stack();
    new TurboRemoteCache(stackWithCustomDomain, 'TestConstructWithCustomDomain', {
      apiProps: {
        domainName: {
          domainName: 'test.example.com',
          certificate: acm.Certificate.fromCertificateArn(stackWithCustomDomain, 'Certificate', 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert'),
          endpointType: apigateway.EndpointType.EDGE,
          securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        },
      },
    });
    const templateWithCustomDomain = Template.fromStack(stackWithCustomDomain);

    templateWithCustomDomain.hasResourceProperties('AWS::ApiGateway::DomainName', {
      DomainName: 'test.example.com',
    });
  });
});