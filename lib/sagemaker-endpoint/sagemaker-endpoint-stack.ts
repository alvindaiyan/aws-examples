// import {DockerImageName, ECRDeployment} from './cdk-ecr-deployment';
import {aws_iam, aws_sagemaker, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {
    CfnEndpointConfig,
    CfnEndpointConfigProps,
    CfnEndpointProps,
    CfnModelProps
} from "aws-cdk-lib/aws-sagemaker/lib/sagemaker.generated";
import {Effect, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import AsyncInferenceConfigProperty = CfnEndpointConfig.AsyncInferenceConfigProperty;


export class SagemakerEndpointStack extends Stack {

    private readonly id:string;

    private readonly imageUrl: string ='public.ecr.aws/v1y2w4o9/aigc-webui-dreambooth-create-model:latest';
    // private readonly imageUrl: string ='nginx:latest';

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        this.id = id;
        const sagemakerRole = new aws_iam.Role(this, `${this.id}-sagemaker-role`, {
            assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
        });
        sagemakerRole.addManagedPolicy(aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
        sagemakerRole.addToPolicy(new aws_iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
            ],
            resources: ['arn:aws:s3:::*']
        }));

        const model = new aws_sagemaker.CfnModel(this, `${this.id}-model`, <CfnModelProps>{
            executionRoleArn: sagemakerRole.roleArn,
            modelName: `${this.id}-cdk-sample-model`,
            primaryContainer: {
                image: '991301791329.dkr.ecr.us-west-1.amazonaws.com/ecr-deployment-tryout-20-repo:latest'
            },
        });

        const modelConfig = new aws_sagemaker.CfnEndpointConfig(this, `${this.id}-model-config`, <CfnEndpointConfigProps>{
            endpointConfigName: `${this.id}-config`,
            productionVariants: [
                {
                    modelName: model.modelName,
                    initialVariantWeight: 1.0,
                    instanceType: 'ml.g4dn.2xlarge',
                    variantName: 'main',
                    initialInstanceCount: 1,
                }
            ],
            asyncInferenceConfig: <AsyncInferenceConfigProperty>{
                // clientConfig: {},
                outputConfig: {
                    s3OutputPath: 's3://alvindaiyan-aigc-testing-playground/sagemaker-manu/',
                    // notificationConfig: {
                    //     successTopic:
                    // }
                },
            },

        });

        modelConfig.node.addDependency(model);

        const endpoint = new aws_sagemaker.CfnEndpoint(this, `${this.id}-endpoint`, <CfnEndpointProps>{
            endpointConfigName: modelConfig.endpointConfigName,
            endpointName: `${this.id}-endpoint`

        });

        endpoint.node.addDependency(modelConfig);
    }


}
