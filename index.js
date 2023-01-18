const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const console = require('console');

const allowedTypes = [
  'application/octet-stream',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'text/rtf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessing',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function s3(secretKey, accessId) {
  return new aws.S3({
    secretAccessKey: secretKey,
    accessKeyId: accessId,
    region: 'eu-west-2', // E.g us-east-1
  });
}

function eventBridge(secretKey, accessId) {
  return new aws.EventBridge({
    secretAccessKey: secretKey,
    accessKeyId: accessId,
    region: 'eu-west-2', // E.g us-east-1
  });
}

function lambda(secretKey, accessId) {
  return new aws.Lambda({
    secretAccessKey: secretKey,
    accessKeyId: accessId,
    region: 'eu-west-2', // E.g us-east-1
  });
}

/* In case you want to validate your file type */
const fileFilter = (req, file, cb) => {
  if (allowedTypes.indexOf(file.mimetype) > -1) {
    cb(null, true);
  } else {
    cb(new Error('Unsupport file type'), false);
  }
};

function upload(bucketName, secretKey, accessId) {
  const s3Bucket = s3(secretKey, accessId);
  return multer({
    fileFilter,
    storage: multerS3({
      acl: 'private',
      s3: s3Bucket,
      bucket: bucketName,
      key(req, file, cb) {
        const ext = file.originalname.split('.').reverse()[0];
        if (req.params.passportNo) {
          req.file = `${req.params.passportNo}-${Date.now()}.${ext}`;
        } else {
          req.file = `${req.user._id}-licence-${Date.now()}.${ext}`;
        }

        cb(null, req.file);
      },
    }),
  });
}

function uploadDocument(doc, bucketName, fn, secretKey, accessId) {
  const params = {
    Bucket: bucketName,
    Key: fn,
    Body: Buffer.from(doc),
  };
  const uploadToS3 = s3(secretKey, accessId).upload(params);
  return uploadToS3.promise();
}

async function uploadPDF(doc, bucketName, fn, secretKey, accessId) {
  const params = {
    Bucket: bucketName,
    Key: fn,
    Body: Buffer.from(doc, 'base64'),
    ContentType: 'application/pdf',
    EncodingType: 'base64',
  };
  const pdfUpload = s3(secretKey, accessId).upload(params);
  const data = await pdfUpload.promise();
  return data.Body;
}

async function download(fn, bucketName, secretKey, accessId) {
  try {
    const params = {
      Bucket: bucketName,
      Key: fn,
    };

    const res = await s3(secretKey, accessId).getObject(params).promise();
    return res;
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function invokeLambda(lambdaFunc, payload, secretKey, accessId) {
  // wrap payload in detail object to mirror eventBridge input
  const lambdaPayload = {
    detail: payload,
  };

  const params = {
    FunctionName: lambdaFunc,
    Payload: JSON.stringify(lambdaPayload),
  };

  const res = await lambda(secretKey, accessId).invoke(params).promise();

  return res;
}

function publishEvent(event, data, awsDisabled, eventBus, eventSource, secretKey, accessId) {
  if (awsDisabled) {
    return true;
  }

  const params = {
    Entries: [
      {
        Detail: JSON.stringify(data),
        DetailType: event, // matches detail-type
        EventBusName: eventBus, // has to be a valid event bus
        Source: eventSource, // has to match aws eventpattern source
        Time: new Date(),
      },
    ],
  };

  // calc size of putevent request
  let size = 0;

  const source = Buffer.from(params.Entries[0].Source, 'utf-8').length;
  const detailType = Buffer.from(params.Entries[0].DetailType, 'utf-8').length;
  const detail = Buffer.from(params.Entries[0].Detail, 'utf-8').length;
  const time = 14;

  size = Math.round((source + detailType + detail + time) / 1000);

  if (size > 256) {
    console.log(`=> AWS Event bridge: The payload for passport ${data.passportNo} is ${size}KB which exceeds the 256KB payload limit`);
  }
  return eventBridge(secretKey, accessId).putEvents(params).promise();
}

async function getSSMParam(param, secretKey, accessId) {
  const ssm = new aws.SSM({
    secretAccessKey: secretKey,
    accessKeyId: accessId,
    region: 'eu-west-2',
  });

  const paramRs = await ssm
    .getParameters({
      Names: [param],
    })
    .promise();

  return paramRs;
}

async function setSSMParam(param, value, secretKey, accessId) {
  const ssm = new aws.SSM({
    secretAccessKey: secretKey,
    accessKeyId: accessId,
    region: 'eu-west-2',
  });

  const params = {
    Name: param,
    Value: value,
    Overwrite: true,
    Type: 'String',
  };

  const parameter = await ssm.putParameter(params).promise();
  return parameter;
}

function uploadImportDoc(bucketName, secretKey, accessId) {
  const s3Bucket = s3(secretKey, accessId);
  return multer({
    fileFilter,
    storage: multerS3({
      acl: 'private',
      s3: s3Bucket,
      bucket: bucketName,
      key(req, file, cb) {
        /* I'm using Date.now() to make sure my file has a unique name */
        const ext = file.originalname.split('.').reverse()[0];
        const fileName = file.originalname.replace(`.${ext}`, '');
        req.file = `${req.user._id}-${fileName}-${Date.now()}.${ext}`;

        cb(null, req.file);
      },
    }),
  });
}

async function moveObject(fromBucket, toBucket, fileKey, secretKey, accessId) {
  const copyParams = {
    Bucket: toBucket,
    CopySource: encodeURI(`/${fromBucket}/${fileKey}`),
    Key: fileKey,
  };

  console.log(`Attempting s3 copy of "${fileKey}" from "${fromBucket}" to "${toBucket}"`);

  const copyRes = await s3(secretKey, accessId).copyObject(copyParams).promise();
  console.log(JSON.stringify(copyRes));

  const deleteparams = {
    Bucket: fromBucket,
    Key: fileKey,
  };

  console.log(`Attempting s3 delete of "${fileKey}" from "${fromBucket}"`);

  const deleteRes = await s3(secretKey, accessId).deleteObject(deleteparams).promise();
  console.log(JSON.stringify(deleteRes));
}

function publishToSNS(topic, data, secretKey, accessId) {
  const SNS = new aws.SNS({
    apiVersion: '2010-03-31',
    region: 'eu-west-2',
    secretAccessKey: secretKey,
    accessKeyId: accessId,
  });
  const params = {
    TopicArn: topic,
    Message: JSON.stringify(data),
  };
  return SNS.publish(params).promise();
}

function sendSMS(mobileNo, subject, body, secretKey, accessId) {
  const SNS = new aws.SNS({
    apiVersion: '2010-03-31',
    region: 'eu-west-2',
    secretAccessKey: secretKey,
    accessKeyId: accessId,
  });
  const params = {
    Message: body,
    PhoneNumber: mobileNo,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: subject,
      },
    },
  };
  return SNS.publish(params).promise();
}

async function getSignedUrl(bucketName, fn, expiry, secretKey, accessId) {
  let expires = null;
  let expiryMessage = '';

  if (typeof expiry === 'number') {
    expires = expiry;
  } else {
    switch (expiry.toLowerCase()) {
      // Days 1 - 7
      // Hours 1 - 168
      // Minutes 1 - 10080
      case '1day':
        expires = 60 * 1440;
        expiryMessage = 'This link will expire in 1 Day';
        break;
      case '2days':
        expires = 60 * 2880;
        expiryMessage = 'This link will expire in 2 Days';
        break;
      case '3days':
        expires = 60 * 4320;
        expiryMessage = 'This link will expire in 3 Days';
        break;
      case '4days':
        expires = 60 * 5760;
        expiryMessage = 'This link will expire in 4 Days';
        break;
      case '5days':
        expires = 60 * 7200;
        expiryMessage = 'This link will expire in 5 Days';
        break;
      case '6days':
        expires = 60 * 8640;
        expiryMessage = 'This link will expire in 6 Days';
        break;
      case '7days':
        expires = 60 * 10080;
        expiryMessage = 'This link will expire in 7 Days';
        break;
      default: // default to 10 minutes
        expires = 60 * 10;
        expiryMessage = 'This link will expire in 10 Minutes';
    }
  }

  const url = await s3(secretKey, accessId).getSignedUrl('getObject', {
    Bucket: bucketName,
    Key: fn,
    Expires: expires,
  });

  const obj = {
    url,
    expiryMessage,
  };

  return obj;
}

module.exports = {
  s3,
  upload,
  uploadPDF,
  uploadImportDoc,
  download,
  publishEvent,
  publishToSNS,
  sendSMS,
  invokeLambda,
  getSSMParam,
  setSSMParam,
  moveObject,
  getSignedUrl,
  uploadDocument,
};
