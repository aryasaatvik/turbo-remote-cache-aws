#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TurboRemoteCacheStack } from '../lib/turbo-remote-cache-stack';

const app = new cdk.App();
new TurboRemoteCacheStack(app, 'TurboRemoteCacheStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});