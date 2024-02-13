import json
import os

import boto3

s3 = boto3.client("s3")


def handler(event, context):
    # Retrieve the SQS message from the Lambda event
    sqs_message = event["Records"][0]["body"]
    print(sqs_message)
    object = json.loads(sqs_message)
    userId = object["userId"]
    documentId = object["documentId"]
    bucket_name = os.environ["bucketName"]

    # Process the SQS message
    # For demonstration purposes, we'll just print the message
    print("Received message from SQS:", sqs_message)
    try:
        response = s3.get_object(Bucket=bucket_name, Key=userId + ".faiss")
        # Do something with the response (e.g., process the object data)
        object_data = response["Body"].read()
        print(f"Object data: {object_data}")
        # Do something with the object data
        return {"statusCode": 200, "body": "Object retrieved successfully."}
    except Exception as e:
        # Handle any errors that occur
        try:
            s3.put_object(
                Bucket=bucket_name, Key=userId + ".faiss", Body=documentId
            )
            return True
        except Exception as e:
            print(f"Error saving object to S3: {e}")
            return {"statusCode": 500, "body": f"Error retrieving object: {str(e)}"}
