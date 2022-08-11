import {
    aws_events as eventbus, aws_events_targets as event_targets, aws_s3,
    aws_sns as sns,
    aws_sns_subscriptions as subs,
    Stack,
    StackProps,
} from "aws-cdk-lib";
import {Construct} from "constructs";


// only create the rule in one stack
// have a look trust advisor
export class S3MonitoringStack extends Stack {

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);
        const topic = new sns.Topic(this, 'sns-topic', {
            displayName: 'sns-s3-bucket-creation',
        });
        const bucketEvent = new eventbus.Rule(this, 's3BucketCreationEventRule', {
            ruleName: 'allRegionS3BucketCreationRule',
            eventPattern: {
                source: ['aws.s3'],
                detailType: ['AWS API Call via CloudTrail'],
                detail: {
                    eventSource: ['s3.amazonaws.com'],
                    eventName: ['CreateBucket']
                }
            },
        });

        bucketEvent.addTarget(new event_targets.SnsTopic(topic))
    }
}