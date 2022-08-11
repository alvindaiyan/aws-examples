#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {WebPortalStack} from "../lib/s3-cloudfront-web/s3-cloudfront-web";
import {AppSyncStack} from "../lib/appsync-ddb/appsync-stack";
import {SnsLambdaStack} from "../lib/apigw-lambda-sns/sns-stack";
import {ApigwLambdaDdbStack} from "../lib/apigw-lambda-ddb/apigw-lambda-ddb-stack";

const app = new cdk.App();

new WebPortalStack(app, "CognitoWebStack", {
    tags: {
        app: "CognitoWeb"
    },
})

new AppSyncStack(app, 'CognitoBackendStack', {
    tags: {
        app: 'CognitoBackend'
    },
})

new SnsLambdaStack(app, 'SnsLambdaStack', {
    tags: {
        app: 'SnsLambdaPlayStack',
    },
})

new ApigwLambdaDdbStack(app, 'SaLaunchStack');