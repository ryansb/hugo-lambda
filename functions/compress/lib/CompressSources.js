// up number of sockets to communicate with S3
//http.globalAgent.maxSockets = https.globalAgent.maxSockets = 20;

// dependencies
var AWS = require('aws-sdk');
var async = require('async');
var spawn = require('child_process').spawn;
var s3 = require('s3');
var targz = require('tar.gz');
var util = require('util');

var cwd = "/var/task/"
var s3client = new AWS.S3();
var syncClient = s3.createClient({
    s3Client: s3client,
    multipartUploadThreshold: 5 * 1024 * 1024, // use multipart upload at 5MB
    multipartUploadSize: 5 * 1024 * 1024,
    s3RetryDelay: 50,
    //maxAsyncS3: 50,
});

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('input.', 'tar.');

    async.waterfall(
        [
            function downloadSources(next) {
                // download source tarball
                console.log("Downloading sources...");
                var downloader = syncClient.downloadDir({
                    localDir: cwd + "sources",
                    s3Params: {Prefix: "/", Bucket: srcBucket},
                });
                downloader.on('error', function(err) {
                    console.error("unable to sync:", err.stack);
                    next(err);
                });
                downloader.on('progress', function() {
                    console.log("progress amount: " + downloader.progressAmount + ", progress total: " + downloader.progressTotal)
                });
                downloader.on('end', function() {
                    console.log("done downloading");
                    next(null);
                });
            },
            function prepSources(next) {
                console.log("listing cwd")
                var child = spawn("ls", ["-la"], {});
                child.stdout.on('data', function (data) {
                    console.log('ls-stdout: ' + data);
                });
                child.stderr.on('data', function (data) {
                    console.log('ls-stderr: ' + data);
                });
                child.on('error', function(err) {
                    console.log("ls failed with error: " + err);
                    next(err);
                });
                child.on('close', function(code) {
                    console.log("ls exited with code: " + code);
                    next(null);
                });
            },
            function prepSources(next) {
                // tar+gz the content
                console.log("compressing sources....");
                var compress = new targz().compress(cwd + 'sources', cwd + 'sources.tar.gz', function(err){
                    console.log('The compression has ended!');
                    if(err) next(err);
                    else    next(null);
                });
            },
            function uploadOutput(next) {
                // upload tarball to S3 tarbucket
                var uploader = syncClient.uploadFile({
                    localFile: cwd + "sources.tar.gz",
                    s3Params: {
                        Bucket: dstBucket,
                        Key: "hugo-sources-" + (new Date()).toISOString() + ".tar.gz",
                        ContentType: "application/x-gzip",
                        StorageClass: "REDUCED_REDUNDANCY",
                    },
                });
                uploader.on('error', function(err) {
                    console.error("unable to upload:", err.stack);
                    next(err);
                });
                uploader.on('end', function() {
                    console.log("done uploading");
                    next(null);
                });
            },
        ], function(err) {
        if (err) console.error("Failure because of: " + err)
        else console.log("All methods in waterfall succeeded.");

        context.done();
    });
};
