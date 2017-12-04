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
import importlib
import json
import os
import unittest
import itertools

from StringIO import StringIO
from pyclbr import Class

import revsw_apache_config

from mock import Mock, patch
import script_configs
from revsw.logger import RevSysLogger

apache_gen_config_script = importlib.import_module("apache-gen-config-script")

revsw_sdk_nginx_gen_config = importlib.import_module("revsw-sdk-nginx-gen-config")
pc_apache_config = importlib.import_module("pc-apache-config")
revsw_waf_rule_manager = importlib.import_module("revsw-waf-rule-manager")
revsw_ssl_cert_manager = importlib.import_module("revsw-ssl-cert-manager")


# revsw_sdk_nginx_gen_config = __import__()
# pc_apache_config = __import__("pc-apache-config")
# from . import NginxConfigSDK

# from .pc_apache_config import ConfigCommon


# global log
pc_apache_config.log = RevSysLogger(True)


TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files/")
TEST_CONFIG_DIR = os.path.join(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/test_files/"
)

revsw_apache_config._g_webserver_name = 'fdsdfsdfsd'
revsw_apache_config._log = RevSysLogger()

def redirect_to_test_dir(*args, **kwargs):
    return TEST_DIR


class TestNginxConfigSDK(unittest.TestCase):

    testing_class = None

    def setUp(self):
        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)
        # create folder for tests
        os.system("mkdir %s && mkdir %s" % (TEST_DIR, os.path.join(TEST_DIR, "backup/")))

        self.nginx_config_sdk = revsw_sdk_nginx_gen_config.NginxConfigSDK(args={
            "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "backup_location": os.path.join(TEST_DIR, "backup/"),
            "verbose_debug":1
        })
        self.nginx_config_sdk.nginx_conf = {
            "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "conf_name": "revsw-apps.conf",
            "tmp_location": "/tmp/",
            "final_location": TEST_DIR,
            "backup_location": os.path.join(TEST_DIR, "backup/")}
        self.nginx_config_sdk._load_new_configuration = Mock(return_value=0)

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)

    def test_read_jinja_template(self):
        self.nginx_config_sdk._read_jinja_template()
        self.assertTrue(self.nginx_config_sdk.string_template)

    def test_read_sdk_config_files(self):
        result = self.nginx_config_sdk._read_sdk_config_files()
        self.assertEqual(result, 0)

    def test_read_sdk_config_files_no_file(self):
        self.nginx_config_sdk.nginx_conf["jinja_conf_vars"] = os.path.join(TEST_CONFIG_DIR, "nofile.jinja")
        result = self.nginx_config_sdk._read_sdk_config_files()
        self.assertEqual(result, 2)

    def test_read_sdk_config_files_wrong_format(self):
        self.nginx_config_sdk.nginx_conf["jinja_conf_vars"] = os.path.join(TEST_CONFIG_DIR, "wrong_json.jinja")
        result = self.nginx_config_sdk._read_sdk_config_files()
        self.assertEqual(result, 1)

    def test_restore_sdk_nginx_from_backup(self):
        os.system("cp %s %s" % (
            os.path.join(TEST_CONFIG_DIR, "revsw-apps.conf"), os.path.join(TEST_DIR, "backup/revsw-apps.conf")
        ))
        self.nginx_config_sdk.refresh_configuration()
        self.nginx_config_sdk._restore_sdk_nginx_from_backup()
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "revsw-apps.conf")))

    def test_remove_active_sdk_nginx_config(self):
        self.nginx_config_sdk.refresh_configuration()
        self.nginx_config_sdk._remove_active_sdk_nginx_config()
        self.assertFalse(os.path.exists(os.path.join(TEST_DIR, "revsw-apps.conf")))

    def test_refresh_configuration(self):
        self.nginx_config_sdk.refresh_configuration()


class TestConfigCommon(unittest.TestCase):

    def setUp(self):
        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)
        # create folder for tests
        os.system("mkdir %s" % TEST_DIR)
        script_configs.APACHE_PATH = TEST_CONFIG_DIR
        script_configs.APACHE_GENERIC_SITE = TEST_CONFIG_DIR
        self.webserver_config_vars = {
            "bp": {
                "ENABLE_OPTIMIZATION": True,
                "SERVER_NAME": "name",
            },
            "co": {
                "ENABLE_OPTIMIZATION": True,

            }
        }
        self.varnish_config_vars = {
            "co": True
        }
        self.ui_config = {
            "enable_ssl" : False,
            "ssl_protocols": 1,
            "ssl_ciphers":  1,
            "ssl_prefer_server_ciphers": 1,
            "ssl_cert_id": 1,
            "rev_component_co": {
                "enable_optimization": True,
                "mode": "least",
                "img_choice": 1,
                "js_choice": 1,
                "css_choice": 1,
            },
            "rev_component_bp": {
                "enable_cache": True,
                "include_user_agent": True,
                "cache_ps_html": True,
                "cache_ignore_auth": True,
                "cache_bypass_locations": True,
                "caching_rules_mode": True,
                "cdn_overlay_urls": ["http://url1.com", "http://url2.com"],
            },
        }

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)

    def test_patch_config(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        templates = config_common.patch_config()

    def test_must_ban_html(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        must_ban = config_common.must_ban_html()
        self.assertFalse(must_ban)

    def test_patch_content_vars(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        config_common._patch_content_vars()
        must_ban = config_common.must_ban_html()
        self.assertTrue(must_ban)

    def test_patch_cache_vars(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        config_common._patch_cache_vars()
        must_ban = config_common.must_ban_html()
        self.assertFalse(must_ban)

    def test_patch_security_vars(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        config_common._patch_security_vars()
        must_ban = config_common.must_ban_html()
        self.assertFalse(must_ban)

    def test_patch_misc_vars(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        config_common._patch_misc_vars()
        must_ban = config_common.must_ban_html()
        self.assertTrue(must_ban)

    def test__patch_ssl_vars(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        config_common._patch_ssl_vars()
        must_ban = config_common.must_ban_html()
        self.assertTrue(must_ban)

    def test_config_changed(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        can_config = config_common.config_changed()
        self.assertFalse(can_config)

    def test_varnish_changed(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        can_config = config_common.varnish_changed()
        self.assertFalse(can_config)

    def test_gen_initial_domain_config(self):
        config_common = pc_apache_config._gen_initial_domain_config(
            "test_domain", self.ui_config,
        )
        # can_config = pc_apache_config.varnish_changed()
        self.assertTrue(config_common)

    def test_get_domain_mapping(self):
        config_common = pc_apache_config._get_domain_mapping("test_domain",)
        self.assertEqual(config_common, {})


class objdict:

  def __init__(self,indict):

    self.stuff = indict

  def __getattr__(self,which):

    return self.stuff.get(which,None)
args_dict = {
    "no-bp": True,
    "no-flush": True,
    "flush": False,
    "no-send": True,
    "copy-to": "test",
    "ui-config": True
}
apache_gen_config_script.args = objdict(args_dict)

class TestApacheGenConfigScript(unittest.TestCase):
    testing_class = None
    domain = {
            "name": 'test_domain',
            "bp_template": None,
            "ows_domain": "test",
            "ows_http": True,
            "ows_https":False,
            "ows": "test",
            "use_varnish": True,
            "http": True,
            "https": False,
            "bp_cos": "test",
            "static_servers_http": ["test1", "test2"],
            "static_servers_https": ["test1", "test2"],
            "profiles_count": 1,
            "base_http_port": 80,
            "base_https_port": 80,
            "shards_count": 1,
            "enable_js_subst": True,
            "enable_html_subst": True,
            "enable_opt": True,
            "enable_decompression": True,
            "caching_rules": "123",
            "certs": False,
            "bps": ["test1", "test2"],
            "configured_cos": ["test1", "test2"],
            "profiles_disabled": True,
            "caching_rules_file": False,
            "ignore_cookies": [],

        }

    def setUp(self):
        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)
        # create folder for tests
        os.system("mkdir %s" % TEST_DIR)

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)

    # def test_generate_config_sh(self):
        # apache_gen_config_script.generate_config_sh()
        # conf_manager = revsw_sdk_nginx_gen_config.NginxConfigSDK(args={
        #     "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
        #     "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
        #     "verbose_debug":1
        #     })
        # templates = conf_manager.refresh_configuration()
        # self.assertTrue(templates)

    def test_generate_bp(self):
        apache_gen_config_script.generate_bp(self.domain)
        self.assertTrue(os.path.exists("bp-apache-test_domain.json"))
        self.assertTrue(os.path.exists("bp-varnish-test_domain.json"))
        self.assertEqual(
            json.loads(open("bp-apache-test_domain.json").read()),
            json.loads(open(os.path.join(TEST_CONFIG_DIR, "bp-apache-test_domain.json")).read()),
        )
        self.assertEqual(
            json.loads(open("bp-varnish-test_domain.json").read()),
            json.loads(open(os.path.join(TEST_CONFIG_DIR, "bp-varnish-test_domain.json")).read()),
        )
        os.system("rm bp-varnish-test_domain.json")
        os.system("rm bp-apache-test_domain.json")

    def test_fixup_domain(self):
        apache_gen_config_script.fixup_domain(self.domain)
        self.assertTrue(os.path.exists("bp-test_domain.jinja"))
        self.assertTrue(os.path.exists("bp-test_domain.vars.schema"))
        os.system("rm  bp-test_domain.jinja")
        os.system("rm bp-test_domain.vars.schema")


    def test_generate_ui_configs(self):
        apache_gen_config_script._domains = [self.domain]
        apache_gen_config_script.generate_ui_configs()
        self.assertTrue(os.path.exists("ui-config-test_domain.json"))
        os.system("rm ui-config-test_domain.json")

    def test_generate_bp_varnish_domain_json(self):
        test_json = {
          "CONTENT_OPTIMIZERS_HTTP": [
            "e",
            "s",
            "t",
            "t"
          ],
          "CACHING_RULES_MODE": "best",
          "CONTENT_OPTIMIZERS_HTTPS": [],
          "DOMAINS_TO_PROXY_HTTP": [
            "test1",
            "test2"
          ],
          "SERVER_NAME": "test_domain",
          "BYPASS_CO_LOCATIONS": [],
          "CLIENT_RESPONSE_TIMEOUT": 600,
          "CACHE_PS_HTML": False,
          "INCLUDE_USER_AGENT": False,
          "ENABLE_GEOIP_HEADERS": False,
          "DEBUG_MODE": False,
          "CUSTOM_VCL": {
            "hash": "",
            "deliver": "",
            "backend_error": "",
            "pass": "",
            "hit": "",
            "backend_fetch": "",
            "purge": "",
            "recv": "",
            "miss": "",
            "pipe": "",
            "backends": [],
            "synth": "",
            "backend_response": ""
          },
          "ENABLE_CACHE": True,
          "VERSION": 17,
          "ENABLE_ORIGIN_HEALTH_PROBE": False,
          "CUSTOM_VCL_ENABLED": False,
          "CACHE_IGNORE_AUTH": False,
          "CACHING_RULES": [],
          "ORIGIN_HEALTH_PROBE": {
            "HTTP_REQUEST": "",
            "PROBE_TIMEOUT": 0,
            "PROBE_INTERVAL": 0,
            "HTTP_STATUS": 0
          }
        }
        result_string = apache_gen_config_script.generate_bp_varnish_domain_json(self.domain)
        self.assertEqual(json.loads(result_string), test_json)

    def test_generate_bp_domain_json(self):
        test_json = {
            u'co_profiles': {
                u'REV_OPTIMIZATION_LEVEL': u'custom',
                u'REV_CUSTOM_IMG_LEVEL': u'medium',
                u'VERSION': 2,
                u'REV_CUSTOM_CSS_LEVEL': u'medium',
                u'REV_CUSTOM_JS_LEVEL': u'medium'
            },
            u'bp': {
                u'REV_PROFILES_BASE_PORT_HTTP': 80,
                u'ENABLE_VARNISH_GEOIP_HEADERS': False,
                u'ENABLE_HTML_SUBSTITUTE': True,
                u'DOMAINS_TO_OPTIMIZE_HTTPS': [u'test1', u'test2'],
                u'BYPASS_CO_LOCATIONS': [],
                u'BP_LUA_LOCATIONS': [],
                u'PROXY_TIMEOUT': 5,
                u'ENABLE_HTTPS': False,
                u'ORIGIN_REUSE_CONNS': True,
                u'CONTENT_OPTIMIZERS_HTTPS': [],
                u'BLOCK_CRAWLERS': True,
                u'ENABLE_OPTIMIZATION': True,
                u'ENABLE_SPDY': True,
                u'ORIGIN_SECURE_PROTOCOL': u'use_end_user_protocol',
                u'SERVER_NAME': u'test_domain',
                u'ORIGIN_SERVERS_HTTPS': [],
                u'CO_LUA_LOCATIONS': [],
                u'SSL_PROTOCOLS': u'TLSv1 TLSv1.1 TLSv1.2',
                u'SERVER_REGEX_ALIAS': u'',
                u'REV_RUM_BEACON_URL': u'http://rum-02-prod-sjc.revsw.net/service',
                u'REV_PROFILES_COUNT': 1,
                u'CUSTOM_WEBSERVER_CO_CODE_AFTER': u'',
                u'REV_PROFILES_BASE_PORT_HTTPS': 443,
                u'DOMAINS_TO_PROXY_HTTP': [u'test1', u'test2'],
                u'ENABLE_QUIC': False,
                u'END_USER_RESPONSE_HEADERS': [],
                u'BYPASS_VARNISH_LOCATIONS': [],
                u'ENABLE_WAF': False, u'ssl': {},
                u'CONTENT_OPTIMIZERS_HTTP': [u'http://e', u'http://s', u'http://t', u'http://t'],
                u'VERSION': 28,
                u'ORIGIN_SERVER_NAME': u'test',
                u'SSL_CERT_ID': u'default',
                u'ENABLE_JS_SUBSTITUTE': True,
                u'SERVER_ALIASES': [],
                u'ENABLE_VARNISH': True,
                u'DOMAINS_TO_OPTIMIZE_HTTP': [u'test1', u'test2'],
                u'ENABLE_DECOMPRESSION': True,
                u'ENABLE_RUM': False,
                u'ORIGIN_IDLE_TIMEOUT': 80,
                u'ENABLE_PROXY_BUFFERING': False,
                u'DOMAIN_SHARDS_COUNT': 1,
                u'CUSTOM_WEBSERVER_CODE_BEFORE': u'',
                u'SSL_CIPHERS': u'ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS',
                u'ORIGIN_SERVERS_HTTP': [u'http://test'],
                u'WAF_RULES': [],
                u'CUSTOM_WEBSERVER_CODE_AFTER': u'',
                u'ENABLE_HTTP2': True,
                u'acl': {u'action': u'allow_except', u'enabled': False, u'acl_rules': []},
                u'ENABLE_SSL': True,
                u'DEBUG_MODE': False,
                u'ORIGIN_REQUEST_HEADERS': [],
                u'SSL_PREFER_SERVER_CIPHERS': True,
                u'ENABLE_HTTP': True,
                u'DOMAINS_TO_PROXY_HTTPS': [u'test1', u'test2'],
                u"ENABLE_BOT_PROTECTION": False,
                u"BOT_PROTECTION": []

            }
        }
        result_string = apache_gen_config_script.generate_bp_domain_json(self.domain)
        a = json.loads(result_string)
        self.assertEqual(json.loads(result_string), test_json)

    def test_generate_ui_config_json(self):
        test_json = {
            'bp_list': ['test1', 'test2'],
            'rev_custom_json': {},
            '3rd_party_rewrite': {
                'enable_3rd_party_runtime_rewrite': True,
                'enable_3rd_party_rewrite': True,
                '3rd_party_root_rewrite_domains': '',
                'enable_3rd_party_root_rewrite': False,
                '3rd_party_runtime_domains': '',
                '3rd_party_urls': ''
            },
            'config_command_options': 'http-only shards-count=1 enable-js-substitute enable-html-substitute ',
            'operation': 'config',
            'origin_secure_protocol': 'use_end_user_protocol',
            'co_cnames': ['test1', 'test2'],
            'rev_component_bp': {
                'enable_bot_protection': False,
                'bot_protection': [],
                'bp_apache_fe_custom_config': '',
                'bp_apache_custom_config': '',
                'cache_opt_choice': 'Extend CDN',
                'rev_custom_json': {},
                'js_choice': 'medium',
                'co_apache_custom_config': '',
                'waf': [],
                'rum_beacon_url': 'http://rum-02-prod-sjc.revsw.net/service',
                'enable_security': False,
                'lua': [],
                'block_crawlers': True,
                'cache_bypass_locations': [],
                'mode': 'custom',
                'cdn_overlay_urls': ['http://test1', 'http://test2', 'https://test1', 'https://test2'],
                'css_choice': 'medium',
                'certificate_urls': [],
                'end_user_response_headers': [],
                'enable_cache': True,
                'enable_optimization': True,
                'acl': {'action': 'allow_except', 'enabled': False, 'acl_rules': []},
                'enable_waf': False,
                'img_choice': 'medium',
                'caching_rules': [],
                'ssl_certificates': 'rev_certs',
                'enable_decompression': True,
                'enable_rum': True
            },
            'origin_server': 'test',
            'domain_name': 'test_domain',
            'co_list': ['test1', 'test2'],
            'version': '1.0.6',
            'origin_domain': 'test',
            'rev_component_co': {
                'css_choice': 'medium',
                'rev_custom_json': {},
                'js_choice': 'medium',
                'co_apache_custom_config': '',
                'enable_optimization': True,
                'rum_beacon_url': 'http://rum-02-prod-sjc.revsw.net/service',
                'lua': [],
                'img_choice': 'medium',
                'mode': 'custom',
                'enable_decompression': True,
                'enable_rum': True
            },
            'rev_traffic_mgr': {
                'tier': 'SILVER',
                'overage': 30,
                'transfer_size': '160 TB',
                'page_views': '40M',
                'apdex_threshold_ms': 2000
            }
        }
        result_string = apache_gen_config_script.generate_ui_config_json(self.domain)
        self.assertEqual(result_string, test_json)

    def test_generate_co_ui_config_json(self):
        test_json = {
            'css_choice': 'medium',
            'rev_custom_json': {},
            'js_choice': 'medium',
            'co_apache_custom_config': '',
            'enable_optimization': True,
            'rum_beacon_url': 'http://rum-02-prod-sjc.revsw.net/service',
            'lua': [],
            'img_choice': 'medium',
            'mode': 'custom',
            'enable_decompression': True,
            'enable_rum': True
        }
        result_string = apache_gen_config_script.generate_co_ui_config_json(self.domain)
        self.assertEqual(result_string, test_json)

    def test_generate_bp_ui_config_json(self):
        test_json = {
            'bp_apache_fe_custom_config': '',
            'bp_apache_custom_config': '',
            'cache_opt_choice': 'Extend CDN',
            'rev_custom_json': {},
            'js_choice': 'medium',
            'co_apache_custom_config': '',
            'waf': [],
            'rum_beacon_url': 'http://rum-02-prod-sjc.revsw.net/service',
            'enable_security': False,
            'lua': [],
            'block_crawlers': True,
            'cache_bypass_locations': [],
            'mode': 'custom',
            'cdn_overlay_urls': ['http://test1', 'http://test2', 'https://test1', 'https://test2'],
            'css_choice': 'medium',
            'certificate_urls': [],
            'end_user_response_headers': [],
            'enable_cache': True,
            'enable_optimization': True,
            'acl': {'action': 'allow_except', 'enabled': False, 'acl_rules': []},
            'enable_waf': False,
            'img_choice': 'medium',
            'caching_rules': [],
            'ssl_certificates': 'rev_certs',
            'enable_decompression': True,
            'enable_rum': True,
            'enable_bot_protection': False,
            'bot_protection': []
        }
        result_string = apache_gen_config_script.generate_bp_ui_config_json(self.domain)
        for key in result_string.keys():
            if result_string[key] != test_json[key]:
                print key
        self.assertEqual(result_string, test_json)


    def test_parse_profile_template_get_count(self):
        result_count = apache_gen_config_script.parse_profile_template_get_count(
            os.path.join(TEST_CONFIG_DIR, "default_customer_profiles.vars.schema")
        )
        self.assertEqual(result_count, 1)


class TestConfigWAF(unittest.TestCase):

    testing_class = None

    def setUp(self):
        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)
        script_configs.TMP_PATH = os.path.join(TEST_DIR, "tmp-waf-rules/")
        script_configs.WAF_RULES = os.path.join(TEST_DIR, "waf-rules/")

        # create folder for tests and copy waf rule file
        os.system("mkdir %s && mkdir %s && mkdir %s" % (TEST_DIR, script_configs.WAF_RULES, script_configs.TMP_PATH))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "test.rule"), script_configs.WAF_RULES))
        # create test backup file
        os.system("tar cf %srevsw-waf-rule.tar %s" % (script_configs.TMP_PATH, script_configs.WAF_RULES))

        self.configwaf = revsw_waf_rule_manager.ConfigWAF(args={
            "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "backup_location": os.path.join(TEST_DIR, "backup/"),
            "verbose_debug": "test",
            "config_vars": os.path.join(TEST_CONFIG_DIR, "waf_conf.jinja"),
        })

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)
        # os.system("rm -r %s" % os.path.join(TEST_DIR, "waf-rules/"))

    def test_read_config_files(self):
        status = self.configwaf._read_config_files()
        self.assertEqual(status, 0)

    def test_read_config_files_wrong_json(self):
        self.configwaf.conf["config_vars"] = os.path.join(TEST_CONFIG_DIR, "wrong_waf_conf.jinja")
        status = self.configwaf._read_config_files()
        self.assertEqual(status, 1)

    def test_read_config_files_no_file(self):
        self.configwaf.conf["config_vars"] =  os.path.join(TEST_CONFIG_DIR, "no_waf_conf.jinja")
        status = self.configwaf._read_config_files()
        self.assertEqual(status, 2)

    def test_backup_rules(self):
        self.configwaf._backup_rules()
        self.assertTrue(os.path.exists(os.path.join(script_configs.TMP_PATH, "revsw-waf-rule.tar")))

    def test_create_rules(self):
        self.configwaf._create_rules()
        self.assertTrue(os.path.exists(os.path.join(script_configs.WAF_RULES, "1.rule")))


class TestConfigSSL(unittest.TestCase):

    testing_class = None

    def setUp(self):
        # print name of running test
        print("RUN_TEST %s" % self._testMethodName)
        script_configs.TMP_PATH = os.path.join(TEST_DIR, "tmp-waf-rules/")
        script_configs.CERTS_FOLDER = os.path.join(TEST_DIR, "crt_folder/")

        # create folder for tests and copy cert file
        os.system("mkdir %s && mkdir %s && mkdir %s" % (TEST_DIR, script_configs.CERTS_FOLDER, script_configs.TMP_PATH))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "test.cert"), script_configs.CERTS_FOLDER))
        # create test backup file
        os.system("tar cf %srevsw-ssl-cert.tar %s" % (script_configs.TMP_PATH, script_configs.CERTS_FOLDER))

        self.configssl = revsw_ssl_cert_manager.ConfigSSL(args={
            "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "backup_location": os.path.join(TEST_DIR, "backup/"),
            "verbose_debug": "test",
            "config_vars": os.path.join(TEST_CONFIG_DIR, "ssl_conf.jinja"),
        })

    def tearDown(self):
        os.system("rm -r %s" % TEST_DIR)

    def test_read_config_files(self):
        status = self.configssl._read_config_files()
        self.assertEqual(status, 0)

    def test_read_config_files_wrong_json(self):
        self.configssl.conf["config_vars"] = os.path.join(TEST_CONFIG_DIR, "wrong_ssl_conf.jinja")
        status = self.configssl._read_config_files()
        self.assertEqual(status, 1)

    def test_read_config_files_no_file(self):
        self.configssl.conf["config_vars"] =  os.path.join(TEST_CONFIG_DIR, "no_ssl_conf.jinja")
        status = self.configssl._read_config_files()
        self.assertEqual(status, 2)

    def test_backup_certs(self):
        # test creating backup file
        self.configssl._backup_certs()
        self.assertTrue(os.path.exists(os.path.join(script_configs.TMP_PATH, "revsw-ssl-cert.tar")))

    def test_create_certs(self):
        self.configssl._create_certs()
        self.assertTrue(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/pass.txt")))
        self.assertTrue(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/info.txt")))
        self.assertTrue(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/private.key")))
        self.assertTrue(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/public.crt")))

    def test_remove_certs(self):
        # create certs and after that test to remove them
        self.configssl._create_certs()
        self.configssl._remove_certs()
        self.assertFalse(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/pass.txt")))
        self.assertFalse(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/info.txt")))
        self.assertFalse(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/private.key")))
        self.assertFalse(os.path.exists(os.path.join(script_configs.CERTS_FOLDER, "1/public.crt")))

    def test_remove_certs_no_file(self):
        result = self.configssl._remove_certs()
        self.assertFalse(result)

    def test_create_symlink(self):
        self.configssl._create_symlink()
        self.assertTrue(os.path.islink(os.path.join(script_configs.CERTS_FOLDER, "default")))


if __name__ == '__main__':
    unittest.main()