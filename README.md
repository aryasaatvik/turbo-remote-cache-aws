# Turborepo Remote Cache API

This project implements a Remote Cache API for Turborepo using AWS services. It provides a scalable and efficient solution for storing and retrieving build artifacts in a distributed development environment.

## Table of Contents

- [Turborepo Remote Cache API](#turborepo-remote-cache-api)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture](#architecture)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Deployment](#deployment)
  - [API Endpoints](#api-endpoints)
  - [Development](#development)
  - [Testing](#testing)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

The Turborepo Remote Cache API allows teams to share and reuse build artifacts across different machines and CI/CD pipelines, significantly reducing build times and improving development efficiency.

## Architecture

This project uses the following AWS services:

- AWS Lambda for serverless compute
- Amazon S3 for artifact storage
- Amazon API Gateway for API management

- `/v8/artifacts/{hash}`: GET, PUT, HEAD endpoints are handled by AWS S3 Integation for API Gateway
which increases the max payload size to 10MB instead of 6MB if proxied through a Lambda

The architecture is defined and deployed using AWS CDK (Cloud Development Kit).

## Prerequisites

- Node.js (version 20.x or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`pnpm install -g aws-cdk`)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/turbo-remote-cache-api.git
   cd turbo-remote-cache-api
   ```

2. Install dependencies:

  ```bash
  pnpm install
  ```

3. Configure AWS CDK (if not already done):

   ```bash
   cdk bootstrap
   ```

## Deployment

To deploy the stack to your AWS account:

```bash
cdk deploy
```

This command will output the API Gateway URL, which you'll use to interact with the Remote Cache API.

## API Endpoints

- `PUT /v8/artifacts/{hash}`: Upload an artifact
- `GET /v8/artifacts/{hash}`: Download an artifact
- `HEAD /v8/artifacts/{hash}`: Check if an artifact exists
- `POST /v8/artifacts/events`: Record cache events
- `GET /v8/artifacts/status`: Check API status

For detailed API documentation, refer to `openapi.yaml` in the `docs/api/` directory.

## Development

The `lib/` directory contains the CDK stack definition. Lambda function implementations are located in the `lambda/` directory.

To add a new feature or modify existing ones:

1. Update the CDK stack in `lib/turbo-remote-cache-stack.ts` if necessary.
2. Implement or modify Lambda functions in the `lambda/` directory.
3. Update the OpenAPI specification in `docs/api/openapi.yaml` if the API changes.
4. Run `cdk diff` to see changes before deploying.

## Testing

(Add information about running tests once they are implemented)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
