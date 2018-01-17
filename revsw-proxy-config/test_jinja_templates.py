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
import nginx
from StringIO import StringIO
from copy import deepcopy

import jsonschema as jsch

from jinja2 import Environment, FileSystemLoader
from utilites_test import VCLParser
import revsw_apache_config

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "revsw-proxy-config/templates")
TEST_JINJA_FILES = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "revsw-proxy-config/test_files/jinja_test_examples"
)
TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(
    __file__))), "revsw-proxy-config/templates/temporary_testing_files/")


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

        self.env = Environment(
            loader=self.loader,
            trim_blocks=True,
            lstrip_blocks=True,
            extensions=["jinja2.ext.do"])

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)

    def validate_schema(self, data, schema_file_location, schema_file_name):
        schema = self.generate_schema(schema_file_name, schema_file_location)
        try:
            jsch.validate(data, json.loads(
                schema, object_pairs_hook=dict_raise_on_duplicates), format_checker=jsch.FormatChecker())
        except jsch.ValidationError as e:
            print e.message
            return False
        return True

    def generate_schema(self, schema_name, schema_dir):
        # Must clone the list because we might insert paths in it
        schema_file = "%s/%s.vars.schema" % (schema_dir, schema_name)

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
        "VERSION": 16,
        "SERVER_NAME": "test_server_1",
        "ENABLE_CACHE": True,
        "INCLUDE_USER_AGENT": True,
        "CACHE_PS_HTML": True,
        "CACHE_IGNORE_AUTH": True,
        "CONTENT_OPTIMIZERS_HTTP": ['http://test-optimizer-http-url.com', ],
        "CONTENT_OPTIMIZERS_HTTPS": ['https://test-optimizer-https-url.com', ],
        "DOMAINS_TO_PROXY_HTTP": ['test-domains-url.com', ],
        "CACHING_RULES_MODE": "first",
        "CACHING_RULES": [
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

    def test_varnish_jinja_test(self):
        # smoke testing of template
        test_site2 = deepcopy(self.test_site)
        test_site2["SERVER_NAME"] = "test_server_2"

        test_site2["CUSTOM_VCL"]["backends"] = [{
            "name": 'test_bakend13123',
                    "host": "test-backends-url.com13123",
                    "port": 80,
                    "dynamic": 1,
                    "vcl": "REV_BACKEND(test_bakend13123)"
                    # "vcl": {'234':1231,
                    #         "1312321":312321},
        }]
        parse = VCLParser(os.path.join(
            TEMPLATES_DIR, 'varnish_jinja_normal_test.vcl'))
        parsed = parse.parse_object()
        self.assertTrue(parsed['acl'].get('purgehttps_test_server_1'))

    def test_varnish_schema(self):
        # smoke testing of varnish schema
        validation_result = self.validate_schema(
            self.initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_varnish_schema(self):
        # add unexepted parameter
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['wrong_param'] = 'test'
        validation_result = self.validate_schema(
            initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_varnish_schema_without_required(self):
        # test schema without required parameters
        self.initial_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(
            self.initial_data, self.schema_file_location, self.schema_file_name)
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
        initial_data['sites'] += [self.test_site, ]
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

    def test_varnish_jinja_enabled_sites_count(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = True
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertTrue(parsed['acl'].get('purgehttp_test_server_1'))

    def test_varnish_jinja_enabled_sites_counts_0(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertFalse(parsed['data'].get('purgehttp_test_server_1'))

    def test_varnish_jinja_vcl_init(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertTrue(parsed['sub'].get('vcl_init'))

    def test_varnish_jinja_purgehttps(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertFalse(parsed['acl'].get('purgehttps_test_server_1'))

    def test_varnish_jinja_purgehttp_enabled_cache(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = True
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertTrue(parsed['acl'].get('purgehttp_test_server_1'))

    def test_varnish_jinja_purgehttp_disabled_cache(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        self.assertFalse(parsed['acl'].get('purgehttp_test_server_1'))

    def test_varnish_jinja_purgehttp_optimizers(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_CACHE'] = True
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        acl = parsed['acl'].get('purgehttp_test_server_1')
        self.assertTrue(acl)
        self.assertTrue('"http://test-optimizer-http-url.com";' in acl)

    def test_varnish_jinja_var_idx(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_IGNORE_AUTH'] = True
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        acl = parsed['sub'].get('start_cookies_backend_response')
        self.assertTrue(acl)
        self.assertTrue('revvar.unset(false, 0);' in acl['data'])

    def test_varnish_jinja_var_idx_site_backend_health_probe(self):
        test_bakend_data = [
            '.host = "127.0.0.1";',
            '.port = "9443";',
            '.probe = {',
            '.request =',
            '"test-request"',
            '"Connection: close"',
            '"Host: test_server_1";',
            '.expected_response = 1;',
            '.interval = 1s;',
            '.timeout = 1s;',
            '.window = 4; # If 2 out of the last 4 polls succeeded the backend is considered healthy, '
            'otherwise it will be marked as sick',
            '.threshold = 2;'
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_ORIGIN_HEALTH_PROBE'] = True
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        backend = parsed['backends'].get('behttps_test___server___1')
        self.assertTrue(backend)
        self.assertEqual(test_bakend_data, backend)

    def test_varnish_jinja_var_idx_site_backend_health_probe_false(self):
        test_bakend_data = [
            '.host = "127.0.0.1";',
            '.port = "9443";',
            '.probe = {',
            '.request =',
            '"test-request"',
            '"Connection: close"',
            '"Host: test_server_1";',
            '.expected_response = 1;',
            '.interval = 1s;',
            '.timeout = 1s;',
            '.window = 4; # If 2 out of the last 4 polls succeeded the backend is considered healthy, '
            'otherwise it will be marked as sick',
            '.threshold = 2;'
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['ENABLE_ORIGIN_HEALTH_PROBE'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        backend = parsed['backends'].get('behttps_test___server___1')
        self.assertTrue(backend)
        self.assertNotEqual(test_bakend_data, backend)

    def test_varnish_jinja_cache_ps_html_false(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_backend_response')
        self.assertTrue(sub)

    def test_varnish_jinja_vcl_synth(self):
        test_sub_data = [{'statements': {}, 'if_data': {
            'if (req.http.host == "test_server_1") {': 'test-synth'}}]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_synth')
        self.assertTrue(sub)
        self.assertEqual(test_sub_data, sub['if_data'])

    def test_varnish_jinja_site_cookies_querystr_and_per_domain_rules_hash_recv(
            self):
        test_sub_data = [
            {
                'statements': {},
                'if_data': {'if (req.http.host == "test_server_1") {': 'test-recv'}},
            {
                'statements': {},
                'if_data': {
                    'if (req.http.host == "test_server_1") '
                    '{': 'chromelogger.log("recv " + req.xid + ": " + req.method + " " + req.url);'
                }
            }
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_recv')
        self.assertTrue(sub)
        self.assertEqual(test_sub_data, sub['if_data'])

    def test_varnish_jinja_vcl_recv(self):
        required_data = [
            'revvar.init_var_count(19);', 'revvar.set_duration(true, 17, 10s);', ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_recv')
        self.assertTrue(sub)
        for i in required_data:
            self.assertIn(i, sub['data'])

    def test_varnish_jinja_vcl_miss(self):
        required_data = [
            {
                'statements': {},
                'if_data': {'if (req.http.host == "test_server_1") {': 'test-miss'}},
            {
                'statements': {},
                'if_data': {'if (req.http.host == "test_server_1") {': 'chromelogger.log("miss " + req.xid);'}
            }
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_miss')
        self.assertTrue(sub)
        self.assertEqual(required_data, sub['if_data'])

    def test_varnish_jinja_vcl_purge(self):
        required_data = [{'statements': {}, 'if_data': {
            'if (req.http.host == "test_server_1") {': 'test-purge'}}]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_purge')
        self.assertTrue(sub)
        self.assertEqual(required_data, sub['if_data'])

    def test_varnish_jinja_vcl_backend_fetch(self):
        required_data = [
            {'statements': {}, 'if_data': {
                'if (bereq.http.host == "test_server_1") {': 'test-backend_fetch'}}
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_backend_fetch')
        self.assertTrue(sub)
        self.assertEqual(required_data, sub['if_data'])

    def test_varnish_jinja_vcl_backend_error(self):
        required_data = [
            {'statements': {}, 'if_data': {
                'if (bereq.http.host == "test_server_1") {': 'test-backend_error'}}
        ]
        initial_data = deepcopy(self.initial_data)
        initial_data['sites'][0]['CACHE_PS_HTML'] = False
        template = self.env.get_template('all/bp/varnish.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'varnish_jinja.vcl'), 'w') as f:
            f.write(result)
        parse = VCLParser(os.path.join(TEST_DIR, 'varnish_jinja.vcl'))
        parsed = parse.parse_object()
        sub = parsed['sub'].get('vcl_backend_error')
        self.assertTrue(sub)
        self.assertEqual(required_data, sub['if_data'])


class TestSdkNginxConfJinja(TestAbstractConfig):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all/bp')
    schema_file_name = 'varnish'

    template_file = os.path.join(
        TEMPLATES_DIR, 'nginx/bp/sdk_nginx_conf.jinja')

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
        find_servers = False
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'nginx_conf_.vcl'))
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '443 ssl http2':
                for line in server.as_dict['server']:
                    if line.get('server_name') == 'test_domain_1':
                        find_servers = True
        self.assertTrue(find_servers)


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
                    "host_name": "test-acl-host-name",
                    "subnet_mask": "222.222.222.222",
                    "country_code": "US",
                    "header_name": "test-acl-header-name",
                    "header_value": "test-acl-header-value"
                },
            ],
        },
        "SERVER_NAME": "test-server-name",
        "SERVER_ALIASES": ["test-alias", ],
        "SERVER_REGEX_ALIAS": '1',
        "ORIGIN_SERVER_NAME": "test-server-name",
        "ENABLE_VARNISH": True,
        "REV_PROFILES_COUNT": 3,
        "ENABLE_HTTP": True,
        "ENABLE_HTTPS": False,
        "ENABLE_SPDY": True,
        "ENABLE_HTTP2": True,
        "REV_PROFILES_BASE_PORT_HTTP": 50000,
        "REV_PROFILES_BASE_PORT_HTTPS": 50000,
        "CONTENT_OPTIMIZERS_HTTP": ["test-url.com"],
        "CONTENT_OPTIMIZERS_HTTPS": ["test-url.com"],
        "DOMAINS_TO_PROXY_HTTP": ["http://proxy-test-url.com"],
        "DOMAINS_TO_PROXY_HTTPS": ["https://proxy-test-url.com"],
        "DOMAINS_TO_OPTIMIZE_HTTP": ["test-url.com"],
        "DOMAINS_TO_OPTIMIZE_HTTPS": ["test-url.com"],
        "DOMAIN_SHARDS_COUNT": 1,
        "CUSTOM_WEBSERVER_CODE_BEFORE": "test",
        "CUSTOM_WEBSERVER_CODE_AFTER": "test",
        "CUSTOM_WEBSERVER_CO_CODE_AFTER": "test",
        "BLOCK_CRAWLERS": True,
        "ENABLE_JS_SUBSTITUTE": False,
        "ENABLE_HTML_SUBSTITUTE": True,
        "DEBUG_MODE": True,
        "BYPASS_VARNISH_LOCATIONS": ["test-url.com"],
        "BYPASS_CO_LOCATIONS": ["test-url.com"],
        "PROXY_TIMEOUT": 1,
        "ORIGIN_SERVERS_HTTP": ["https://127.0.0.1:8000/path", ],
        "ORIGIN_SERVERS_HTTPS": ["https://127.0.0.1:8000/path", ],
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
        "SSL_PREFER_SERVER_CIPHERS": False,
        "SSL_CERT_ID": 'test-ssl-id',
        "BP_LUA_LOCATIONS": [
            {
                "location": "test-location",
                "code": 'test-code'
            },
        ],
        "CO_LUA_LOCATIONS": [
            {
                "location": "test-location",
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
                "waf_rules": ["testruletestruletestrule", ],
                "waf_actions": ['test-waf-action', ],
            },
        ],
        "SECURITY_MODE": 'test-security-mode',
        "ENABLE_BOT_PROTECTION": False,
        "BOT_PROTECTION": [
            {
                "location": 'test_location',
                "mode": 'active_protection',
                "call_type": 2,
                "username_cookie_name": "test_cookie_name",
                "sessionid_cookie_name": "test_sessionid_cookie_name",
                "bot_protection_id": "test_bot_protection_id"
            }
        ],
        "ENABLE_WALLARM": False,
        "WALLARM_CONFIG": [
            {
                "location": "/wallarm_location",
                "wallarm_mode": "aggressive",
                "wallarm_instance": 2,
                "wallarm_mode_allow_override": "on",
                "wallarm_parse_response": "on",
                "wallarm_parser_disable": ["gzip", "json", "base64"],
                "wallarm_process_time_limit": 26,
                "wallarm_process_time_limit_block": "attack",
                "wallarm_unpack_response": "off"
            }
        ]
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
            os.path.join(
                TEMPLATES_DIR, "nginx/co/standard_profiles/default_customer_profiles.jinja"),
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
        os.system("cp -r %s %s" %
                  (os.path.join(TEMPLATES_DIR, "nginx/common"), TEST_DIR))
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
        validation_result = self.validate_schema(
            self.bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_varnish_schema(self):
        # add unexepted parameter
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_acl_action_schema(self):
        # change acl action
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['acl']['action'] = 'deny_except'
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_acl_action_schema(self):
        # add wrong acl action
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['acl']['action'] = 'wrong action'
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_wrong_version(self):
        # add wrong version
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['VERSION'] = -1
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['VERSION'] = 400
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_wrong_url_format(self):
        # add wrong url_format
        wrong_url = 'wrong url'
        bp_initial_data = deepcopy(self.bp_initial_data)
        bp_initial_data['CONTENT_OPTIMIZERS_HTTPS'] = wrong_url
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['CONTENT_OPTIMIZERS_HTTP'] = wrong_url
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['DOMAINS_TO_PROXY_HTTPS'] = wrong_url
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)
        bp_initial_data['DOMAINS_TO_PROXY_HTTP'] = wrong_url
        validation_result = self.validate_schema(
            bp_initial_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_bp_jinja_acl_enabled(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['acl']['enabled'] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)

    def test_bp_jinja_macro_setup_enabled_http(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTP'] = True
        initial_data['bp']['ENABLE_QUIC'] = True
        initial_data['bp']['ENABLE_VARNISH'] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        right_header_exist = False
        more_header_exist = False
        varnish_server = False
        # try to find required lines in conf file
        for line in nginx_conf.server.as_dict['server']:
            if line.get(
                    'add_header') == 'Alt-Svc \'quic=":443"; p="1"; ma=120\'':
                right_header_exist = True
            if line.get(
                    'more_set_headers') == "Alternate-Protocol:443:quic,p=1":
                more_header_exist = True

        # try to find varnish server conf
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '127.0.0.1:9080':
                varnish_server = True

        self.assertTrue(more_header_exist)
        self.assertTrue(right_header_exist)
        self.assertTrue(varnish_server)

    def test_bp_jinja_macro_setup_enabled_http_disabled_quic(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTP'] = True
        initial_data['bp']['ENABLE_QUIC'] = False
        initial_data['bp']['ENABLE_VARNISH'] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        right_header_exist = False
        # try to find required lines in conf file
        for line in nginx_conf.server.as_dict['server']:
            if line.get(
                    'add_header') == 'Alt-Svc \'quic=":443"; p="1"; ma=120\'':
                right_header_exist = True
        self.assertFalse(right_header_exist)

    def test_bp_jinja_macro_setup_enabled_http_disabled_varhish(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTP'] = True
        initial_data['bp']['ENABLE_QUIC'] = True
        initial_data['bp']['ENABLE_VARNISH'] = False
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))

        more_header_exist = False
        varnish_server = False
        # try to find required lines in conf file
        for line in nginx_conf.server.as_dict['server']:
            if line.get('set') == "$clientip$remote_addr":
                more_header_exist = True

        # try to find varnish server conf
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '127.0.0.1:9080':
                varnish_server = True
        self.assertFalse(more_header_exist)
        self.assertFalse(varnish_server)

    def test_bp_jinja_macro_setup_enabled_https(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTPS'] = True
        initial_data['bp']['ENABLE_HTTP'] = False
        initial_data['bp']['ENABLE_QUIC'] = True
        initial_data['bp']['ENABLE_VARNISH'] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        right_header_exist = False
        more_header_exist = False
        varnish_server = False

        # try to find varnish server conf
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '443 ssl http2':
                # try to find required lines in conf file
                for line in server.as_dict['server']:
                    if line.get(
                            'add_header') == 'Alt-Svc \'quic=":443"; p="1"; ma=120\'':
                        right_header_exist = True
                    if line.get(
                            'more_set_headers') == "Alternate-Protocol:443:quic,p=1":
                        more_header_exist = True
                varnish_server = True

        self.assertTrue(more_header_exist)
        self.assertTrue(right_header_exist)
        self.assertTrue(varnish_server)

    def test_bp_jinja_macro_setup_enabled_https_disabled_quic(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTPS'] = True
        initial_data['bp']['ENABLE_HTTP'] = False
        initial_data['bp']['ENABLE_QUIC'] = False
        initial_data['bp']['ENABLE_VARNISH'] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        right_header_exist = False
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '443 ssl http2':
                for line in server.as_dict['server']:
                    if line.get(
                            'add_header') == 'Alt-Svc \'quic=":443"; p="1"; ma=120\'':
                        right_header_exist = True
        self.assertFalse(right_header_exist)

    def test_bp_jinja_macro_setup_enabled_https_disabled_varhish(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']['ENABLE_HTTPS'] = True
        initial_data['bp']['ENABLE_HTTP'] = False
        initial_data['bp']['ENABLE_QUIC'] = True
        initial_data['bp']['ENABLE_VARNISH'] = False
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))

        varnish_server = False
        # try to find varnish server conf
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '443 ssl http2':
                varnish_server = True
        self.assertTrue(varnish_server)


class TestDefaultProfilesJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(
        TEMPLATES_DIR, 'all/co/standard_profiles')
    schema_file_name = 'default_customer_profiles'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_profile_schema(self):
        # smoke testing of bp schema
        validation_result = self.validate_schema(
            self.co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertTrue(validation_result)

    def test_wrong_profile_schema(self):
        # add unexepted parameter
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['wrong_param'] = 'test'
        validation_result = self.validate_schema(
            co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_optimisation_level_patterns_schema(self):
        # test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['min', 'med', 'max', 'adaptive', 'custom', 'none']:
            co_profiles_data['REV_OPTIMIZATION_LEVEL'] = pattern
            validation_result = self.validate_schema(
                co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_optimisation_level_patterns_schema(self):
        # test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_OPTIMIZATION_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(
            co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_img_level_patterns_schema(self):
        # test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = pattern
            validation_result = self.validate_schema(
                co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_img_level_patterns_schema(self):
        # test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(
            co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_js_level_patterns_schema(self):
        # test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_JS_LEVEL'] = pattern
            validation_result = self.validate_schema(
                co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_js_level_patterns_schema(self):
        # test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_IMG_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(
            co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_rev_custom_css_level_patterns_schema(self):
        # test all patterns
        co_profiles_data = deepcopy(self.co_profiles_data)
        for pattern in ['low', 'medium', 'high', 'none']:
            co_profiles_data['REV_CUSTOM_CSS_LEVEL'] = pattern
            validation_result = self.validate_schema(
                co_profiles_data, self.schema_file_location, self.schema_file_name)
            self.assertTrue(validation_result)

    def test_wrong_rev_custom_css_level_patterns_schema(self):
        # test wrong pattern
        co_profiles_data = deepcopy(self.co_profiles_data)
        co_profiles_data['REV_CUSTOM_CSS_LEVEL'] = 'wrong'
        validation_result = self.validate_schema(
            co_profiles_data, self.schema_file_location, self.schema_file_name)
        self.assertFalse(validation_result)

    def test_profile_jinja_macro_custom_js_optimizations_low_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_OPTIMIZATION_LEVEL"] = 'low'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get('#') == 'Begin custom JS optimizations - low':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters extend_cache_scripts':
                        find_optimistion_lines = True

        self.assertTrue(find_optimistion_lines)

    def test_profile_jinja_macro_custom_img_optimizations_medium_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_IMG_LEVEL"] = 'medium'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get(
                            '#') == 'Begin custom IMG optimizations - medium':
                        find_optimistion_lines = True

                    if line.get('pagespeed') == 'EnableFilters sprite_images':
                        find_optimistion_lines = True

        self.assertTrue(find_optimistion_lines)

    def test_profile_jinja_macro_custom_img_optimizations_high_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_IMG_LEVEL"] = 'high'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get(
                            '#') == 'Begin custom IMG optimizations - high':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters convert_png_to_jpeg':
                        find_optimistion_lines = True

        self.assertFalse(find_optimistion_lines)

    def test_profile_jinja_macro_custom_js_optimizations_medium_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_JS_LEVEL"] = 'medium'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get(
                            '#') == 'Begin custom JS optimizations - medium':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters extend_cache_scripts':
                        find_optimistion_lines = True

        self.assertTrue(find_optimistion_lines)

    def test_profile_jinja_macro_custom_js_optimizations_high_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_JS_LEVEL"] = 'high'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get('#') == 'Begin custom JS optimizations - high':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters defer_javascript':
                        find_optimistion_lines = True

        self.assertFalse(find_optimistion_lines)

    def test_profile_jinja_macro_custom_css_optimizations_medium_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_CSS_LEVEL"] = 'medium'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get(
                            '#') == 'Begin custom CSS optimizations - medium':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters extend_cache_css':
                        find_optimistion_lines = True

        self.assertTrue(find_optimistion_lines)

    def test_profile_jinja_macro_custom_css_optimizations_high_level(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['co_profiles']["REV_CUSTOM_CSS_LEVEL"] = 'high'
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_optimistion_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '50002':
                for line in server.as_dict['server']:
                    if line.get(
                            '#') == 'Begin custom CSS optimizations - high':
                        find_optimistion_lines = True

                    if line.get(
                            'pagespeed') == 'EnableFilters prioritize_critical_css':
                        find_optimistion_lines = True

        self.assertFalse(find_optimistion_lines)


class TestSSLJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_ssl_jinja_macro__do_setup_no_proxy_no_ssl_cert_id(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["SSL_CERT_ID"] = ''
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_ssl_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '127.0.0.1:9080':
                for line in server.as_dict['server']:
                    if line.get(
                            'proxy_ssl_protocols') == 'TLSv1 TLSv1.1 TLSv1.2':
                        find_ssl_lines = True
        self.assertTrue(find_ssl_lines)

    def test_ssl_jinja_macro__do_setup_no_proxy(self):
        initial_data = deepcopy(self.initial_data)
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_ssl_lines = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            if server.as_dict['server'][0]['listen'] == '127.0.0.1:9080':
                for line in server.as_dict['server']:
                    if line.get(
                            'proxy_ssl_protocols') == 'TLSv1 TLSv1.1 TLSv1.2':
                        find_ssl_lines = True
        self.assertTrue(find_ssl_lines)


class TestWAFJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_waf_jinja_locations(self):
        initial_data = deepcopy(self.initial_data)
        test_locations = ['test-location', 'test-location2']
        rules = [
            {
                "location": 'test-location',
                "enable_waf": True,
                "enable_learning_mode": True,
                "enable_sql_injection_lib": True,
                "enable_xss_injection_lib": True,
                "waf_rules": ["testruletestruletestrul2", ],
                "waf_actions": ['test-waf-action', ],
            },
            {
                "location": 'test-location2',
                "enable_waf": True,
                "enable_learning_mode": True,
                "enable_sql_injection_lib": True,
                "enable_xss_injection_lib": True,
                "waf_rules": ["testruletestruletestrule", ],
                "waf_actions": ['test-waf-action', ],
            },
        ]
        initial_data['bp']["WAF_RULES"] = rules
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_waf_locations = set()
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                if location.value in test_locations:
                    find_waf_locations.add(location.value)
        self.assertTrue(len(find_waf_locations) == 2)

    def test_waf_jinja_rules(self):
        initial_data = deepcopy(self.initial_data)
        test_locations = ['test-waf-location']
        rules = [
            {
                "location": 'test-waf-location',
                "enable_waf": True,
                "enable_learning_mode": False,
                "enable_sql_injection_lib": False,
                "enable_xss_injection_lib": False,
                "waf_rules": ["testrule1", "testrule2"],
                "waf_actions": ['test-waf-action', ],
            },
        ]
        initial_data['bp']["WAF_RULES"] = rules
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_waf_rules = set()
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                if location.value in test_locations:
                    for row in location.as_list[2]:
                        if row[0] == 'include':
                            find_waf_rules.add(row[1])
        self.assertTrue(len(find_waf_rules) == 2)

    def test_waf_jinja_actions(self):
        initial_data = deepcopy(self.initial_data)
        test_locations = ['test-waf-location']
        rules = [
            {
                "location": 'test-waf-location',
                "enable_waf": True,
                "enable_learning_mode": False,
                "enable_sql_injection_lib": False,
                "enable_xss_injection_lib": False,
                "waf_rules": ["testrule1", "testrule2"],
                "waf_actions": [
                    {'action': 'test-waf-action1', 'condition': 'test'},
                    {'action': 'test-waf-action2', 'condition': 'test'}
                ],
            },
        ]
        initial_data['bp']["WAF_RULES"] = rules
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_waf_actions = set()
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                if location.value in test_locations:
                    for row in location.as_list[2]:
                        if row[0] == 'CheckRule':
                            find_waf_actions.add(row[1])
        self.assertTrue(len(find_waf_actions) == 2)

    def test_waf_jinja_learning_mode(self):
        initial_data = deepcopy(self.initial_data)
        test_locations = ['test-waf-location']
        rules = [
            {
                "location": 'test-waf-location',
                "enable_waf": True,
                "enable_learning_mode": True,
                "enable_sql_injection_lib": True,
                "enable_xss_injection_lib": True,
                "waf_rules": ["testrule1", "testrule2"],
                "waf_actions": [
                    {'action': 'test-waf-action1', 'condition': 'test'},
                    {'action': 'test-waf-action2', 'condition': 'test'}
                ],
            },
        ]
        initial_data['bp']["WAF_RULES"] = rules
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_waf_actions = set()
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                if location.value in test_locations:
                    for row in location.as_list[2]:
                        if row[0] == 'CheckRule':
                            find_waf_actions.add(row[1])
        self.assertTrue(len(find_waf_actions) == 2)


class TestThirdPartyJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_third_party_jinja_js_substitute(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_JS_SUBSTITUTE"] = True
        initial_data['bp']["DOMAIN_SHARDS_COUNT"] = 10
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_header = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                for line in location.as_list[2]:
                    # and line['subs_filter'] == test_str:
                    if line[0] == 'subs_filter':
                        find_header = True
        self.assertTrue(find_header)

    def test_third_party_jinja_js_substitute_fale(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_JS_SUBSTITUTE"] = False
        initial_data['bp']["DOMAIN_SHARDS_COUNT"] = 10
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        test_str = "<head([^>]*)> \"<head$1><script>var revJSSubst={nshards:1,domains:{'test-url.com':1}," \
                   "keep_https:0};</script><script src='/rev-js/rev-js-substitute.min.js'></script>\" r"
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_header = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for line in server.as_dict['server']:
                if line.get('subs_filter') and line['subs_filter'] == test_str:
                    find_header = True
        self.assertFalse(find_header)

    def test_third_party_jinja_js_substitute_t(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_JS_SUBSTITUTE"] = True
        initial_data['bp']["DOMAINS_TO_PROXY_HTTPS"] = [
            "https://proxy-test-url.com", "https://proxy-test2-url.com"]
        initial_data['bp']["DOMAIN_SHARDS_COUNT"] = 10
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        test_str = '([\\"\'])(https:)?//https://proxy-test2-url.com $1' \
                   '/rev-third-party-https/https://proxy-test2-url.com r'
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_header = False
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for location in server.locations:
                for line in location.as_list[2]:
                    if line[0] == 'subs_filter' and line[1] == test_str:
                        find_header = True
        self.assertTrue(find_header)


class TestBalancerJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_balancer_jinja_bypass_co_ows(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["BYPASS_CO_LOCATIONS"] = ['coloc1', 'coloc2']
        test_str = "co_ows_test__server__name_http"
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_line = False
        # try to find required lines in conf file
        for conf in nginx_conf.as_dict['conf']:
            if conf.get('upstream %s' % test_str):
                find_line = True
        self.assertTrue(find_line)

    def test_balancer_jinja_bypass_no_bypass_locations(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["BYPASS_CO_LOCATIONS"] = []
        test_str = "bp_ows_test__server__name_http"
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_line = False
        # try to find required lines in conf file
        for conf in nginx_conf.as_dict['conf']:
            if conf.get('upstream %s' % test_str):
                find_line = True
        self.assertFalse(find_line)

    def test_balancer_jinja_bypass_bypass_locations_exist(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["BYPASS_CO_LOCATIONS"] = ['coloc1', 'coloc2']
        test_str = "bp_ows_test__server__name_http"
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_line = False
        # try to find required lines in conf file
        for conf in nginx_conf.as_dict['conf']:
            if conf.get('upstream %s' % test_str):
                find_line = True
        self.assertTrue(find_line)

    def test_balancer_jinja_bypass_bypass_locations(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["BYPASS_CO_LOCATIONS"] = ['coloc1', 'coloc2']
        initial_data['bp']["ORIGIN_SERVERS_HTTP"] = [
            "https://127.0.0.1:8001/path", "https://127.0.0.1:8002/path", ]
        test_str = "bp_ows_test__server__name_http"
        test_data = [
            {'dynamic_resolve': 'fallback=stale fail_timeout=30s'},
            {'keepalive': '32'},
            {'server': '127.0.0.1:8001 max_fails=0 fail_timeout=0'},
            {'server': '127.0.0.1:8002 max_fails=0 fail_timeout=0'}
        ]
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_list = []
        # try to find required lines in conf file
        for conf in nginx_conf.as_dict['conf']:
            if conf.get('upstream %s' % test_str):
                find_list = conf['upstream %s' % test_str]
        self.assertEqual(find_list, test_data)


class TestLoopDetectJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_balancer_jinja_bypass_co_ows(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_VARNISH"] = True
        initial_data['bp']["ENABLE_HTTP"] = True
        test_answ = [
            {'return': '508 "A CO redirection loop was detected on \'test\'. Please review the server configuration."'}
        ]
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_answer = []
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for line in server.as_dict['server']:
                if line.get("if ($http_x_rev_co_nodes ~ test)"):
                    find_answer = line["if ($http_x_rev_co_nodes ~ test)"]
        self.assertEqual(test_answ, find_answer)

    def test_balancer_jinja_bypass_bp_ows(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_VARNISH"] = True
        initial_data['bp']["ENABLE_HTTP"] = True
        test_answ = [
            {'return': '508 "A BP redirection loop was detected on \'test\'. Please review the server configuration."'}
        ]
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_answer = []
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for line in server.as_dict['server']:
                if line.get("if ($http_x_rev_bp_nodes ~ test)"):
                    find_answer = line["if ($http_x_rev_bp_nodes ~ test)"]
        self.assertEqual(test_answ, find_answer)

    def test_balancer_jinja_bypass_co_ows_debug(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_VARNISH"] = True
        initial_data['bp']["ENABLE_HTTP"] = True
        initial_data['bp']["DEBUG_MODE"] = True
        required_lines = [
            "if ($http_x_rev_co_nodes ~ test)", 'proxy_set_header']
        test_answ = {
            "if ($http_x_rev_co_nodes ~ test)": [
                {'return': '508 "A CO redirection loop was detected on \'test\'. '
                           'Please review the server configuration."'}
            ],
            'proxy_set_header': 'Connection ""'
        }
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_answer = {}
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for line in server.as_dict['server']:
                if required_lines and line.get(required_lines[0]):
                    find_answer[required_lines[0]] = line[required_lines[0]]
                    required_lines.pop(0)

        self.assertEqual(test_answ, find_answer)

    def test_balancer_jinja_bypass_bp_ows_debug(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_VARNISH"] = True
        initial_data['bp']["ENABLE_HTTP"] = True
        required_lines = [
            "if ($http_x_rev_bp_nodes ~ test)", 'proxy_set_header']
        test_answ = {
            "if ($http_x_rev_bp_nodes ~ test)": [
                {
                    'return': '508 "A BP redirection loop was detected on \'test\'. '
                              'Please review the server configuration."'}
            ],
            'proxy_set_header': 'X-Rev-ContinentCode $geoip_city_continent_code'
        }
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        find_answer = {}
        # try to find required lines in conf file
        for server in nginx_conf.servers:
            for line in server.as_dict['server']:
                if required_lines and line.get(required_lines[0]):
                    find_answer[required_lines[0]] = line[required_lines[0]]
                    required_lines.pop(0)

        self.assertEqual(test_answ, find_answer)


class TestBotProtJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_bot_prot_jinja_macros_get_rules(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get(
                            'access_by_lua') and line['access_by_lua'] == '\'require("nginx_ss").validateRequest()\'':
                        find_line = True
        self.assertTrue(find_line)

    def test_bot_prot_jinja_macros_get_rules_not_called(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = False
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get(
                            'access_by_lua') and line['access_by_lua'] == '\'require("nginx_ss").validateRequest()\'':
                        find_line = True
        self.assertFalse(find_line)

    def test_bot_prot_jinja_macros_get_rules_mode_disabled(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        initial_data['bp']["BOT_PROTECTION"][0]["mode"] = "disable"

        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get(
                            'access_by_lua') and line['access_by_lua'] == '\'require("nginx_ss").validateRequest()\'':
                        find_line = True
        self.assertFalse(find_line)

    def test_bot_prot_jinja_macros_get_rules_mode_monitor(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        initial_data['bp']["BOT_PROTECTION"][0]["mode"] = "monitor"

        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get(
                            'set') and line['set'] == '$shieldsquare_mode \'monitor\'':
                        find_line = True
        self.assertTrue(find_line)

    def test_bot_prot_jinja_macros_get_rules_mode_active_protection(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        initial_data['bp']["BOT_PROTECTION"][0]["mode"] = "active_protection"

        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get(
                            'set') and line['set'] == '$shieldsquare_mode \'active\'':
                        find_line = True
        self.assertTrue(find_line)

    def test_bot_prot_jinja_macros_get_rules_protection_id(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get('set') and \
                            line['set'] == '$shieldsquare_sid \'%s\'' \
                            % initial_data['bp']["BOT_PROTECTION"][0]["bot_protection_id"]:
                        find_line = True
        self.assertTrue(find_line)

    def test_bot_prot_jinja_macros_get_rules_sessionid_cookie_name(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_BOT_PROTECTION"] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == 'test_location':
                for line in location.as_dict['location test_location']:
                    if line.get('set') and \
                            line['set'] == '$shieldsquare_sessionid \'%s\'' \
                            % initial_data['bp']["BOT_PROTECTION"][0]["sessionid_cookie_name"]:
                        find_line = True
        self.assertTrue(find_line)


class TestWallarmJinja(TestAbstractBpJinja):
    schema_file_location = os.path.join(TEMPLATES_DIR, 'all')
    schema_file_name = 'bp/bp'
    loader = FileSystemLoader(TEST_DIR)

    template_file = os.path.join(TEMPLATES_DIR, 'nginx/bp/bp.jinja')

    def test_wallarm_jinja_macros_get_rules_mode_enabled(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_WALLARM"] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        find_line = False
        for location in find_server.locations:
            if location.value == '/wallarm_location':
                find_line = True
        self.assertTrue(find_line)

    def test_wallarm_jinja_macros_get_rules_mode_disabled(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_WALLARM"] = False
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        for location in find_server.locations:
            self.assertNotEqual(location.value, '/wallarm_location')

    def test_wallarm_jinja_macros_get_rules_enabled_but_mode_off(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_WALLARM"] = True
        initial_data['bp']["WALLARM_CONFIG"][0]["wallarm_mode"] = "off"
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        for location in find_server.locations:
            self.assertNotEqual(location.value, '/wallarm_location')

    def test_wallarm_jinja_macros_check_lines(self):
        initial_data = deepcopy(self.initial_data)
        initial_data['bp']["ENABLE_WALLARM"] = True
        template = self.env.get_template('bp_test.jinja')
        result = template.render(**initial_data)
        with open(os.path.join(TEST_DIR, 'bp.vcl'), 'w') as f:
            f.write(result)
        nginx_conf = nginx.loadf(os.path.join(TEST_DIR, 'bp.vcl'))
        # try to find required lines in conf file
        find_server = None
        for server in nginx_conf.servers:
            if find_server:
                break
            for line in server.as_dict['server']:
                if line.get("listen") and line["listen"]:
                    find_server = server
                    break
        wallarm_lines = [
            "location /wallarm_location {\n",
            "    wallarm_mode aggressive;\n",
            "    wallarm_instance 2;\n",
            "    wallarm_mode_allow_override on;\n",
            "    wallarm_parse_response on;\n",
            "    wallarm_parser_disable gzip;\n",
            "    wallarm_parser_disable json;\n",
            "    wallarm_parser_disable base64;\n",
            "    wallarm_process_time_limit 26;\n",
            "    wallarm_process_time_limit_block attack;\n",
            "    wallarm_unpack_response off;\n"
        ]
        for location in find_server.locations:
            if location.value == '/wallarm_location':
                for line in location.as_strings:
                    if line in wallarm_lines:
                        wallarm_lines.remove(line)
        self.assertEqual(wallarm_lines, [])


if __name__ == '__main__':
    unittest.main()
