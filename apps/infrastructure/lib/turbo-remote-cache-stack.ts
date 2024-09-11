import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { TurboRemoteCache } from '../../../packages/construct/src';

export class TurboRemoteCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new TurboRemoteCache(this, 'TurboRemoteCache', {});
  }
}