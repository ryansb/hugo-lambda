all:
	@python -c 'import sys, yaml, json; json.dump(yaml.load(sys.stdin), sys.stdout, indent=4)' < template.yml > functions/hugo-lambda.cfn
	@echo "Generated CFN template"

deps: node hugo
	@echo "All set"

node:
	cd functions/generate/lib && npm install s3 async

hugo:
	curl -L -s https://github.com/spf13/hugo/releases/download/v0.12/hugo_0.12_linux_amd64.tar.gz | tar zxf -
	mv hugo_0.12_linux_amd64/hugo_0.12_linux_amd64 functions/generate/lib/hugo
	rm -rf hugo_0.12_linux_amd64
