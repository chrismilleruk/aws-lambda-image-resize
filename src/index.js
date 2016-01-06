
import "source-map-support";
import Promise from 'bluebird';
import "babel-polyfill";

import AWS from 'aws-sdk';
import util from 'util';

// import gm from 'gm';
const imageMagick = require('gm').subClass({ imageMagick: true }); // Enable ImageMagick integration.

console.log("init Started");

// constants
const MAX_WIDTH  = 100,
  MAX_HEIGHT = 100;

// get reference to S3 client
var s3 = new AWS.S3();

exports.handler = (event, context) => {
  // Read options from the event.
  console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
  var srcBucket = event.Records[0].s3.bucket.name;
  var srcKey    = event.Records[0].s3.object.key;
  var dstBucket = srcBucket + "-thumbnails";
  var dstKey    = "thumb-" + srcKey;

  // Sanity check: validate that source and destination are different buckets.
  if (srcBucket == dstBucket) {
    console.error("Destination bucket must not match source bucket.");
    return;
  }

  // Infer the image type.
  var typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.error('unable to infer image type for key ' + srcKey);
    return;
  }

  var validImageTypes = ['png', 'jpg', 'jpeg', 'gif'];
  var imageType = typeMatch[1];
  if (validImageTypes.indexOf(imageType.toLowerCase()) < 0) {
    console.log('skipping non-image ' + srcKey);
    return;
  }

  // Download the image from S3, transform, and upload to a different S3 bucket.
  process(srcBucket, srcKey, dstBucket, dstKey, imageType, context);
};

async function process(srcBucket, srcKey, dstBucket, dstKey, imageType, context) {
  var previewUrl;

  try {
    const promisify = Promise.fromCallback;

    let getObjectArgs = {
        Bucket : srcBucket,
        Key    : srcKey
      };

    let response = await promisify((next) => s3.getObject(getObjectArgs, next));

    console.log('start ImageMagick', response);

    let image = imageMagick(response.Body);
    let contentType = response.ContentType;

    console.log('image', image);

    let size = await promisify((next) => image.size(next));

    // Infer the scaling factor to avoid stretching the image unnaturally.
    let scalingFactor = Math.min(
      MAX_WIDTH / size.width,
      MAX_HEIGHT / size.height
    );
    let width  = scalingFactor * size.width;
    let height = scalingFactor * size.height;

    // Transform the image buffer in memory.
    let buffer = await promisify((next) => image.resize(width, height).toBuffer(imageType, next));

    console.log('resized', dstBucket, dstKey, contentType, buffer.length);

    // Stream the transformed image to a different S3 bucket.
    await promisify((next) => s3.putObject({
      Bucket      : dstBucket,
      Key         : dstKey,
      Body        : buffer,
      ContentType : contentType
    }, next));

    // Get a presigned URL valid for 15 mins.
    previewUrl = await promisify((next) => s3.getSignedUrl('getObject', {
      Bucket      : dstBucket,
      Key         : dstKey
    }, next));

  } catch (err) {

    console.error(
      'Unable to resize ' + srcBucket + '/' + srcKey +
      ' and upload to ' + dstBucket + '/' + dstKey +
      ' due to an error: ' + err
    );
    context.fail(err);
    return;
  }

  console.log(
    'Successfully resized ' + srcBucket + '/' + srcKey +
    ' and uploaded to ' + dstBucket + '/' + dstKey
  );

  console.info(previewUrl);

  context.succeed({
    srcBucket: srcBucket,
    srcKey: srcKey,
    dstBucket: dstBucket,
    dstKey: dstKey,
    url: previewUrl
  });
}
