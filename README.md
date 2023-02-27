# cl-aws-helper

AWS helper to use across server and lambdas. To make it usable across multiple projects and environments, all env vars are removed and will need to be passed to each function.

## Methods with required arguments:

Every time a method will have "secretKey", "accessId" or "bucketName" as an argument, these are AWS credentials usually kept in env variables.

### 1. s3(secretKey, accountId)

This method returns a AWS s3 object. AWS secret key and account Id is required to create this object.

### 2. upload(bucketName, secretKey, accessId)

Using multer to upload documents to S3 bucket for a specific passport. This needs to be used like a middleware, because this method needs access to 'req'.

### 3. uploadPDF(doc, bucketName, fn, secretKey, accessId)

doc - document to upload
fn - file name (This will be set as S3 key for that file)

### 4. uploadImportDoc(bucketName, secretKey, accessId)

Function used to upload supporting documents for goods in declarations. To be used as a middleware, because it needs access to 'req' vars.

### 5. download(fn, bucketName, secretKey, accessId)

fn - file name (S3 Key name).

This function is used to download files from S3. It returns promise with S3 response or 'null' in case of an error.

### 6. publishEvent(event, data, awsDisabled, eventBus, eventSource, secretKey, accessId)

event - matches the 'DetailType' field
data - matches the 'Detail' field
awsDisabled - safety switch. If no env. var is present and this functionallity is not supposed to be disabled, plaese send 'null'.
eventBus - name of AWS event bus, usually kept in env. vars.
eventSource - name of AWS event source, usually kept in env. vars.

Method used to publish an event in AWS Event Bridge. It triggers a specified event to invoke whichever functionallity is assigned to it in AWS.

### 7. publishToSNS(topic, data, secretKey, accessId)

opic - this is the TopicArn of SNS topic we want to call.
data - value of SNS message to be sent.

This method calls the selected SNS topic to send the data passed as a message. It returns a promise with SNS response.

### 8. sendSMS(mobileNo, subject, body, secretKey, accessId)

mobileNo - recepient's mobile number
subject - sender's name
body - message body

Function sends SMS message with given parameters. It returns a promise with SNS response.

### 9. invokeLambda(lambdaFunc, payload, secretKey, accessId)

lambdaFunc - name of the lambda to call.
payload - payload sent to the lambda function.

Method invokes selected lambda and returns a promise.

### 10. getSSMParam(param, secretKey, accessId)

param - SSM 'Names' field value.

Function calls for AWS SSM parameters and returns them as a promise.

### 11. setSSMParam(param, value, secretKey, accessId)

param - SSM 'Names' field value.

Function puts new AWS SSM parameter and returns a promise.

### 12. moveObject(fromBucket, toBucket, fileKey, secretKey, accessId)

fromBucket - Name of S3 bucket the file is currently in.
toBucket - name of S3 bucket we want to move this file to.
fileKey - name of a file to copy (S3 key).

Method used to move files between buckets.

### 13. getSignedUrl(bucketName, fn, expiry, secretKey, accessId)

fn - name of the file stored in S3 Bucket (S3 key)
expiry - string value stating how long the generated link should be valid. Possible values:

'1day', '2days', '3days', '4days', '5days', '6days', '7days'.

If no value will be specified or a value will be different from the ones specified above, the default expiry time will be 10 minutes.

This method creates a link to download file from S3 bucket. This link will only be valid for a specified period of time, after which it will expire and will no longer be accessible.

### 14. listObjects(bucketName, data, continuationToken, secretKey, accessId)

bucketName - name of S3 bucket we want to get a list of objects from

data - an array (preferably empty array) the data will be stored and returned with. We need this to invoke function recursively

continuationToken - used to run function recursively and get correct info from S3 bucket when data is truncated. Null can be passed in, as this is not used in first iteration

This method returns the array of all objects from selected S3 bucket.