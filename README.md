## hugo-lambda

A wrapper around the [hugo][hugo] static site generator to have it run in
[AWS Lambda][lambda] whenever new (markdown or other) content is uploaded.

## Project status

Ultra-alpha. 

_Basic functionality checklist_

- [x] CloudFormation template for IAM roles and buckets
- [ ] Diagnostic/debug functionality for functions
- [ ] Figure out a good place to store configuration
- [ ] Download site sources to lambda instance
- [ ] Run hugo
- [ ] upload output to configured bucket

_Advanced functionality checklist_

- [ ] CloudFormation template to set up cross-domain IAM auth
- [ ] in-browser markdown editor
- [ ] Set lifecycle rules and RRS policy for tar bucket
- [ ] SNS cancellation for in-progress jobs to reduce redundant hugo runs

## Overview

1. Download this repo and run the CloudFormation template
1. Upload your site's source to the input.your.site bucket
1. The first lambda function downloads and compresses the content, then saves
   it to the tar.your.site bucket.
1. The second lambda function streams the object from tar.your.site and runs
   hugo
1. Generated site is synced to the your.site bucket, and is served by S3 
   [static hosting][s3site]

So why go to all this trouble? Because running a CMS like Wordpress, Drupal,
and others gets expensive for infrequently edited sites. You pay 24/7 to run
all the code to let you edit your site, when that code only runs when you
update your blog. Static site generators are cheaper to run (just toss the
files somewhere) but if you're not at the computer you normally use to edit and
publish content, you may not have all your tools.

hugo-lambda solves this by adding a JS editor to your hugo site, which uploads
raw markdown to S3 where lambda regenerates your site. All the niceties of a
CMS, but without running a server.

## How it works

Lambda is a service that lets you define a node.js function and have it run
whenever a specific trigger happens. These triggers can be new objects in S3,
events in a [Kinesis][kinesis] stream, or DynamoDB table updates. Those
functions can access other buckets, download files, or do just about anything
else. The kicker is *you only pay for the time your function is running*.
Instead of paying for an instance 24/7 to react to events, you only pay for the
time spent actually reacting. This makes lambda incredibly cheap for cases
where you have an infrequent event that requires some action to happen.

There are three buckets where content resides. The first is
`input.yoursite.com`, which contains all the information hugo needs to generate
your site. The second is `tar.yoursite.com` which holds tarred and gzipped
snapshots of your site. The final bucket is the website bucket that holds the
finished site and serves it to the world.

## License

This project is released under the GNU Affero General Public License, see
[LICENSE.txt][license] for the full text of the license.

[hugo]: https://github.com/spf13/hugo
[lambda]: https://aws.amazon.com/lambda/
[kinesis]: https://aws.amazon.com/kinesis/
[kappa]: https://github.com/garnaat/kappa
[s3site]: http://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html
[license]: https://github.com/ryansb/hugo-lambda/blob/master/LICENSE.txt
