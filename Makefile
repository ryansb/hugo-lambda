all:
	@python -c 'import sys, yaml, json; json.dump(yaml.load(sys.stdin), sys.stdout, indent=4)' < template.yml > hugo-lambda.cfn
	@sed -i -e 's/ $$//' hugo-lambda.cfn
	@echo "Generated CFN template"

redeploy:
	cd generate && kappa config.yml deploy && kappa config.yml add_event_sources
	cd static-sync && kappa config.yml deploy && kappa config.yml add_event_sources

deps: node hugo
	@echo "All deps are ready"

node:
	cd generate/lib && npm install s3 async
	cd static-sync/lib && npm install s3 async

hugo:
	curl -L -s https://github.com/spf13/hugo/releases/download/v0.12/hugo_0.12_linux_amd64.tar.gz | tar zxf -
	mv hugo_0.12_linux_amd64/hugo_0.12_linux_amd64 generate/lib/hugo
	rm -rf hugo_0.12_linux_amd64
