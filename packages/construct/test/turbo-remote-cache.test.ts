import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Template } from 'aws-cdk-lib/assertions';
import { TurboRemoteCache } from '../src';

describe('TurboRemoteCache Default Construct', () => {
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
});

describe('TurboRemoteCache Custom Domain Construct', () => {
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    stack = new cdk.Stack();
    new TurboRemoteCache(stack, 'TestConstructWithCustomDomain', {
      apiProps: {
        domainName: {
          domainName: 'test.example.com',
          certificate: acm.Certificate.fromCertificateArn(stack, 'Certificate', 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert'),
          endpointType: apigateway.EndpointType.EDGE,
          securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        },
      },
    });
    template = Template.fromStack(stack);
  });

  test('Custom Domain Configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::DomainName', {
      DomainName: 'test.example.com',
  });
  });
});

describe('TurboRemoteCache Custom Resource Props', () => {
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    stack = new cdk.Stack();
    new TurboRemoteCache(stack, 'TestConstructWithCustomResourceProps', {
      apiProps: {
        restApiName: 'test-rest-api',
        deployOptions: {
          stageName: 'test-stage',
        },
      },
      artifactsBucketProps: {
        bucketName: 'test-artifacts-bucket',
      },
      eventsTableProps: {
        tableName: 'test-events-table',
      },
    });
    template = Template.fromStack(stack);
  });

  test('Custom Resource Props', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'test-rest-api',
    });
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: 'test-stage',
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'test-artifacts-bucket',
    });
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'test-events-table',
    });
  });
});
