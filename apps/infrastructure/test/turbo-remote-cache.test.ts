import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TurboRemoteCacheStack } from '../lib/turbo-remote-cache-stack';

describe('TurboRemoteCacheStack', () => {
  test('snapshot test', () => {
    const app = new App();
    const stack = new TurboRemoteCacheStack(app, 'TurboRemoteCacheStack');
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});