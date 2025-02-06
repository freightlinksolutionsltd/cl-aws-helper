const assert = require('assert');
const { publishToQueue, publishEvent, uploadPDF } = require('../index');
require('dotenv').config();

describe('SQS Queue Integration Test', function () {
  it('test EventBridge invoke', async function () {
    this.timeout(100000);

    const messageBody = {
      passportNo: 'CLO-M5VA0WX6',
      message: 'Hello from SQS!',
      importExport: 'Import',
      ssgb: true,
      journey: {
        arrivalPort: {
          countryId: {
            code: 'GB',
          },
        },
      },
    };

    const response = await publishEvent('cl-entry-submitted', messageBody, false, process.env.CL_AWS_EVENT_BUS, process.env.CL_AWS_EVENT_SOURCE, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID);

    assert.ok(response.Entries, 'Response does not have a Entries');
  });

  it('should add a message to the queue', async function () {
    this.timeout(100000);

    const messageBody = {
      passportNo: 'CLO-M5VA0WX6',
      message: 'Hello from SQS!',
      importExport: 'Import',
      ssgb: true,
      journey: {
        arrivalPort: {
          countryId: {
            code: 'GB',
          },
        },
      },
    };

    const response = await publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.SQS_BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID);

    assert.ok(response.MessageId, 'Response does not have a MessageId');
  });

  it('should add 500 messages to the queue', async function () {
    this.timeout(100000);

    /* {
      "detail-type": [
        "cl-entry-submitted"
      ],
      "source": [
        "cl-uat"
      ],
      "detail": {
        "importExport": [
          "ssd",
          "Import",
          "Export"
        ],
        "ssgb": [
          true
        ],
        "journey": {
          "arrivalPort": {
            "countryId": {
              "code": [
                "GB"
              ]
            }
          }
        }
      }
    } */

    const messageBody = {
      passportNo: 'CLO-M5VA0WX6',
      message: 'Hello from SQS!',
      importExport: 'Import',
      ssgb: true,
      journey: {
        arrivalPort: {
          countryId: {
            code: "GB"
          }
        }
      }
    };

    const promises = [];

    for (let i = 0; i < 500; i++) {
      promises.push(publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.SQS_BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID));
    }

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      assert.ok(response.MessageId, 'Response does not have a MessageId');
    });
  });

  it('should fail to add a large message to the queue', async function () {
    this.timeout(100000);

    //require('dotenv').config();

    const messageBody = {
      passportNo: 'CLO-M5VA0WX6',
      message: 'Hello from SQS!' + 'a'.repeat(266240),
      importExport: 'Import',
      ssgb: true,
      journey: {
        arrivalPort: {
          countryId: {
            code: 'GB',
          },
        },
      },
    };

    const response = await publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.SQS_BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID);

    assert.ok(response.MessageId, 'MessageId missing');
  });

  it('should add 300 large messages to the queue', async function () {
    this.timeout(100000);

    const messageBody = {
      passportNo: 'CLO-M5VA0WX6',
      message: 'Hello from SQS!' + 'a'.repeat(266240),
      importExport: 'Import',
      ssgb: true,
      journey: {
        arrivalPort: {
          countryId: {
            code: 'GB',
          },
        },
      },
    };

    const promises = [];

    for (let i = 0; i < 300; i++) {
      promises.push(publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.SQS_BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID));
    }

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      assert.ok(response.MessageId, 'Response does not have a MessageId');
    });
  });
});

describe('uploadPDF function', function() {
  this.timeout(10000); // Increase timeout for S3 operations

  it('should successfully upload a PDF to S3', async function() {
    // Mock PDF data (base64 encoded string of a small PDF)
    const mockPDFData = 'JVBERi0xLjMNCiXi48/TDQoNCjEgMCBvYmoNCjw8DQovVHlwZSAvQ2F0YWxvZw0KL091dGxpbmVzIDIgMCBSDQovUGFnZXMgMyAwIFINCj4+DQplbmRvYmoNCg0KMiAwIG9iag0KPDwNCi9UeXBlIC9PdXRsaW5lcw0KL0NvdW50IDANCj4+DQplbmRvYmoNCg0KMyAwIG9iag0KPDwNCi9UeXBlIC9QYWdlcw0KL0NvdW50IDENCi9LaWRzIFsgNCAwIFIgXQ0KPj4NCmVuZG9iag0KDQo0IDAgb2JqDQo8PA0KL1R5cGUgL1BhZ2UNCi9QYXJlbnQgMyAwIFINCi9SZXNvdXJjZXMgPDwNCi9Gb250IDw8DQovRjEgOSAwIFIgDQo+Pg0KL1Byb2NTZXQgOCAwIFINCj4+DQovTWVkaWFCb3ggWzAgMCA2MTIuMDAwMCA3OTIuMDAwMF0NCi9Db250ZW50cyA1IDAgUg0KPj4NCmVuZG9iag0KDQo1IDAgb2JqDQo8PCAvTGVuZ3RoIDY3Pj4NCnN0cmVhbQ0KQlQNCi9GMSAxOCBUZg0KMCAwIFRkDQooSGVsbG8gV29ybGQpIFRqDQpFVA0KZW5kc3RyZWFtDQplbmRvYmoNCg0KNiAwIG9iag0KPDwNCi9UeXBlIC9QYWdlDQovUGFyZW50IDMgMCBSDQovUmVzb3VyY2VzIDw8DQovRm9udCA8PA0KL0YxIDkgMCBSIA0KPj4NCi9Qcm9jU2V0IDggMCBSDQo+Pg0KL01lZGlhQm94IFswIDAgNjEyLjAwMDAgNzkyLjAwMDBdDQovQ29udGVudHMgNyAwIFINCj4+DQplbmRvYmoNCg0KNyAwIG9iag0KPDwgL0xlbmd0aCA2Nz4+DQpzdHJlYW0NCkJUDQovRjEgMTggVGYNCjAgMCBUZA0KKEhlbGxvIFdvcmxkKSBUag0KRVQNCmVuZHN0cmVhbQ0KZW5kb2JqDQoNCjggMCBvYmoNClsgL1BERiAvVGV4dCBdDQplbmRvYmoNCg0KOSAwIG9iag0KPDwNCi9UeXBlIC9Gb250DQovU3VidHlwZSAvVHlwZTENCi9OYW1lIC9GMQ0KL0Jhc2VGb250IC9IZWx2ZXRpY2ENCi9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nDQo+Pg0KZW5kb2JqDQoNCjEwIDAgb2JqDQo8PA0KL0NyZWF0b3IgKFJhdmUgXChodHRwOi8vd3d3Lm5ldmVybWluZC5jb21cKSkNCi9Qcm9kdWNlciAoTmV2ZXJNaW5kIDEuMC4yKQ0KL0NyZWF0aW9uRGF0ZSAoRDoyMDAzMDcyMzE3MzUwNCkNCj4+DQplbmRvYmoNCg0KeHJlZg0KMCAxMQ0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMDE5IDAwMDAwIG4NCjAwMDAwMDAwOTMgMDAwMDAgbg0KMDAwMDAwMDE0NyAwMDAwMCBuDQowMDAwMDAwMjIyIDAwMDAwIG4NCjAwMDAwMDA0MTUgMDAwMDAgbg0KMDAwMDAwMDUzNCAwMDAwMCBuDQowMDAwMDAwNzI3IDAwMDAwIG4NCjAwMDAwMDA4NDYgMDAwMDAgbg0KMDAwMDAwMDg3NiAwMDAwMCBuDQowMDAwMDAwOTkzIDAwMDAwIG4NCnRyYWlsZXINCjw8DQovU2l6ZSAxMQ0KL1Jvb3QgMSAwIFINCi9JbmZvIDEwIDAgUg0KPj4NCg0Kc3RhcnR4cmVmDQoxMTQ0DQolJUVPRg0K';

    const bucketName = process.env.CL_RECEIVED_DOCUMENTS_BUCKET_NAME;
    const fileName = `test-pdf-${Date.now()}.pdf`;
    const secretKey = process.env.PROD_CL_AWS_SECRET_KEY;
    const accessId = process.env.PROD_CL_AWS_ACCESS_ID;

    try {
      const result = await uploadPDF(
        mockPDFData,
        bucketName,
        fileName,
        secretKey,
        accessId
      );

      // Assert that the upload was successful
      assert.ok(result, 'Upload result should not be null or undefined');
      assert.ok(result.ETag, 'Upload result should have an ETag');

      console.log(`PDF uploaded successfully. ETag: ${result.ETag}`);
    } catch (error) {
      console.error('Error during PDF upload:', error);
      throw error; // Re-throw to fail the test
    }
  });
});