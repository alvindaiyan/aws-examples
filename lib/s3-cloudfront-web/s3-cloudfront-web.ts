import {
    Stack,
    StackProps,
    aws_s3 as s3,
    aws_s3_deployment as s3d,
    aws_cloudfront as cloudfront,
    RemovalPolicy,
    Aws
} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {CloudFrontToS3} from "@aws-solutions-constructs/aws-cloudfront-s3";
import * as path from "path";


export class WebPortalStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const portal = new CloudFrontToS3(this, "cognito-web-s3", {
            bucketProps: {
                versioned: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
                accessControl: s3.BucketAccessControl.PRIVATE,
                enforceSSL: true,
                removalPolicy: RemovalPolicy.RETAIN,
                autoDeleteObjects: false,
            },
            cloudFrontDistributionProps: {
                priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
                enableIpv6: false,
                enableLogging: true, //Enable access logging for the distribution.
                comment: `${Aws.STACK_NAME} - Web Console Distribution (${Aws.REGION})`,
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html",
                    },
                ],
            },
            insertHttpSecurityHeaders: false,
        });

        const portalBucket = portal.s3Bucket as s3.Bucket;
        const portalUrl = portal.cloudFrontWebDistribution.distributionDomainName;

        // Prints out the AppSync GraphQL endpoint to the terminal
        new cdk.CfnOutput(this, "CloudFrontURL", {
            value: portalUrl,
        });

        const configFn = 'aws-exports.json';
        // upload static web assets
        new s3d.BucketDeployment(this, 'CognitoWebAssets', {
            sources: [
                s3d.Source.asset(path.join(__dirname, './build')),
            ],
            destinationBucket: portalBucket,
            prune: false,
        });
    }
}