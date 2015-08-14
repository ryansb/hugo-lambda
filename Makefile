HUGO_VERSION := 0.14

all:
	@echo "Use 'make deploy' to download all dependencies, generate the CFN templates, and deploy the lambda functions"
	@echo "Use 'make template' to regenerate the CloudFormation template"
	@echo "Use 'make create' to deploy kappa functions the first time"
	@echo "Use 'make update' to re-deploy kappa functions"
	@echo "Use 'make test' to prod the lambda functions"

template:
	@python -c 'import sys, yaml, json; json.dump(yaml.load(sys.stdin), sys.stdout, indent=4)' < template.yml > hugo-lambda.cfn
	@sed -i -e 's/ $$//' hugo-lambda.cfn
	@echo "Generated CFN template"

node:
	cd generate/lib && npm install s3 async

hugo:
	curl -L -s https://github.com/spf13/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux_amd64.tar.gz | tar zxf -
	mv hugo_${HUGO_VERSION}_linux_amd64/hugo_${HUGO_VERSION}_linux_amd64 generate/lib/hugo
	rm -rf hugo_${HUGO_VERSION}_linux_amd64

deps: node hugo
	@echo "All deps are ready"

GETEXEC := sed -i -e s/EXECROLE/$$(aws cloudformation describe-stack-resources --stack-name HugoSiteStack --logical-resource-id ExecRole --query 'StackResources[0].PhysicalResourceId')/ generate/config.yml

create: template
	aws cloudformation create-stack --stack-name HugoSiteStack --template-body file://hugo-lambda.cfn --capabilities CAPABILITY_IAM
	sleep 120 # wait for the stack to be created, we need the IAM role to exist for the next steps
	exec ${GETEXEC}
	cd generate && kappa config.yml create && kappa config.yml add_event_sources

update: template
	aws cloudformation update-stack --stack-name HugoSiteStack --template-body file://hugo-lambda.cfn --capabilities CAPABILITY_IAM || true
	cd generate && kappa config.yml update_code && kappa config.yml add_event_sources

test:
	cd generate && kappa config.yml test

deploy: deps create
	@echo "Deployed functions. Happy hacking!"
