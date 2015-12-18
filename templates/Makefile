all:
	@echo "Use 'make template' to regenerate the CloudFormation template"
	@echo "Use 'make create' to deploy the CloudFormation stack"
	@echo "Use 'make update' to re-deploy the CloudFormation stack"

ssl.json: ssl.yml
	@python ./minify.py < ssl.yml > ssl.json
	@sed -i -e 's/ $$//' master.json
	@echo "Generated SSL CFN template"
	aws s3 cp --acl public-read ssl.json s3://demos.serverlesscode.com/letsencrypt-ssl-reg-template.json

master.json: master.yml
	@python ./minify.py < master.yml > master.json
	@sed -i -e 's/ $$//' master.json
	@echo "Generated master CFN template"

create: master.json
	aws cloudformation create-stack --stack-name StaticSiteStack --template-body file://master.json \
		--capabilities CAPABILITY_IAM \
		--parameters "ParameterKey=SSLEmailAddress,ParameterValue=lambda@ryansb.com"

update: master.json
	aws cloudformation update-stack --stack-name StaticSiteStack --template-body file://master.json \
		--capabilities CAPABILITY_IAM \
		--parameters "ParameterKey=SSLEmailAddress,ParameterValue=lambda@ryansb.com"

delete: master.json
	aws cloudformation delete-stack --stack-name StaticSiteStack
