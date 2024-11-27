import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const TABLE_NAME = process.env.EVENTS_TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const STORE_EVENTS_IN_BUCKET = process.env.STORE_EVENTS_IN_BUCKET === 'true';
const dynamoDb = STORE_EVENTS_IN_BUCKET ? undefined : new DynamoDBClient({});
const s3 = STORE_EVENTS_IN_BUCKET ? new S3Client({}) : undefined;

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
    if (STORE_EVENTS_IN_BUCKET) {
      // Store events in S3 bucket
      const timestamp = new Date().toISOString();
      const key = `events/${timestamp}-${Math.random().toString(36).substring(7)}.json`;

      await s3?.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: JSON.stringify(events),
          ContentType: 'application/json'
        })
      );
    } else {
      // Store events in DynamoDB
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

        await dynamoDb?.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: marshall(item),
          })
        );
      }
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