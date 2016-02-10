import json
import sys

import yaml

t = yaml.load(sys.stdin.read())

json.dump(t, sys.stdout, indent=4)
