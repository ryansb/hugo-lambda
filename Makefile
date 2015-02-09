all: gotools
	python -c 'import sys, yaml, json; json.dump(yaml.load(sys.stdin), sys.stdout, indent=4)' < template.yml > functions/hugo-lambda.cfn

gotools:
	cd tarsync && godep go build
	cp tarsync/tarsync functions/compress/lib/tarsync
