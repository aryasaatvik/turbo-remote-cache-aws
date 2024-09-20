# Contributing

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
