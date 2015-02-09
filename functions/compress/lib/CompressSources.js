// up number of sockets to communicate with S3
//http.globalAgent.maxSockets = https.globalAgent.maxSockets = 20;

// dependencies
var AWS = require('aws-sdk');
var fs = require('fs');
var async = require('async');
var spawn = require('child_process').spawn;
var util = require('util');

var cwd = "/tmp/"

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('input.', 'tar.');

    async.waterfall(
        [
            function downloadSources(next) {
                console.log("Pulling sources")
                var child = spawn("./tarsync", ["tar", "-c", "--bucket="+srcBucket, "--outfile="+cwd+"sources.tar.gz"], {});
                child.stdout.on('data', function (data) {
                    console.log('tarsync-stdout: ' + data);
                });
                child.stderr.on('data', function (data) {
                    console.log('tarsync-stderr: ' + data);
                });
                child.on('error', function(err) {
                    console.log("tarsync failed with error: " + err);
                    next(err);
                });
                child.on('close', function(code) {
                    console.log("tarsync exited with code: " + code);
                    next(null);
                });
            },
            function showSources(next) {
                console.log("listing cwd")
                var child = spawn("ls", ["-lah"], {});
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
            function uploadOutput(next) {
                // upload tarball to S3 tarbucket
                var body = fs.createReadStream(cwd+'sources.tar.gz');
                var s3obj = new AWS.S3.ManagedUpload({
                    params: {
                        Bucket: dstBucket,
                        Key: "hugo-sources-" + (new Date()).toISOString() + ".tar.gz",
                        Body: body,
                        ContentType: "application/x-gzip",
                        StorageClass: "REDUCED_REDUNDANCY",
                    }
                });
                s3obj.send(function(err, data) {
                    console.log(err, data);
                    if (err) next(err);
                    else     next(null);
                });
            },
        ], function(err) {
        if (err) console.error("Failure because of: " + err)
        else console.log("All methods in waterfall succeeded.");

        context.done();
    });
};
