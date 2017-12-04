#!/usr/bin/env python
"""This module is purges objects that are set by the user in the revAPM portal. 
This script is usually executed by rev-pcm-purge Daemon Process. The purge 
JSON configuration is located in /opt/revsw-config/policy/ui-purge.json

TODO:
    1. Take the main functionality of the script and place it inside a function.
    2. Insert command line options like in ssl cert or WAF rules manager.
"""
import argparse
import fnmatch
import json
import os
import subprocess
import sys
import errno
import re
import jsonschema

sys.path.append(os.path.join(os.path.dirname(__file__), "common"))

from revsw_apache_config import wildcard_to_regex
from revsw.logger import RevSysLogger

from  revsw_apache_config.varnishadmin import VarnishAdmin
import script_configs

admin = VarnishAdmin()


def json_validator(jsonfile, schemafile):
    """Function used to validate a JSON purge file with the schema provided.

    Args:
        jsonfile (str): Location of json file.
        schemafile (str): Location of schema file that will be used to validate
            the json provided by jsonfile.

    Returns:
        str: Returns "Pass" if no errors. Returns error code if there is a problem.
    """
    json1 = open(jsonfile).read()
    schema1 = open(schemafile).read()
    jdata = json.loads(json1)
    #check version
        #validate json against schema
    try:
        jsonschema.validate(json.loads(json1),json.loads(schema1))
        urls1 = jdata["purges"]
        if jdata["version"] != script_configs._UI_PURGE_VERSION:
            return "Failure:_Version error"
        for url in urls1:
            expression = urls1[0]["url"]["expression"]
            domain = urls1[0]["url"]["domain"]
            wildcard = urls1[0]["url"]["is_wildcard"]
            if wildcard:
                expression = fnmatch.translate(expression)#converts shell wildcards to regex
                domain = fnmatch.translate(domain)#converts shell wildcards to regex
        return "Pass"
    except jsonschema.ValidationError as e:
        return "Failure:_%r" %e.message
    except jsonschema.SchemaError as e:
        return "Failure:_%r" %e

def fatal(msg):
    log.LOGE(msg)
    sys.exit(1)

status = json_validator("/opt/revsw-config/policy/ui-purge.json","/opt/revsw-config/varnish/ui-purge.vars.schema")#test file here
if status != "Pass":
    print "json validation failed [%s]" % status

with open('/opt/revsw-config/policy/ui-purge.json') as json_file:
    Json = json.load(json_file)

urls = Json["purges"]

for rule in urls:
    wildcard = rule["url"]["is_wildcard"]
    domain = rule["url"]["domain"]
    expression = rule["url"]["expression"]
    if wildcard:
        print "This rule is wildcard converted to regex"
        regex = wildcard_to_regex(expression)
    else:
        print "This rule received regex"
        regex = expression

    command = "obj.http.X-Rev-Host == %s && obj.http.X-Rev-Url ~ %s" % (domain, regex)
    admin.ban(command)
