var spawn = require('child_process').spawn;
var util = require('util');

exports.handler = function(event, context) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    var srcKey    = event.Records[0].s3.object.key;
    var dstBucket = event.Records[0].s3.bucket.name.replace('input.', 'tar.');

    function downloadSources() {
        console.log("Pulling sources");
        dstKey = "hugo-sources-" + (new Date()).toISOString() + ".tar.gz";
        var child = spawn("./tarsync", ["tarstream", "-c", "--from-bucket="+srcBucket, "--to-bucket="+dstBucket, "--key="+ dstKey], {});
        child.stdout.on('data', function (data) {
            console.log('tarsync-stdout: ' + data);
        });
        child.stderr.on('data', function (data) {
            console.log('tarsync-stderr: ' + data);
        });
        child.on('error', function(err) {
            console.log("tarsync failed with error: " + err);
            context.done();
        });
        child.on('close', function(code) {
            console.log("tarsync exited with code: " + code);
            context.done();
        });
    }

    downloadSources();
};
