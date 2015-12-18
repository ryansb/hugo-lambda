from __future__ import print_function
from cfn_wrapper import cfn_resource
import letsencrypt.cli


base_arguments = (
    '--text',
    '--agree-tos',
    '--redirect',
    '--authenticator', 'letsencrypt-s3front:auth',
    '--installer', 'letsencrypt-s3front:installer',
    '--config-dir', '/tmp/letsencrypt/config',
    '--logs-dir', '/tmp/letsencrypt/logs',
    '--work-dir', '/tmp/letsencrypt/work',
    '--rsa-key-size', '2048',
)


@cfn_resource
def lambda_handler(event, context):
    if event['RequestType'] in ['Update', 'Delete']:
        # TODO (ryansb) delete IAM certificate when done
        return {
            "Status": "SUCCESS",
            "Reason": "Life is good, man",
            "PhysicalResourceId": "some:fake:id",
            "Data": {},
        }

    properties = event['ResourceProperties']

    for p in ('SourceBucket', 'Domains', 'DistributionId', 'Email'):
        if properties.get(p) is None:
            reason = "ERROR: No property '%s' on event %s" % (p, event)
            print(reason)
            return {
                "Status": "FAILED",
                "Reason": reason,
                "PhysicalResourceId": "could-not-create",
                "Data": {},
            }

    if not isinstance(properties.get('Domains'), list):
        reason = "ERROR: Domains is not a list in event %s" % event
        print(reason)
        return {
            "Status": "FAILED",
            "Reason": reason,
            "PhysicalResourceId": "could-not-create",
            "Data": {},
        }

    customized = list(base_arguments)
    customized.extend([
        '--letsencrypt-s3front:auth-s3-bucket',
        properties['SourceBucket']
    ])

    for d in properties['Domains']:
        customized.extend(['--domain', d])

    customized.extend([
        '--letsencrypt-s3front:installer-cf-distribution-id',
        properties['DistributionId']
    ])

    customized.extend(['--email', properties['Email']])

    print(event)
    print(customized)
    try:
        letsencrypt.cli.main([str(c) for c in customized])
    except Exception as e:
        reason = "Failure in letsencrypt: %s" % e
        print("ERROR: " + reason)
        return {
            "Status": "FAILED",
            "Reason": reason,
            "PhysicalResourceId": "could-not-create",
            "Data": {},
        }
    return {
        "Status": "SUCCESS",
        "Reason": "Life is good, man",
        "PhysicalResourceId": "some:fake:id",
        "Data": {},
    }
