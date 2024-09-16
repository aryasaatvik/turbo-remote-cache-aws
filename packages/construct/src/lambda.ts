import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';

interface LambdaFunctionsProps {
  artifactsBucket: s3.Bucket;
  eventsTable: dynamodb.Table;
}

export class LambdaFunctions extends Construct {
  public readonly recordEventsFunction: lambda.Function;
  public readonly artifactQueryFunction: lambda.Function;
  public statusFunction: lambda.Function;
  public initiateLoginFunction: lambda.Function;
  public loginSuccessFunction: lambda.Function;
  public getUserInfoFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    this.recordEventsFunction = new lambda.Function(this, 'RecordEventsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: 'turbo-remote-cache-record-events',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/record-events')),
      environment: {
        EVENTS_TABLE_NAME: props.eventsTable.tableName,
      },
    });

    this.artifactQueryFunction = new lambda.Function(this, 'ArtifactQueryFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: 'turbo-remote-cache-artifact-query',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/artifact-query')),
      environment: {
        EVENTS_TABLE_NAME: props.eventsTable.tableName,
      },
    });

    this.statusFunction = new lambda.Function(this, 'StatusFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'turbo-remote-cache-status',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/status')),
      environment: {
        BUCKET_NAME: props.artifactsBucket.bucketName,
      },
    });

    // turbo login
    this.initiateLoginFunction = new lambda.Function(this, 'InitiateLoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'turbo-remote-cache-initiate-login',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/initiate-login')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    this.loginSuccessFunction = new lambda.Function(this, 'LoginSuccessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'turbo-remote-cache-login-success',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/login-success')),
      environment: {
        TURBO_TOKEN: process.env.TURBO_TOKEN!,
      },
    });

    this.getUserInfoFunction = new lambda.Function(this, 'GetUserInfoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: 'turbo-remote-cache-get-user-info',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist/get-user-info')),
    });

    props.artifactsBucket.grantRead(this.artifactQueryFunction);
    props.artifactsBucket.grantReadWrite(this.recordEventsFunction);
    props.artifactsBucket.grantRead(this.statusFunction);

    // Grant permissions
    props.eventsTable.grantReadWriteData(this.recordEventsFunction);
    props.eventsTable.grantReadData(this.artifactQueryFunction);
  }
}