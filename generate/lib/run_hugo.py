import boto3
import subprocess
import botocore.exceptions
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto.client('s3')

tmp_dir = '/tmp/sources'
dest_dir = '/tmp/sources/public'

def static_file(key, source_bucket, dest_bucket):
    dest_key = key.split('static/')[-1]
    dest_metadata = s3.head_object(Bucket=dest_bucket, Key=dest_key)

    try:
        s3.copy_object(
            ACL='public-read',
            Bucket=dest_bucket,
            Key=dest_key,
            CopySource='/'.join(source_bucket, key),
            # don't copy if the destination object is already correct
            CopySourceIfNoneMatch=dest_metadata['ETag'],
        )
    except botocore.exceptions.ClientError as exc:
        if "PreconditionFailed" not in exc.message:
            logger.error("Failure copying static file")
            logger.exception(exc)


def generate_site(source_bucket, dest_bucket):
    # download files to TMP
    hugo = subprocess.Popen(
        ["./hugo", '-v', '--source=' + tmp_dir, '--destination' + dest_dir],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    stdout, stderr = hugo.communicate()

    if hugo.returncode != 0:
        logger.error("Hugo exited with code %d" % exit)
        logger.error("---stdout---\r\n%s\r\n---end stdout---" % stdout)
        logger.error("---stderr---\r\n%s\r\n---end stderr---" % stderr)
    else:
        logger.debug("Hugo exited with code %d" % exit)
        logger.debug("---stdout---\r\n%s\r\n---end stdout---" % stdout)
        logger.debug("---stderr---\r\n%s\r\n---end stderr---" % stderr)

    # upload to cloud


def handler(event, context):
    key = event['Records']['s3']['object']['key']
    source_bucket = event['Records']['s3']['bucket']['name']
    dest_bucket = "source." + source_bucket

    if key.startswith('.git/'):
        logger.debug("Git file, skipping.")
        return
    if key.endswith('/'):
        logger.debug("Directory, skipping.")
        return
    if key.startswith('static/') or '/static/' in key:
        # handle as a static file
        static_file(key, source_bucket, dest_bucket)
    else:
        pass
        # handle default case of generating the whole site
