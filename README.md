## hugo-lambda

A wrapper around the [hugo][hugo] static site generator to have it run in
[AWS Lambda][lambda] whenever new (markdown or other) content is uploaded.

## Project status

[![forthebadge](http://forthebadge.com/images/badges/powered-by-electricity.svg)](http://forthebadge.com)
[![forthebadge](http://forthebadge.com/images/badges/uses-badges.svg)](http://forthebadge.com)

_Basic functionality checklist_

- [x] CloudFormation template for IAM roles and buckets
- [ ] Diagnostic/debug functionality for functions
- [x] Figure out a good place to store configuration
- [x] Download site sources to lambda instance
- [x] Run hugo
- [x] upload output to configured bucket

_Advanced functionality checklist_

- [ ] CloudFormation template to set up cross-domain IAM auth
- [ ] CloudFormation conditions for users who don't want to use Route53
- [ ] in-browser markdown editor
- [ ] SNS cancellation for in-progress jobs to reduce redundant hugo runs

## Overview

1. Download this repo and run the CloudFormation template
1. Upload your site's source to the input.your.site bucket
1. The first lambda function downloads and syncs any static content to
   the your.site bucket
1. The second lambda function pulls down all the theme/template content and
   runs hugo to generate your site
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

## Quickstart

To start, you'll need to have GNU `make`, `awscli`, `PyYAML`, and `npm` installed.

1. Clone this repo `git clone https://github.com/ryansb/hugo-lambda`
1. Replace "input.rsb.io" with your input bucket in `generate/config.yml`
1. Replace "rsb.io" with your own domain in `template.yml` This must be the
   root of a Route53 domain you control, and an available bucket name.
1. Create the function and roles by running `make create`
1. Upload all your content to input.yourdomain.com
1. Enjoy!

## How it works

*See [these][intro] blog [posts][deploying] for more info on using/deploying
hugo-lambda*

Lambda is a service that lets you define a node.js function and have it run
whenever a specific trigger happens. These triggers can be new objects in S3,
events in a [Kinesis][kinesis] stream, or DynamoDB table updates. Those
functions can access other buckets, download files, or do just about anything
else. The kicker is *you only pay for the time your function is running*.
Instead of paying for an instance 24/7 to react to events, you only pay for the
time spent actually reacting. This makes lambda incredibly cheap for cases
where you have an infrequent event that requires some action to happen.

There are two buckets where content resides. The first is
`input.yoursite.com`, which contains all the information hugo needs to generate
your site. The second is the website bucket that holds the finished site and
serves it to the world.

## Developing

When working on the functions, I recommend using [kappa][kappa] to re-upload
and trigger the function you've made changes to. Instructions are available in
kappa's README.

## CloudFormation

Ok, that CFN template is pretty large/gross. To make it easier to manage and
edit, I've moved to editing it in YAML and generating the JSON version to send
to AWS. If you edit the YAML, you can regenerate the JSON template one of two
ways.

1. Make sure the `PyYAML` module is installed and run `make template`
1. Use a site like [yamltojson.com](http://yamltojson.com/)

To use it, you'll need to provide the base domain of your site. For example,
mine is [rsb.io](http://rsb.io). This will determine the name of your buckets
and will make the correct [Route53][r53] aliases to make your site accessible.

Right now, the following resources are created by the template

1. 3 buckets: `input.ROOT`, `www.ROOT`, and `ROOT`
1. 2 domain records: one for your apex and one for `www.ROOT`, which redirects
   to `ROOT` via the `www.ROOT` bucket.
1. InvokeRole IAM role. The InvokeRole is allowed to trigger lambda functions
   and is used primarily for development
1. ExecRole IAM Role. The ExecRole is the role that the lambda functions take
   on when they execute. Thi role gets access to the S3 buckets to upload and
   download content.

### Troubleshooting - Oops, my stack failed!

The most common problem you'll hit is probably not having a Route53 record set
for your domain. The stack won't create one, so it'll fail instead. To get
around this you can just delete the "SiteDNS" resource. Nothing depends on it,
so no worries.

The next one will probably be IAM problems. If this happens, make sure you have
the permissions to create/edit IAM roles. Typically if you aren't an
administrator on your account (or are using a scoped-down IAM role yourself),
you won't have the permissions to do this.

## Contributing

Questions, suggestions, bug reports, and contributions are welcome as pull
requests or issues on this repo.  Please see the [Contributor code of
conduct][conduct] for community guidelines.

This project is released under the GNU Affero General Public License, see
[LICENSE.txt][license] for the full text of the license.


[hugo]: https://github.com/spf13/hugo
[lambda]: https://aws.amazon.com/lambda/
[kinesis]: https://aws.amazon.com/kinesis/
[r53]: https://aws.amazon.com/route53/
[kappa]: https://github.com/garnaat/kappa
[s3site]: http://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html
[license]: https://github.com/ryansb/hugo-lambda/blob/master/LICENSE.txt
[conduct]: https://github.com/ryansb/hugo-lambda/blob/master/CODE_OF_CONDUCT.md
[intro]: http://rsb.io/posts/overview-of-hugo-lambda/
[deploying]: http://rsb.io/posts/deploying-hugo-lambda/
