import json
import os

import boto3

sns_client = boto3.client('sns')
topic_arn = os.environ['SNS_TOPIC_ARN']


def handler(event, context):
    print('request: {}'.format(json.dumps(event)))
    # notify to sns topic for distribution event
    sample_route53_code = 'https://gist.github.com/yike5460/67c42ff4a0405c05e59737bd425a4806'
    sample_godaddy_code = 'https://gist.github.com/guming3d/56e2f0517aa47fc87289fd21ff97dcee'
    message_to_be_published = '''
        CNAME value need to add into DNS hostzone to finish DCV: {} \n
        Sample Script (Python): {} \n
        Sample Script for Godaddy (Python): {}
    '''.format("something here", sample_route53_code, sample_godaddy_code)

    resp = sns_client.publish(
        TopicArn=topic_arn,
        Message=message_to_be_published,
        Subject='Domain Name Need to Do DCV (Domain Control Validation)'
    )

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'text/plain'
        },
        'body': '{}'.format(str(resp))
    }
