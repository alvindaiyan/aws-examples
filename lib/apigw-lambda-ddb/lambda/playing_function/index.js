'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
    TableName: process.env.DYNAMODB_TABLE
};


module.exports.handler = async (event, context, callback) => {
    let requestParam = JSON.parse(event.body);
    if (!requestParam.id) {
        callback(null, {
            statusCode: error.statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: 'id required'
        });
    }
    const items = await dynamoDb.scan({
        TableName: params.TableName,
    }).promise()

    let request = [];
    for (let item of items.Items) {
        item.playing = item.index === requestParam.id; // todo: be careful the name
        request.push({
            PutRequest: {
                Item: item
            }
        });
    }
    let requestItems = {}
    requestItems[params.TableName] = request
    const batchWriteReq = {
        RequestItems: requestItems
    };
    await dynamoDb.batchWrite(batchWriteReq).promise();

    const response = {
        statusCode: 200,
        body: JSON.stringify(items.Items)
    };
    callback(null, response);
};