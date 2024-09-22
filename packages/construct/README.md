# Turborepo Remote Cache API Construct

![GitHub License](https://img.shields.io/github/license/aryasaatvik/turbo-remote-cache-aws)
![Version](https://img.shields.io/badge/version-0.3.0-blue)
![Downloads](https://img.shields.io/npm/dt/turbo-remote-cache-construct)

An AWS CDK construct for easily deploying a Turborepo Remote Cache API infrastructure. This project implements a Remote Cache API for Turborepo using AWS services. It provides a scalable and efficient solution for storing and retrieving build artifacts in a distributed development environment.

## Why use Remote Caching?

The Turborepo Remote Cache API allows teams to share and reuse build artifacts across different machines and CI/CD pipelines, significantly reducing build times and improving development efficiency. [Read more about Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)

## Features

- :zap: High-performance S3 integration for artifact storage
- :lock: Secure authentication using API keys
- :chart_with_upwards_trend: Scalable architecture using serverless AWS services
- :globe_with_meridians: Optional custom domain support
- :gear: Easy integration with existing CDK stacks
- :moneybag: Cost-effective usage-based pricing model
- :recycle: Automatic artifact cleanup to manage storage costs
- :clock1: Significant build time reduction for large projects

## Getting Started

[Read the guide](/GUIDE.md) to deploy the Remote Cache API in your own AWS account and use it with your Turborepo project.

## Installation

To use this construct in your CDK project, install it using npm, pnpm, or yarn:

```bash
npm install turbo-remote-cache-construct
```

```bash
pnpm add turbo-remote-cache-construct
```

## Usage

Import and use the construct in your CDK stack:

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TurboRemoteCache } from 'turbo-remote-cache-construct';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // load TURBO_TOKEN from .env file
    dotenv.config({ path: path.join(__dirname, '..', '.env') });

    if (!process.env.TURBO_TOKEN) {
      throw new Error('TURBO_TOKEN is not set');
    }

    new TurboRemoteCache(this, 'TurboRemoteCache', {
      turboToken: process.env.TURBO_TOKEN,
      apiProps: {
        // optional domain name options for using a custom domain with API Gateway
        domainName: {
          domainName: 'your-custom-domain.com',
          // create a certificate in us-east-1 for custom domain
          certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'),
          endpointType: apigateway.EndpointType.EDGE,
          securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
        },
      },
      // optional S3 bucket props for to configure the artifacts bucket
      artifactsBucketProps: {
        bucketName: 'turbo-remote-cache-artifacts',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
      // optional DynamoDB table props for to configure the events table
      eventsTableProps: {
        tableName: 'turbo-remote-cache-events',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });
  }
}
```

The S3 bucket, DynamoDB table, and API Gateway can be configured using the optional props. The defaults are are provided in the jsdoc comments and can be viewed in the [source code](/packages/construct/src/index.ts). The example above uses apiProps to configure a custom domain name for the API Gateway. It also uses artifactsBucketProps to customize the bucketName and removalPolicy to retain the bucket when the stack is deleted. Similar options are available for the DynamoDB table.

## Architecture

The construct uses API Gateway, Lambda, S3 integration, and DynamoDB to create a serverless Turborepo Remote Cache REST API. The construct can be self-hosted in your AWS account and be used with the [Turborepo Remote Cache](https://turbo.build/repo/docs/core-concepts/remote-caching#self-hosting).

### Components

- **API Gateway**: Used to create a REST API that will be used to interact with the Remote Cache.
- **Lambda**: Used to handle the API requests and responses for non-artifact related endpoints.
- **S3 Integration**: Allows API Gateway to integrate with S3 without a Lambda function which allows for a larger payload size and lower latency.
- **S3**: Used to store the Remote Cache artifacts.
- **DynamoDB**: Used to store the Remote Cache events.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This construct is licensed under the MIT License. See the [LICENSE](/packages/construct/LICENSE) file for details.
