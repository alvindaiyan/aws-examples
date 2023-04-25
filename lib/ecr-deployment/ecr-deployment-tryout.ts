import {
    aws_ecr, CustomResource, RemovalPolicy,
    Stack,
    StackProps
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
// import {DockerImageName, ECRDeployment} from './cdk-ecr-deployment';
import * as cdk from 'aws-cdk-lib';
import {DockerImageName, ECRDeployment} from "./cdk-ecr-deployment/lib";


export class EcrDeploymentTryout extends Stack {

    private readonly id:string;

    private readonly imageUrl: string ='nginx:latest';


    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        this.id = id;

        const dockerRepo = new aws_ecr.Repository(this, `${this.id}-repo`, {
            repositoryName: `dreambooth-training-repo`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const ecrDeployment = new ECRDeployment(this, `${this.id}-ecr-deploy`, {
            // memoryLimit: 10240,
            src: new DockerImageName(this.imageUrl),
            dest: new DockerImageName(`${dockerRepo.repositoryUri}:latest`),
        });
        // ecrDeployment.node.addDependency(dockerRepo);

        const ecrCR = new CustomResource(this, `${this.id}-cr-image`, {
            serviceToken: ecrDeployment.serviceToken,
            resourceType: 'Custom::AISolutionKitECRLambda',
            properties: {
                SrcImage: `docker://${this.imageUrl}`,
                DestImage: `docker://${dockerRepo.repositoryUri}:latest`,
                RepositoryName: `${dockerRepo.repositoryName}`,
            },
        });
    }
}
