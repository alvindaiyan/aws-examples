import {Stack, StackProps, aws_lambda as lambda, aws_dynamodb as dynamodb} from "aws-cdk-lib";
import {Construct} from "constructs";
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as path from "path";
import * as logs from 'aws-cdk-lib/aws-logs';

export class AppSyncStack extends Stack {

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const appsyncApi = new appsync.GraphqlApi(this, 'CognitoBackend', {
            name: 'cognito-learning-appsync-api',
            schema: appsync.Schema.fromAsset(path.join(__dirname, './graphql/schema.graphql')),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.API_KEY,
                },
            },
            xrayEnabled: true,
        });

        const helloworldFunction = new lambda.Function(this, 'helloworld-go', {
            functionName: 'testLambdaHelloWorld',
            runtime: lambda.Runtime.GO_1_X,
            handler: 'main',
            description: 'a helloworld function',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda-hw/main.zip')),
            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        const lambdaDs = appsyncApi?.addLambdaDataSource('lambdaDatasource_Helloworld', helloworldFunction);
        lambdaDs?.createResolver({
            typeName: 'Query',
            fieldName: 'helloworld',
            responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
            requestMappingTemplate: appsync.MappingTemplate.lambdaRequest("$util.toJson($ctx.args)")
        });

        const ddbTable = new dynamodb.Table(this, 'Cognito_DDB_Content', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            tableName: 'cognito_content_test_dev',
        });

        const ddbDs = appsyncApi.addDynamoDbDataSource('lambdaDatasource_DDB_Test', ddbTable);
        ddbDs.createResolver({
            typeName: 'Mutation',
            fieldName: 'createContent',
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
                appsync.PrimaryKey.partition('id').auto(),
                appsync.Values.projecting()
            ),
            responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
        });

        ddbDs.createResolver({
            typeName: 'Query',
            fieldName: 'listContents',
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
            responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
        })

        ddbDs.createResolver({
            typeName: 'Query',
            fieldName: 'getContent',
            requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
                'id', 'id',
            ),
            responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
        })
    }
}
