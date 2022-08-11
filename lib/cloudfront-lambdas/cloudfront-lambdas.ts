import {
    Stack,
    StackProps,
    aws_lambda as lambda,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_iam as iam,
    RemovalPolicy,
    Aws,
    aws_s3_deployment as s3d,
    aws_apigateway as apigw, Duration,
} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as path from "path";
import * as logs from "aws-cdk-lib/aws-logs";
import {CloudFrontToS3} from "@aws-solutions-constructs/aws-cloudfront-s3";
import * as cdk from "aws-cdk-lib";


export class CloudfrontLambdas extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        // const portal = new CloudFrontToS3(this, "cognito-web-s3", {
        //     bucketProps: {
        //         versioned: true,
        //         encryption: s3.BucketEncryption.S3_MANAGED,
        //         accessControl: s3.BucketAccessControl.PRIVATE,
        //         enforceSSL: true,
        //         removalPolicy: RemovalPolicy.RETAIN,
        //         autoDeleteObjects: false,
        //     },
        //     cloudFrontDistributionProps: {
        //         priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        //         minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
        //         enableIpv6: false,
        //         enableLogging: true, //Enable access logging for the distribution.
        //         comment: `${Aws.STACK_NAME} - Web Console Distribution (${Aws.REGION})`,
        //         errorResponses: [
        //             {
        //                 httpStatus: 403,
        //                 responseHttpStatus: 200,
        //                 responsePagePath: "/index.html",
        //             },
        //         ],
        //     },
        //     insertHttpSecurityHeaders: false,
        // });
        //
        // const portalBucket = portal.s3Bucket as s3.Bucket;
        // const portalUrl = portal.cloudFrontWebDistribution.distributionDomainName;
        //
        // // Prints out the AppSync GraphQL endpoint to the terminal
        // new cdk.CfnOutput(this, "CloudFrontURL", {
        //     value: portalUrl,
        // });
        //
        // // upload static web assets
        // new s3d.BucketDeployment(this, 'CognitoWebAssets', {
        //     sources: [
        //         s3d.Source.asset(path.join(__dirname, './build')),
        //     ],
        //     destinationBucket: portalBucket,
        //     prune: false,
        // });

        const func1 = new lambda.Function(this, 'Func1', {
            functionName: 'lambda_function_1',
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'func1.handler',
            description: 'function 1',
            code: lambda.Code.fromAsset(path.join(__dirname, './functions')),
            logRetention: logs.RetentionDays.ONE_WEEK,
        })

        const apiGateway = new apigw.LambdaRestApi(this, 'cf-lambda-api', {
            proxy: false,
            handler: func1
        });

        const apiResource = apiGateway.root.addResource('cf-lambda-function');
        const apigwLambdaIntegration = new apigw.LambdaIntegration(
            func1,
            {}
        );
        apiResource.addMethod('GET', apigwLambdaIntegration);
        const apigwOrigin = new origins.RestApiOrigin(apiGateway);
        const myCachePolicy = new cloudfront.CachePolicy(this, 'myCachePolicy', {
            cachePolicyName: 'MyPolicy',
            comment: 'A default policy',
            defaultTtl: Duration.days(0),
            minTtl: Duration.minutes(0),
            maxTtl: Duration.days(0),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            // headerBehavior: cloudfront.CacheHeaderBehavior.allowList('X-CustomHeader'),
            // queryStringBehavior: cloudfront.CacheQueryStringBehavior.denyList('username'),
            // enableAcceptEncodingGzip: true,
            // enableAcceptEncodingBrotli: true,
        });

        // Create a bucket for static content.
        const staticBucket = new s3.Bucket(this, "staticBucket", {
            encryption: s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [
                { abortIncompleteMultipartUploadAfter: Duration.days(7) },
                { noncurrentVersionExpiration: Duration.days(7) },
            ],
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            versioned: true,
        });

        // Deploy the static content.
        // Depending on your process, you might want to deploy the static content yourself
        // using an s3 sync command instead.
        new s3d.BucketDeployment(this, "staticBucketDeployment", {
            sources: [s3d.Source.asset(path.join(__dirname, './build')),],
            destinationKeyPrefix: "/",
            destinationBucket: staticBucket,
        });

        // Create a CloudFront distribution connected to the Lambda and the static content.
        const cfOriginAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            "cfOriginAccessIdentity",
            {}
        );
        const cloudfrontS3Access = new iam.PolicyStatement();
        cloudfrontS3Access.addActions("s3:GetBucket*");
        cloudfrontS3Access.addActions("s3:GetObject*");
        cloudfrontS3Access.addActions("s3:List*");
        cloudfrontS3Access.addResources(staticBucket.bucketArn);
        cloudfrontS3Access.addResources(`${staticBucket.bucketArn}/*`);
        cloudfrontS3Access.addCanonicalUserPrincipal(
            cfOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
        );
        staticBucket.addToResourcePolicy(cloudfrontS3Access);


        const portal = new cloudfront.CloudFrontWebDistribution(this, 'cloudfrontdis', {
            originConfigs: [
                {
                    customOriginSource: {
                        domainName: `${apiGateway.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
                        originPath: `/${apiGateway.deploymentStage.stageName}`
                    },
                    behaviors: [
                        {
                            // lambdaFunctionAssociations: [
                            //     {
                            //         // lambdaFunction: apiCorsLambda,
                            //         eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
                            //     },
                            // ],
                            allowedMethods: cloudfront.CloudFrontAllowedMethods.ALL,
                            pathPattern: "api/*",
                            defaultTtl: Duration.millis(0),
                            minTtl: Duration.millis(0),
                            maxTtl: Duration.millis(0),
                        },
                    ],
                },
                {
                    s3OriginSource: {
                        s3BucketSource: staticBucket,
                        originAccessIdentity: cfOriginAccessIdentity,
                    },
                    behaviors: [
                        {
                            // lambdaFunctionAssociations: [
                            //     {
                            //         lambdaFunction: staticRewriteLambda,
                            //         eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                            //     },
                            // ],
                            isDefaultBehavior: true,
                        },
                    ],
                },
            ]

        });

        // // Prints out the AppSync GraphQL endpoint to the terminal
        new cdk.CfnOutput(this, "CloudFrontURL", {
            value: portal.distributionDomainName,
        });

        // portal.cloudFrontWebDistribution.addBehavior("/lambda-function/*", apigwOrigin, {
        //     cachePolicy: myCachePolicy}
        // );
    }
}