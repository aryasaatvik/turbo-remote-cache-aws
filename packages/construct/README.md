# Turborepo Remote Cache API Construct

![GitHub License](https://img.shields.io/github/license/aryasaatvik/turbo-remote-cache-aws)
![Version](https://img.shields.io/badge/version-0.1.2-blue)

An AWS CDK construct for easily deploying a Turborepo Remote Cache API infrastructure. This project implements a Remote Cache API for Turborepo using AWS services. It provides a scalable and efficient solution for storing and retrieving build artifacts in a distributed development environment.

## Why use Remote Caching?

The Turborepo Remote Cache API allows teams to share and reuse build artifacts across different machines and CI/CD pipelines, significantly reducing build times and improving development efficiency. [Read more about Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)

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

    new TurboRemoteCache(this, 'TurboRemoteCache', {
      // optional domain name options for using a custom domain with API Gateway
      domainNameOptions: {
        domainName: 'your-custom-domain.com',
        // create a certificate in us-east-1 for custom domain
        certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', 'YOUR_CERTIFICATE_ARN'),
        endpointType: apigateway.EndpointType.EDGE,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
    });
  }
}
```

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

This construct is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
