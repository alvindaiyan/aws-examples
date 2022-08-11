import {
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as lambda,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as path from "path";
import * as logs from 'aws-cdk-lib/aws-logs';
import {Effect, Policy} from "aws-cdk-lib/aws-iam";


export class ApigwLambdaDdbStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const ddbTable = new dynamodb.Table(this, 'apigw-lambda-ddb', {
            partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},

            tableName: 'apigw-lambda-ddb',
        });

        const playFunction = new lambda.Function(this, 'apigw-lambda-ddb-function', {
            functionName: 'apigw-lambda-ddb_function',
            runtime: lambda.Runtime.NODEJS_16_X,
            handler: 'index.handler',
            description: 'playing function',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/playing_function')),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                DYNAMODB_TABLE: ddbTable.tableName,
            }
        });

        const apiGateway = new apigw.LambdaRestApi(this, 'apigw-lambda-ddb-api', {
            proxy: false,
            handler: playFunction
        })

        const apiResource = apiGateway.root.addResource('apigw-lambda-ddb-function')
        const apigwLambdaIntegration = new apigw.LambdaIntegration(
            playFunction,
            {}
        )
        apiResource.addMethod('POST', apigwLambdaIntegration)

        const policyStatement = new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'dynamodb:BatchGetItem',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:Query',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem'
            ],
            resources: [ddbTable.tableArn]
        });

        playFunction.role?.attachInlinePolicy(
            new Policy(this, "lambda-play-function-policy", {
                    statements: [policyStatement],
                }
            )
        )
    }
}
