import json
import sys

import jsmin
import yaml

t = yaml.load(sys.stdin.read())
t['Resources']['LambdaS3Linker']['Properties']['Code']['ZipFile'] = jsmin.jsmin(
    t['Resources']['LambdaS3Linker']['Properties']['Code']['ZipFile'])

json.dump(t, sys.stdout, indent=4)
