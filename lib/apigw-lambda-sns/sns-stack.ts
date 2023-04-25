import {
    Stack,
    StackProps,
    aws_sns as sns,
    aws_lambda as lambda,
    aws_sns_subscriptions as subs,
    aws_apigateway as apigw,
    aws_iam as iam,
} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as path from "path";
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from "aws-cdk-lib";
import {Effect, Policy} from "aws-cdk-lib/aws-iam";

export class SnsLambdaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const topic = new sns.Topic(this, 'sns-topic', {
            displayName: 'Playground-Topic',
        });

        // const lambda = new PythonFunction()
        const snsLambda = new lambda.Function(this, 'sns-send-email-function', {
            functionName: 'sns_lambda_function',
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'main.handler',
            description: 'sns function',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/sns_function')),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                SNS_TOPIC_ARN: topic.topicArn,
            }
        });
        const policyStatement = new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'sns:Publish'
            ],
            resources: [topic.topicArn]
        });

        snsLambda.role?.attachInlinePolicy(
            new Policy(this, "lambda-sns-function-policy", {
                    statements: [policyStatement],
                }
            )
        )

        const apiGateway = new apigw.LambdaRestApi(this, 'sns-lambda-api', {
            proxy: false,
            handler: snsLambda
        });

        const apiResource = apiGateway.root.addResource('sns-lambda-function');
        const apigwLambdaIntegration = new apigw.LambdaIntegration(
            snsLambda,
            {}
        );
        apiResource.addMethod('POST', apigwLambdaIntegration);

        topic.addSubscription(new subs.EmailSubscription('cyanda@amazon.com'));

        new cdk.CfnOutput(this, 'snsTopicArn', {
            value: topic.topicArn,
            description: 'The arn of the sns topic',
        })
    }

}