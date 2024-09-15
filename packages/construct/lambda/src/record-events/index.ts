import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";

const dynamoDb = new DynamoDBClient({});
const TABLE_NAME = process.env.EVENTS_TABLE_NAME;

export const handler: APIGatewayProxyHandler = async (event, context) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "No body provided" }),
    };
  }

  const events = JSON.parse(event.body);

  if (!Array.isArray(events)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request body, expected an array of events" }),
    };
  }

  try {
    for (const eventData of events) {
      const { sessionId, source, hash, event, duration } = eventData;
      const timestamp = new Date().toISOString();

      const item = {
        hash,
        sessionId,
        timestamp,
        source,
        event,
        duration,
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      };

      await dynamoDb.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(item),
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Events recorded successfully" }),
    };
  } catch (error) {
    console.error("Error recording events:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error recording events" }),
    };
  }
};