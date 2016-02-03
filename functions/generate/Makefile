all:
	@echo "Use 'make upload' to send zipfile to S3 with deps"
	@echo "Use 'make clean' to delete the zipfile and stale deps"

clean:
	@rm -rf hugo-lambda.zip deps/*

hugo-lambda.zip: run_hugo.py sync.py
	#pip install -t deps boto3
	cp *.py deps/
	cd deps && zip --quiet --recurse-paths ../hugo-lambda.zip *

upload: hugo-lambda.zip
	aws s3 cp hugo-lambda.zip s3://demos.serverlesscode.com/hugo-lambda-function.zip
