const assert = require("assert");
const { publishToQueue } = require('../index');
require('dotenv').config();

describe('SQS Queue Integration Test', function () {
  it('should add a message to the queue', async function () {
    this.timeout(100000);

    const messageBody = { passportNo: 'CLE-123456A', message: 'Hello from SQS!' };
    const response = await publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID);

    assert.ok(response.MessageId, 'Response does not have a MessageId');
  });

  it('should add 500 messages to the queue', async function () {
    this.timeout(100000);

    const messageBody = { passportNo: 'CLE-123456A', message: 'Hello from SQS!' };
    const promises = [];

    for (let i = 0; i < 500; i++) {
      promises.push(
        publishToQueue(
          process.env.QUEUE_URL,
          process.env.QUEUE_MESSAGE_GROUP,
          'cl-entry-submitted',
          { ...messageBody, passportNo: `CLE-123456-${i}` },
          false,
          process.env.BUCKET_NAME,
          process.env.CL_AWS_SECRET_ACCESS_KEY,
          process.env.CL_AWS_ACCESS_KEY_ID
        )
      );
    }

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      assert.ok(response.MessageId, 'Response does not have a MessageId');
    });
  });

  it('should fail to add a large message to the queue', async function () {
    this.timeout(100000);

    //require('dotenv').config();

    const messageBody = { passportNo: 'CLE-XXXXXXA', message: 'Hello from SQS! ' + 'a'.repeat(266240) }; // 260 * 1024 = 262144 bytes
    const response = await publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', messageBody, false, process.env.BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID);

    assert.ok(response.MessageId, 'MessageId missing');
  });

  it('should add 300 large messages to the queue', async function () {
    this.timeout(100000);

    const messageBody = { passportNo: 'CLE-XXXXXXA', message: 'Hello from SQS! ' + 'a'.repeat(266240) }; // 260 * 1024 = 262144 bytes
    const promises = [];

    for (let i = 0; i < 300; i++) {
      promises.push(publishToQueue(process.env.QUEUE_URL, process.env.QUEUE_MESSAGE_GROUP, 'cl-entry-submitted', { ...messageBody, passportNo: `CLE-123456-${i}` }, false, process.env.BUCKET_NAME, process.env.CL_AWS_SECRET_ACCESS_KEY, process.env.CL_AWS_ACCESS_KEY_ID));
    }

    const responses = await Promise.all(promises);

    responses.forEach((response) => {
      assert.ok(response.MessageId, 'Response does not have a MessageId');
    });
  });
});
