import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

interface LambdaFunctionsProps {
  artifactsBucket: s3.Bucket;
}

export class LambdaFunctions extends Construct {
  public statusFunction: lambda.Function;
  public recordEventsFunction: lambda.Function;
  public artifactQueryFunction: lambda.Function;
  public initiateLoginFunction: lambda.Function;
  public loginSuccessFunction: lambda.Function;
  public getUserInfoFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);
    this.statusFunction = new lambda.Function(this, 'StatusFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'status.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: props.artifactsBucket.bucketName,
      },
    });

    this.recordEventsFunction = new lambda.Function(this, 'RecordEventsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'record-events.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: props.artifactsBucket.bucketName,
      },
    });

    this.artifactQueryFunction = new lambda.Function(this, 'ArtifactQueryFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'artifact-query.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        BUCKET_NAME: props.artifactsBucket.bucketName,
      },
    });

    // turbo login
    this.initiateLoginFunction = new lambda.Function(this, 'InitiateLoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'initiate-login.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    this.loginSuccessFunction = new lambda.Function(this, 'LoginSuccessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'login-success.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    this.getUserInfoFunction = new lambda.Function(this, 'GetUserInfoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get-user-info.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'dist')),
    });

    props.artifactsBucket.grantRead(this.artifactQueryFunction);
    props.artifactsBucket.grantReadWrite(this.recordEventsFunction);
    props.artifactsBucket.grantRead(this.statusFunction);

  }
}