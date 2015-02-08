// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
var spawn = require('child_process').spawn;
var s3 = require('s3');

var s3client = new AWS.S3();
var syncClient = s3.createClient({
    s3Client: s3client,
    multipartUploadThreshold: 5 * 1024 * 1024, // use multipart upload at 5MB
    multipartUploadSize: 5 * 1024 * 1024,
    s3RetryDelay: 50,
    maxAsyncS3: 50,
});

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('tar.', '');

    async.waterfall([
            function downloadSources(next) {
                // download source tarball
                console.log("Downloading sources...");
                var downloader = syncClient.downloadFile({
                    localFile: "./sources.tar.gz",
                    s3Params: {
                        Bucket: srcBucket,
                        Key: item.Key,
                    },
                });
                downloader.on('error', function(err) {
                    console.error("unable to upload:", err.stack);
                    next(err);
                });
                downloader.on('end', function() {
                    console.log("done uploading");
                    next(null);
                });
            },
            function prepSources(next) {
                // Untar/gz the source to a working dir
                console.log("compressing sources....");
                var child = spawn("./tar" ["xzf", "sources.tar.gz"], {});
                child.stdout.on('data', function (data) {
                    console.log('tar-stdout: ' + data);
                });
                child.stderr.on('data', function (data) {
                    console.log('tar-stderr: ' + data);
                });
                child.on('error', function(err) {
                    console.log("tar: " + err);
                    next(err);
                });
                child.on('close', function(code) {
                    console.log("tar exited with code: " + code);
                    next(null);
                });
                cb(null);
            },
            function runHugo(next) {
                console.log("Running hugo....");
                var child = spawn("./hugo", ["-s", "sources/", "-d", "public"], {});
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
                var uploader = syncClient.uploadDir({
                    localDir: "./public",
                    s3Params: {Prefix: "/", Bucket: dstBucket},
                    ACL: "public-read",
                });
                uploader.on('error', function(err) {
                    console.error("unable to sync:", err.stack);
                    next(err);
                });
                uploader.on('end', function() {
                    console.log("done uploading generated site");
                    next(null);
                });
            },
        ], function(err) {
            if (err) console.error("Failure because of: " + err)
            else console.log("All methods in waterfall succeeded.");

            context.done();
        });
};
