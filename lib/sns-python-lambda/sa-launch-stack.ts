import {
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as lambda, aws_lambda_event_sources, aws_sns as sns,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as path from "path";
import * as logs from 'aws-cdk-lib/aws-logs';
import {Effect, Policy} from "aws-cdk-lib/aws-iam";


export class SnsPythonLambdaSample extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const topic1 = new sns.Topic(this, `${id}-snstopic1`, {
            displayName: `${id}-topic1`,
        });
        const eventSource1 = new aws_lambda_event_sources.SnsEventSource(topic1);

        const topic2 = new sns.Topic(this, `${id}-snstopic2`, {
            displayName: `${id}-topic2`,
        });
        const eventSource2 = new aws_lambda_event_sources.SnsEventSource(topic2);

        const snsLambda = new lambda.Function(this, 'sns-send-email-function', {
            functionName: 'sns_lambda_function',
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'sns_function.handler',
            description: 'sns function',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/')),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                SNS_TOPIC_ARN_1: topic1.topicArn,
                SNS_TOPIC_ARN_2: topic2.topicArn,
            }
        });
        snsLambda.addEventSource(eventSource1)
        snsLambda.addEventSource(eventSource2)
    }
}
