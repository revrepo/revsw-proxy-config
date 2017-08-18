"""*************************************************************************
*
* NUU:BIT CONFIDENTIAL
*
* [2013] - [2015] nuu:bit, Inc.
* All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of nuu:bit, Inc. and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to nuu:bit, Inc.
* and its suppliers and may be covered by U.S. and Foreign Patents,
* patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from nuu:bit, Inc.
*
"""

import json
import os
import re
import unittest
import itertools
from StringIO import StringIO
from copy import deepcopy

import jsonschema as jsch

from jinja2 import Environment, FileSystemLoader, PackageLoader
from ConfigParser import ConfigParser
import revsw_apache_config

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/templates")
TEST_JINJA_FILES = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "revsw-proxy-config/test_files/jinja_test_examples"
)
TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files/")


def dict_raise_on_duplicates(ordered_pairs):
    """
    Reject duplicate keys.
    """
    d = {}
    for k, v in ordered_pairs:
        if k in d:
            raise ValueError("Duplicate key: %r" % k)
        else:
            d[k] = v
    return d


class TestAbstractConfig(unittest.TestCase):
    testing_class = None
    loader = FileSystemLoader(TEMPLATES_DIR)

    def setUp(self):

        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)

        os.system("mkdir %s" % TEST_DIR)

        self.env = Environment(loader=self.loader, trim_blocks=True, lstrip_blocks=True)


    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)

    def validate_schema(self, data, schema_file_location, schema_file_name):
        schema = self.generate_schema(schema_file_name, schema_file_location)
        try:
            jsch.validate(data, json.loads(schema, object_pairs_hook=dict_raise_on_duplicates), format_checker=jsch.FormatChecker())
        except jsch.ValidationError as e:
            print e.message
            return False
        return True


    def generate_schema(self, schema_name, schema_dir):
        # Must clone the list because we might insert paths in it
        schema_file = "%s/%s.vars.schema" % (schema_dir, schema_name)
        schema_path = os.path.dirname(schema_file)

        # # Also search in the directory containing the current schema
        # if schema_path not in search_dirs:
        #     search_dirs.insert(0, schema_path)

        out = StringIO()

        # Find includes
        inc_re = re.compile(r"{%\s*include\s+\"([a-zA-Z0-9_./-]+)\"\s*%}")
        line_no = 1
        with open(schema_file) as f:
            for line in f:
                m = inc_re.search(line)
                if m:
                    try:
                        out.write(line[:m.start()])
                        out.write(self.generate_schema(m.group(1), schema_dir))
                        out.write(line[m.end():])
                    except OSError:
                        raise
                else:
                    out.write(line)
                line_no += 1

        ret = json.dumps(json.loads(out.getvalue()), indent=2)
        out.close()
        return ret


class TestVarnishJinja(TestAbstractConfig):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all/bp')
    schema_file_name = 'varnish'

    temlate_file = os.path.join(TEMPLATES_DIR, 'all/bp/varnish.jinja')

    test_site = {
        "VERSION":16,
        "SERVER_NAME": "test_server_1",
        "ENABLE_CACHE": True,
        "INCLUDE_USER_AGENT": True,
        "CACHE_PS_HTML": True,
        "CACHE_IGNORE_AUTH": True,
        "CONTENT_OPTIMIZERS_HTTP": ['test-optimizer-http-url.com', ],
        "CONTENT_OPTIMIZERS_HTTPS": ['test-optimizer-https-url.com', ],
        "DOMAINS_TO_PROXY_HTTP": ['test-domains-url.com', ],
        "CACHING_RULES_MODE": "first",
        "CACHING_RULES":  [
            {
                "version": 1,
                "target_domains": {
                    "include": True,
                    "include_or_exclude_domains": ['test-url.com', ],
                    "include_or_exclude_wildcard": "12313",
                },
                "url": {
                    "is_wildcard": True,
                    "value": "test"
                },
                "enable_esi": True,
                "origin_request_headers": [{
                    "operation": 'add',
                    "header_name": "test-header",
                    "header_value": 'fsdfdf',
                }],
                "end_user_response_headers": [
                    {
                        "operation": "add",
                        "header_name": "test",
                        "header_value": "test"
                    },
                ],
                "serve_stale": {
                    "enable": True,
                    "while_fetching_ttl": 1,
                    "origin_sick_ttl": 1,
                },
                "origin_redirects": {
                    "override": True,
                    "follow": True,
                },
                "edge_caching": {
                    "override_origin": True,
                    "override_no_cc": True,
                    "new_ttl": 1,
                    "query_string_keep_or_remove_list": ["test-keep-or-remove", ],
                    "query_string_list_is_keep": True
                },
                "browser_caching": {
                    "override_edge": True,
                    "new_ttl": 1,
                    "force_revalidate": True
                },
                "cookies": {
                    "override": True,
                    "ignore_all": True,
                    "keep_or_ignore_list": ["test-ignore", ],
                    "list_is_keep": True,
                    "remove_ignored_from_request": True,
                    "remove_ignored_from_response": True,
                },
                "cookies_cache_bypass": {
                    "enable": True,
                    "list": ['test', ],
                }
            }
        ],
        "DEBUG_MODE": True,
        "BYPASS_CO_LOCATIONS": ['test-bypass-url.com', ],
        "CUSTOM_VCL_ENABLED": True,
        "CUSTOM_VCL": {
            "backends": [
                {
                    "name": 'test_bakend',
                    "host": "test-backends-url.com",
                    "port": 80,
                    "dynamic": True,
                    "vcl": 'test',
                },
            ],
            "recv": 'test-recv',
            "hash": 'test-hash',
            "pipe": 'test-pipe',
            "purge": 'test-purge',
            "hit": 'test-hit',
            "miss": 'test-miss',
            "pass": 'test-pass',
            "deliver": 'test-deliver',
            "synth": 'test-synth',
            "backend_fetch": 'test-backend_fetch',
            "backend_response": 'test-backend_response',
            "backend_error": 'test-backend_error',
        },
        "ENABLE_GEOIP_HEADERS": True,
        "CLIENT_RESPONSE_TIMEOUT": 1,
        "ENABLE_ORIGIN_HEALTH_PROBE": True,

        "ORIGIN_HEALTH_PROBE": {
            "HTTP_REQUEST": 'test-request',
            "HTTP_STATUS": 1,
            "PROBE_INTERVAL": 1,
            "PROBE_TIMEOUT": 1
        },

    }
    initial_data = {
        "sites": [test_site, ]
    }

    def setUp(self):
        super(TestVarnishJinja, self).setUp()

        # add custom filters for template
        self.env.filters["flatten_to_set"] = revsw_apache_config.flatten_to_set
        self.env.filters["parse_url"] = revsw_apache_config.parse_url
        self.env.filters["dns_query"] = revsw_apache_config.dns_query
        self.env.filters["underscore_url"] = revsw_apache_config.underscore_url
        self.env.filters["is_ipv4"] = revsw_apache_config.is_ipv4
        self.env.filters["wildcard_to_regex"] = revsw_apache_config.wildcard_to_regex
        self.env.filters["extract_custom_webserver_code"] = revsw_apache_config.extract_custom_webserver_code
        self.env.filters["netmask_bits"] = revsw_apache_config.netmask_bits
        self.env.filters["custom_backend_name"] = revsw_apache_config.custom_backend_name
        self.env.filters["process_custom_vcl"] = revsw_apache_config.process_custom_vcl
        self.env.globals["global_var_get"] = revsw_apache_config.global_var_get
        self.env.globals["global_var_set"] = revsw_apache_config.global_var_set
        self.env.globals["GLOBAL_SITE_NAME"] = 'test'
        self.env.globals["HOSTNAME_FULL"] = 'test'
        self.env.globals["HOSTNAME_SHORT"] = 'test'
        self.env.globals["DNS_SERVERS"] = ['test', ]

        self.env.globals["bypass_location_root"] = False

    def test_varnish_schema(self):
        # smoke testing of varnish schema
        validation_result = self.validate_schema(self.initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_varnish_schema(self):
        # add unexepted parameter
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['wrong_param'] = 'test'
        validation_result = self.validate_schema(initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_varnish_schema_without_required(self):
        # test schema without required parameters
        self.initial_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(self.initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_varnish_jinja(self):
        # smoke testing of template
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**self.initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_normal_test.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_not_enabled_site(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_not_enabled_site_test.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_not_enabled_custom_vcl(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CUSTOM_VCL_ENABLED'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_not_enabled_custom_vcl.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_not_enabled_site_vcl(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CUSTOM_VCL_ENABLED'] = False
        initial_data['sites'][0]['CUSTOM_VCL']['backends'] = []
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_not_enabled_site_vcl_test.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_more_sites(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'] += [self.test_site,]
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_more_sites.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_cache_ignore_auth(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_IGNORE_AUTH'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_cache_ignore_auth.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)

    def test_varnish_jinja_debug_mode(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['DEBUG_MODE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_debug_mode.vcl'), 'rb') as f:
            test_data = f.read()
        self.assertEqual(result, test_data)


class TestSdkNginxConfJinja(TestAbstractConfig):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all/bp')
    schema_file_name = 'varnish'

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/sdk_nginx_conf.jinja')

    test_site = {}

    initial_data = {

        "configs": [
            {
                "sdk_domain_name": "test_domain_1",
            },
            {
                "sdk_domain_name": "test_domain_2",
            },
        ],
        "bpname": "test_bpname",
    }

    def test_nginx_conf_jinja(self):
        initial_data = deepcopy(self.initial_data)
        # initial_data['sites'][0]['CACHE_IGNORE_AUTH'] = False
        template = self.env.get_template('nginx/bp/sdk_nginx_conf.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'nginx_conf_.vcl'), 'w') as f:
            f.write(result)
        import nginx
        c = nginx.loadf(os.path.join(TEST_DIR, 'nginx_conf_.vcl'))
        a = c.children
        b = c.server.children
        print 1
        # with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_cache_ignore_auth.vcl'), 'rb') as f:
        #     test_data = f.read()
        # self.assertEqual(result, test_data)


class TestAbstractBpJinja(TestAbstractConfig):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    test_site = {}

    bp_initial_data = {
        "VERSION": 27,
        "ssl": {},
        "acl": {
            "enabled": True,
            "action": "allow_except",
            "acl_rules": [
                {
                    "host_name": "test-host-name",
                    "subnet_mask": "222.222.222.222",
                    "country_code": "US",
                    "header_name": "test-header-name",
                    "header_value": "test-header-value"
                },
            ],
        },
        "SERVER_NAME": "test-server-name",
        "SERVER_ALIASES": ["test-alias",],
        "SERVER_REGEX_ALIAS": '1',
        "ORIGIN_SERVER_NAME": "test-server-name",
        "ENABLE_VARNISH": True,
        "REV_PROFILES_COUNT": 3,
        "ENABLE_HTTP": True,
        "ENABLE_HTTPS": True,
        "ENABLE_SPDY": True,
        "ENABLE_HTTP2": True,
        "REV_PROFILES_BASE_PORT_HTTP": 50000,
        "REV_PROFILES_BASE_PORT_HTTPS": 50000,
        "CONTENT_OPTIMIZERS_HTTP": ["test-url.com"],
        "CONTENT_OPTIMIZERS_HTTPS": ["test-url.com"],
        "DOMAINS_TO_PROXY_HTTP": ["test-url.com"],
        "DOMAINS_TO_PROXY_HTTPS": ["test-url.com"],
        "DOMAINS_TO_OPTIMIZE_HTTP": ["test-url.com"],
        "DOMAINS_TO_OPTIMIZE_HTTPS": ["test-url.com"],
        "DOMAIN_SHARDS_COUNT": 1,
        "CUSTOM_WEBSERVER_CODE_BEFORE": "test",
        "CUSTOM_WEBSERVER_CODE_AFTER": "test",
        "CUSTOM_WEBSERVER_CO_CODE_AFTER": "test",
        "BLOCK_CRAWLERS": True,
        "ENABLE_JS_SUBSTITUTE": True,
        "ENABLE_HTML_SUBSTITUTE": True,
        "DEBUG_MODE": True,
        "BYPASS_VARNISH_LOCATIONS": ["test-url.com"],
        "BYPASS_CO_LOCATIONS": ["test-url.com"],
        "PROXY_TIMEOUT": 1,
        "ORIGIN_SERVERS_HTTP": ["test-url.com"],
        "ORIGIN_SERVERS_HTTPS": ["test-url.com"],
        "ORIGIN_SECURE_PROTOCOL": "test",
        "ORIGIN_IDLE_TIMEOUT": 12,
        "ORIGIN_REUSE_CONNS": True,
        "ENABLE_VARNISH_GEOIP_HEADERS": True,
        "ENABLE_PROXY_BUFFERING": True,
        "END_USER_RESPONSE_HEADERS": [
            {
                "operation": "test",
                "header_name": "test",
                "header_value": "test",
            },
        ],
        "ENABLE_RUM": True,
        "REV_RUM_BEACON_URL": "test-url.com",
        "ENABLE_OPTIMIZATION": True,
        "ENABLE_DECOMPRESSION": True,
        "ORIGIN_REQUEST_HEADERS": [
            {
                "operation": "test",
                "header_name": "test",
                "header_value": "test",
            },
        ],
        "ENABLE_QUIC": True,
        "ENABLE_SSL": True,
        "SSL_PROTOCOLS": "test-ssl-protocol",
        "SSL_CIPHERS": "test-chiper",
        "SSL_PREFER_SERVER_CIPHERS": True,
        "SSL_CERT_ID": 'test-ssl-id',
        "BP_LUA_LOCATIONS": [
            {
                "location":"test-location",
                "code": 'test-code'
            },
        ],
        "CO_LUA_LOCATIONS": [
            {
                "location":"test-location",
                "code": 'test-code'
            },
        ],
        "LUA_LOCATIONS": ["location", ],
        "ENABLE_WAF": True,
        "WAF_RULES": [
            {
                "location": 'test-location',
                "enable_waf": True,
                "enable_learning_mode": True,
                "enable_sql_injection_lib": True,
                "enable_xss_injection_lib": True,
                "waf_rules": ["testruletestruletestrule",],
                "waf_actions": ['test-waf-action',],
            },
        ],
        "SECURITY_MODE":'test-security-mode',
    }

    co_profiles_data = {
        "VERSION": 2,
        "REV_OPTIMIZATION_LEVEL": 'min',  # min|med|max|adaptive|custom|none
        "REV_CUSTOM_IMG_LEVEL": "low",  # low|medium|high|none"
        "REV_CUSTOM_JS_LEVEL": "low",  # low|medium|high|none
        "REV_CUSTOM_CSS_LEVEL": "low",  # low|medium|high|none
    }

    initial_data = {
       "bp": bp_initial_data,
       "co_profiles": co_profiles_data
    }

    def setUp(self):
        super(TestAbstractBpJinja, self).setUp()

        os.system("cp %s %s" % (
            os.path.join(TEMPLATES_DIR, "nginx/co/standard_profiles/default_customer_profiles.jinja"),
            os.path.join(TEST_DIR, "default_customer_profiles.jinja")
        ))
        os.system("cp %s %s" % (
            os.path.join(TEST_JINJA_FILES, "bp_test.jinja"),
            os.path.join(TEST_DIR, "bp_test.jinja")
        ))
        os.system("cp %s %s" % (
            self.template_file,
            os.path.join(TEST_DIR, "bp.jinja")
        ))
        # os.system("mkdir %s" % os.path.join(TEST_DIR, "common"))
        os.system("cp -r %s %s" % (os.path.join(TEMPLATES_DIR, "nginx/common"), TEST_DIR))
        # add custom filters for template
        self.env.filters["flatten_to_set"] = revsw_apache_config.flatten_to_set
        self.env.filters["parse_url"] = revsw_apache_config.parse_url
        self.env.filters["dns_query"] = revsw_apache_config.dns_query
        self.env.filters["underscore_url"] = revsw_apache_config.underscore_url
        self.env.filters["is_ipv4"] = revsw_apache_config.is_ipv4
        self.env.filters["wildcard_to_regex"] = revsw_apache_config.wildcard_to_regex
        self.env.filters["extract_custom_webserver_code"] = revsw_apache_config.extract_custom_webserver_code
        self.env.filters["netmask_bits"] = revsw_apache_config.netmask_bits
        self.env.filters["custom_backend_name"] = revsw_apache_config.custom_backend_name
        self.env.filters["process_custom_vcl"] = revsw_apache_config.process_custom_vcl
        self.env.globals["global_var_get"] = revsw_apache_config.global_var_get
        self.env.globals["global_var_set"] = revsw_apache_config.global_var_set
        self.env.globals["GLOBAL_SITE_NAME"] = 'test'
        self.env.globals["HOSTNAME_FULL"] = 'test'
        self.env.globals["HOSTNAME_SHORT"] = 'test'
        self.env.globals["DNS_SERVERS"] = ['test', ]

        self.env.globals["bypass_location_root"] = False


class TestBpJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_bp_schema(self):
        # smoke testing of bp schema
        validation_result = self.validate_schema(self.bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_varnish_schema(self):
        # add unexepted parameter
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_acl_action_schema(self):
        #change acl action
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['acl']['action'] = 'deny_except'
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_acl_action_schema(self):
        # add wrong acl action
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['acl']['action'] = 'wrong action'
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_wrong_version(self):
        # add wrong version
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['VERSION'] = -1
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['VERSION'] = 28
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_wrong_url_format(self):
        # add wrong url_format
        wrong_url = 'wrong url'
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['CONTENT_OPTIMIZERS_HTTPS'] = wrong_url
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['CONTENT_OPTIMIZERS_HTTP'] = wrong_url
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['DOMAINS_TO_PROXY_HTTPS'] = wrong_url
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['DOMAINS_TO_PROXY_HTTP'] = wrong_url
        validation_result = self.validate_schema(bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)


    def test_varnish_jinja_cache_ignore_auth(self):
        initial_data = deepcopy(self.initial_data)
        # initial_data['sites'][0]['CACHE_IGNORE_AUTH'] = False
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_JINJA_FILES, 'nginx_conf_.vcl'), 'w') as f:
            f.write(result)

        import nginx
        c = nginx.loadf(os.path.join(TEST_DIR, 'nginx_conf_.vcl'))
        print 1
        # with open(os.path.join(TEST_JINJA_FILES, 'varnish_jinja_cache_ignore_auth.vcl'), 'rb') as f:
        #     test_data = f.read()
        # self.assertEqual(result, test_data)


class TestDefaultProfilesJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all/co/standard_profiles')
    schema_file_name = 'default_customer_profiles'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_profile_schema(self):
        # smoke testing of bp schema
        validation_result = self.validate_schema(self.co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_profile_schema(self):
        # add unexepted parameter
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_optimisation_level_patterns_schema(self):
        #test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['min', 'med', 'max', 'adaptive', 'custom', 'none']:
            co_profiles_data['REV_OPTIMIZATION_LEVEL'] = pattern
            validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_optimisation_level_patterns_schema(self):
        #test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_OPTIMIZATION_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_img_level_patterns_schema(self):
        #test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = pattern
            validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_img_level_patterns_schema(self):
        #test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_js_level_patterns_schema(self):
        #test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_JS_LEVEL'] = pattern
            validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_js_level_patterns_schema(self):
        #test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_css_level_patterns_schema(self):
        #test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_CSS_LEVEL'] = pattern
            validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_css_level_patterns_schema(self):
        #test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_CSS_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)


if __name__ == '__main__':
    unittest.main()






