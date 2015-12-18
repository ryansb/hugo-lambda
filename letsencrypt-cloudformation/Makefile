all:
	@echo "Use 'make function.zip' to generate the function zipfile"
	@echo "Use 'make upload' to upload the contents to S3"

upload: function.zip
	aws s3 cp --acl public-read function.zip s3://demos.serverlesscode.com/letsencrypt-function.zip

function.zip: lambda_function.py
	cp lambda_function.py dependencies/lambda_function.py
	# this is a bad hack - the zope module is namespaced and doesn't include __init__.py
	# which makes it impossible to import without a "real" installation.
	# To make it work in lambda, we just add a __init__.py
	touch dependencies/zope/__init__.py
	cd dependencies && zip -r -p ../function.zip *
