# Turborepo Remote Cache Guide

## Overview

This is a step by step guide to deploying the Turborepo Remote Cache API on AWS and configuring a turborepo project to use it.

## Deploy to AWS

1. Scaffold a new cdk app which uses the remote cache construct using the template:

```bash
degit aryasaatvik/turbo-remote-cache-aws/apps/template turbo-remote-cache
```

2. Install dependencies using your preferred package manager. I recommend using pnpm

```bash
pnpm install
```

3. Set the `TURBO_TOKEN` environment variable to a valid turbo token. You can generate a token using `openssl rand -base64 32`.

```bash
echo "TURBO_TOKEN=$(openssl rand -base64 32)" >> .env
```

4. Bootstrap the cdk app

```bash
pnpm cdk bootstrap
```

5. Deploy the cdk app

```bash
pnpm cdk deploy
```

6. The API will be deployed and you can find the endpoint in the outputs section of the cdk stack. `TurboRemoteCacheStack.TurboRemoteCacheAPIGatewayTurboRemoteCacheApiEndpoint`. This will be the value of the `apiUrl` in the next step.

## Configure your turborepo

1. Add the following to your turbo.json

```json
{
  "remoteCache": {
    "enabled": true,
    "apiUrl": "<your-api-url>",
  }
}
```

1. `TURBO_TEAM` environment variable needs to be set for the remote cache to work. This is also used as a prefix for S3 keys. You can either set it inline for unix based systems or use dotenv if you need cross platform support.

2. You also need to set the `TURBO_TOKEN` environment variable to the same value as the one you set in the cdk stack. This can either be provided using `--token="..."` or by setting the environment variable in your shell.

### dotenv setup

1. Install dotenv

```bash
pnpm add -D dotenv
```

1. Create a `.env` file in the root of your repo and add the following:

```bash
TURBO_TEAM=team
TURBO_TOKEN=...
```

3. Add the following to your `package.json` scripts

```json
"scripts": {
  "build": "dotenv -- pnpm turbo run build"
}
```

4. Verify that the remote cache works

```bash
pnpm build
```

### inline setup (unix based systems)

```bash
TURBO_TEAM=team TURBO_TOKEN=... pnpm turbo run build
```
