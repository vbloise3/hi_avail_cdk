import json
import boto3
from appsyncclient import AppSyncClient

appsyncClient = AppSyncClient(region="us-east-1",apiId="m2ctvlrjyvbmzmnj6z2wkv2t2q",apiKey="da2-l7q3athxlzdjpbgqds3ciaxkty",authenticationType="API_KEY")
query = json.dumps({"query": "{\n  all(limit:10) {\n    items{\n    name\n  items2Id\n}\n}\n}\n"})
response = appsyncClient.execute(data=query) 
print(json.dumps(response, indent=4, sort_keys=True))
