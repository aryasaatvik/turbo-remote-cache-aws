import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";

const dynamoDb = new DynamoDBClient({});
const TABLE_NAME = process.env.EVENTS_TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "No body provided" }),
    };
  }

  const { hashes } = JSON.parse(event.body);

  if (!Array.isArray(hashes)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request body, expected an array of hashes" }),
    };
  }

  try {
    const result: Record<string, any> = {};

    for (const hash of hashes) {
      const queryResult = await dynamoDb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "#artifactHash = :hash",
          ExpressionAttributeNames: {
            "#artifactHash": "hash",
          },
          ExpressionAttributeValues: {
            ":hash": { S: hash },
          },
          Limit: 1,
          ScanIndexForward: false, // to get the most recent event
        })
      );

      if (queryResult.Items && queryResult.Items.length > 0) {
        const item = unmarshall(queryResult.Items[0]);
        result[hash] = {
          size: item.size,
          taskDurationMs: item.duration,
          tag: item.tag,
        };
      } else {
        result[hash] = null;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error querying artifacts:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error querying artifacts" }),
    };
  }
};