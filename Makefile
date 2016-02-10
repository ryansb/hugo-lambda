HUGO_VERSION := 0.15

all:
	@echo "Use 'make deploy' to download all dependencies, generate the CFN templates, and deploy the lambda functions"
	@echo "Use 'make template' to regenerate the CloudFormation template"
	@echo "Use 'make create' to deploy the CloudFormation stack"
	@echo "Use 'make update' to re-deploy the CloudFormation stack"
	@echo "Use 'make test' to prod the lambda functions"

template:
	@python ./minify.py < template.yml > hugo-lambda.cfn
	@sed -i -e 's/ $$//' hugo-lambda.cfn
	@echo "Generated CFN template"

node:
	cd generate/lib && npm install s3 async
	rm generate/generate.zip || true
	cd generate/lib && zip -r ../generate.zip *
	aws s3 cp --acl public-read generate/generate.zip s3://demos.serverlesscode.com/hugo-lambda-function-javascript.zip

hugo:
	curl -L -s https://github.com/spf13/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux_amd64.tar.gz | tar zxf -
	mv hugo_${HUGO_VERSION}_linux_amd64/hugo_${HUGO_VERSION}_linux_amd64 generate/lib/hugo
	rm -rf hugo_${HUGO_VERSION}_linux_amd64

deps: node hugo
	@echo "All deps are ready"

create: template
	aws cloudformation create-stack --stack-name HugoSiteStack --template-body file://hugo-lambda.cfn --capabilities CAPABILITY_IAM

update: template
	aws cloudformation update-stack --stack-name HugoSiteStack --template-body file://hugo-lambda.cfn --capabilities CAPABILITY_IAM

deploy: deps create
	@echo "Deployed functions. Happy hacking!"
