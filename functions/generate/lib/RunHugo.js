// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
var spawn = require('child_process').spawn;

var s3 = new AWS.S3();
var lockKey = '.lambda_lock';

function newLock(params, callback) {
    params['Body'] = (new Date).toString();
    s3.upload(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        callback(err);
    });
}

function lockBucket(srcBucket, callback) {
    var lockValidMinutes = 5;
    var maxAge = new Date(new Date - lockValidMinutes * 60000);
    params = {
        Bucket: srcBucket,
        Key: lockKey,
    };
    s3.headObject(params, function (err, data) {
        if (err) {
            console.log("Lockfile not found, err: " + err);
            newLock(params, callback);
            return;
        }
        console.log("Success checking for lock: " + data);
        if (data.LastModified < maxAge) {
            console.log("Lock has expired");
            // create a new lock and wait for it to propagate
            newLock(params, callback);
        } else {
            callback(null);
        }
    });
}

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('tar.', '');

    async.waterfall([
            function downloadSources(response, next) {
                // download source tarball
                console.log("Downloading sources...");
                s3.getObject({
                    Bucket: srcBucket,
                    Key: item.Key,
                }, function(err, data) {
                    if (err) console.log("Error downloading sources", err);
                    if (err) cb(err);
                    else     cb(null);
                });
            },
            function prepSources(next) {
                // Untar/gz the source to a working dir
                cb(null);
            },
            function runHugo(next) {
                console.log("Running hugo....");
                var child = spawn("./hugo", [], {});
                child.stdout.on('data', function (data) {
                    console.log('hugo-stdout: ' + data);
                });

                child.stderr.on('data', function (data) {
                    console.log('hugo-stderr: ' + data);
                });
                child.on('error', function(err) {
                    console.log("Hugo failed with error: " + err);
                    next(err);
                });
                child.on('close', function(code) {
                    console.log("Hugo exited with code: " + code);
                    next(null);
                });
            },
            function uploadOutput(next) {
                // upload hugo's output to S3
                // marking new items as global-read
                next(null);
            },
        ], function(err) {
            if (err) console.error("Failure because of: " + err)
            else console.log("All methods in waterfall succeeded.");

            context.done();
        });
};
