var async = require('async');
var util = require('util');
var spawn = require('child_process').spawn;
var s3 = require('s3');
var AWS = require('aws-sdk');

var syncClient = s3.createClient({
    maxAsyncS3: 20,
});

tmpDir = "/tmp/sources";
pubDir = tmpDir + "/public";

function isDir(dirName) {
    var isDirRe = new RegExp(/\/$/);
    return dirName.match(isDirRe) !== null;
}

function isStatic(fName) {
    var isStaticRe = new RegExp(/(^static\/|\/static\/)/);
    return fName.match(isStaticRe) !== null;
}

function staticFile(srcBucket, srcKey, dstBucket, context) {
    var awsS3 = new AWS.S3();
    var dst = srcKey.substring(7);
    var keyMatch = srcKey.match(/\/static\//);
    if (keyMatch !== null) {
        console.log("Key " + srcKey + " is in a theme content directory, removing prefix");
        dst = srcKey.substring(keyMatch.index + 8);
    }
    console.log("Dest: " + dst);
    awsS3.headObject({
        Bucket: srcBucket,
        Key: srcKey,
    }, function(err, data) {
        if (err) { // an error occurred
            console.log("Obj not found");
            context.done(err);
        }
        console.log("Obj has etag: " + data.ETag);
        awsS3.copyObject({
            ACL: 'public-read',
            Bucket: dstBucket,
            Key: dst,
            CopySource: srcBucket + '/' + srcKey,
            CopySourceIfNoneMatch: '"f482b82df157bee673b36145f9641005"',
            StorageClass: 'REDUCED_REDUNDANCY',
        }, function(err, data){

            if (err) { // an error occurred
                if (err.code === "PreconditionFailed") {
                    console.log("Static object already exists in S3 and is unmodified.")
                    context.done();
                } else {
                    console.log(util.inspect(err, {depth: 5}));
                    console.log(err.stack);
                    context.done(err);
                }
            } else {
                context.done();
            }
        });
    });
}

function siteGenerate(srcBucket, srcKey, dstBucket, context) {
    async.waterfall([
    function download(next) {
        var params = {
            localDir: tmpDir,

            s3Params: {
                Bucket: srcBucket,
            },
            getS3Params: function(localfile, s3Object, callback) {
                // skip static content
                if (isStatic(s3Object.Key)) {
                    callback(null, null);
                    return;
                }
                if (isDir(s3Object.Key)) {
                    callback(null, null);
                    return;
                }
                callback(null, {});
            },
        };
        var downloader = syncClient.downloadDir(params);
        downloader.on('error', function(err) {
            console.error("unable to sync down:", err.stack);
            next(err);
        });
        downloader.on('end', function() {
            console.log("done downloading");
            next(null);
        });
    },
    function runHugo(next) {
        console.log("Running hugo");
        var child = spawn("./hugo", ["-v", "--source=" + tmpDir, "--destination=" + pubDir], {});
        child.stdout.on('data', function (data) {
            console.log('hugo-stdout: ' + data);
        });
        child.stderr.on('data', function (data) {
            console.log('hugo-stderr: ' + data);
        });
        child.on('error', function(err) {
            console.log("hugo failed with error: " + err);
            next(err);
        });
        child.on('close', function(code) {
            console.log("hugo exited with code: " + code);
            next(null);
        });
    },
    function upload(next) {
        var params = {
            localDir: pubDir,
            deleteRemoved: false,
            s3Params: {
                ACL: 'public-read',
                Bucket: dstBucket,
            },
        };
        var uploader = syncClient.uploadDir(params);
        uploader.on('error', function(err) {
            console.error("unable to sync up:", err.stack);
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
}

function handleFile(srcBucket, srcKey, dstBucket, context) {
    // bail for .git files
    if (srcKey.match(/^\.git\//) !== null) {
        context.done();
        return;
    }
    if (isDir(srcKey)) {
        context.done();
        return;
    }
    if (isStatic(srcKey)) {
        staticFile(srcBucket, srcKey, dstBucket, context);
    } else {
        siteGenerate(srcBucket, srcKey, dstBucket, context);
    }
}

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    //var message = JSON.parse(event.Records[0]);
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('source.', '');

    // don't run hugo for git files
    if (srcKey.match(/^\.git\//) !== null) {
        console.log("Key " + srcKey + " is static content, bailing out");
        context.done();
    }
    handleFile(srcBucket, srcKey, dstBucket, context);
};
