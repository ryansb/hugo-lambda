HUGO_LAMBDA_STACK ?= HugoLambdaSiteStack

all:
	@echo "Use 'make master.json' to generate the CloudFormation template without uploading"
	@echo "Use 'make create' to deploy the CloudFormation stack"
	@echo "Use 'make update' to re-deploy the CloudFormation stack"
	@echo "Use 'make delete' to delete the CloudFormation stack"

clean:
	rm -f ssl.json master.json

ssl.json: ssl.yml
	@python ./minify.py < ssl.yml > ssl.json
	@sed -i -e 's/ $$//' ssl.json
	@echo "Generated SSL CFN template"
	aws s3 cp --acl public-read ssl.json s3://demos.serverlesscode.com/acm-ssl-function.json

master.json: master.yml
	@python ./minify.py < master.yml > master.json
	@sed -i -e 's/ $$//' master.json
	@echo "Generated master CFN template"

create: master.json ssl.json
	aws cloudformation create-stack --stack-name $(HUGO_LAMBDA_STACK) \
		--template-body file://master.json \
		--capabilities CAPABILITY_IAM \
		--timeout-in-minutes 50 \
		--parameters '[{"ParameterKey": "DomainRoot", "ParameterValue": "ryansb.com"}, {"ParameterKey": "SiteDomain", "ParameterValue": "test.ryansb.com"}]'


update: master.json ssl.json
	aws cloudformation update-stack --stack-name $(HUGO_LAMBDA_STACK) \
		--template-body file://master.json \
		--capabilities CAPABILITY_IAM \
		--parameters '[{"ParameterKey": "DomainRoot", "ParameterValue": "ryansb.com"}, {"ParameterKey": "SiteDomain", "ParameterValue": "test.ryansb.com"}]'

delete: master.json
	aws cloudformation delete-stack --stack-name $(HUGO_LAMBDA_STACK)
