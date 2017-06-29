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


# revsw_sdk_nginx_gen_config = __import__()
# pc_apache_config = __import__("pc-apache-config")
# from . import NginxConfigSDK

# from .pc_apache_config import ConfigCommon


# global log
pc_apache_config.log = RevSysLogger(True)


TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files")
TEST_CONFIG_DIR = os.path.join(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/test_files"
)

revsw_apache_config._g_webserver_name = 'fdsdfsdfsd'
revsw_apache_config._log = RevSysLogger()

def redirect_to_test_dir(*args, **kwargs):
    return TEST_DIR


class TestNginxConfigSDK(unittest.TestCase):

    testing_class = None

    def setUp(self):
        self.nginx_config_sdk = revsw_sdk_nginx_gen_config.NginxConfigSDK()


    def test_refresh_configuration(self):
        conf_manager = revsw_sdk_nginx_gen_config.NginxConfigSDK(args={
            "jinja_template": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "jinja_conf_vars": os.path.join(TEST_CONFIG_DIR, "sdk_nginx_conf.jinja"),
            "verbose_debug":1
        })
        templates = conf_manager.refresh_configuration()
        self.assertTrue(templates)


class TestConfigCommon(unittest.TestCase):

    def setUp(self):
        script_configs.APACHE_PATH = TEST_CONFIG_DIR
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

    def test_patch_config(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        templates = config_common.patch_config()
        self.assertTrue(templates)

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

    def test_can_config_bp(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        can_config = config_common.can_config_bp()
        self.assertTrue(can_config)

    def test_can_config_co(self):
        config_common = pc_apache_config.ConfigCommon(
            self.webserver_config_vars, self.varnish_config_vars, self.ui_config
        )
        can_config = config_common.can_config_co()
        self.assertTrue(can_config)

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
        can_config = config_common.varnish_changed()
        self.assertFalse(can_config)

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
            "bp_template": "test_name",
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

    def test_generate_ui_configs(self):
        apache_gen_config_script._domains = [self.domain]
        apache_gen_config_script.generate_ui_configs()
        self.assertTrue(os.path.exists("ui-config-test_domain.json"))

    def test_fixup_domain(self):
        apache_gen_config_script.fixup_domain(self.domain)
        self.assertTrue(os.path.exists("ui-config-test_domain.json"))

    def test_generate_bp_varnish_domain_json(self):
        test_json = {
            'CONTENT_OPTIMIZERS_HTTP': ['e', 's', 't', 't'],
            'CACHING_RULES_MODE': 'best',
            'CONTENT_OPTIMIZERS_HTTPS': [],
            'DOMAINS_TO_PROXY_HTTP': ['test1', 'test2'],
            'SERVER_NAME': 'test_domain',
            'BYPASS_CO_LOCATIONS': [],
            'CLIENT_RESPONSE_TIMEOUT': 600,
            'CACHE_PS_HTML': False,
            'INCLUDE_USER_AGENT': False,
            'ENABLE_GEOIP_HEADERS': False,
            'DEBUG_MODE': False,
            'CUSTOM_VCL': {
                'hash': '', 'deliver': '', 'backend_error': '', 'pass': '', 'hit': '', 'backend_fetch': '',
                'purge': '', 'recv': '', 'miss': '', 'pipe': '', 'backends': [], 'synth': '', 'backend_response': ''
            }, 'ENABLE_CACHE': True,
            'VERSION': 17,
            'ENABLE_ORIGIN_HEALTH_PROBE': False,
            'CUSTOM_VCL_ENABLED': False,
            'CACHE_IGNORE_AUTH': False,
            'CACHING_RULES': '123',
            'ORIGIN_HEALTH_PROBE': {'HTTP_REQUEST': '', 'PROBE_TIMEOUT': 0, 'PROBE_INTERVAL': 0, 'HTTP_STATUS': 0}
        }
        result_string = apache_gen_config_script.generate_bp_varnish_domain_json(self.domain)
        self.assertEqual(json.loads(result_string), test_json)

    def test_generate_bp_domain_json(self):
        test_json = {
            u'co_profiles': {
                u'REV_OPTIMIZATION_LEVEL': u'custom', u'REV_CUSTOM_IMG_LEVEL': u'medium',
                u'VERSION': 2, u'REV_CUSTOM_CSS_LEVEL': u'medium', u'REV_CUSTOM_JS_LEVEL': u'medium'
            },
            u'bp': {
                u'REV_PROFILES_BASE_PORT_HTTP': 80, u'ENABLE_VARNISH_GEOIP_HEADERS': False,
                u'ENABLE_HTML_SUBSTITUTE': True, u'DOMAINS_TO_OPTIMIZE_HTTPS': [u'test1', u'test2'],
                u'BYPASS_CO_LOCATIONS': [], u'BP_LUA_LOCATIONS': [], u'PROXY_TIMEOUT': 5, u'ENABLE_HTTPS': False,
                u'ORIGIN_REUSE_CONNS': True, u'CONTENT_OPTIMIZERS_HTTPS': [], u'BLOCK_CRAWLERS': True,
                u'ENABLE_OPTIMIZATION': True, u'ENABLE_SPDY': True, u'ORIGIN_SECURE_PROTOCOL': u'use_end_user_protocol',
                u'SERVER_NAME': u'test_domain', u'ORIGIN_SERVERS_HTTPS': [], u'CO_LUA_LOCATIONS': [],
                u'SSL_PROTOCOLS': u'TLSv1 TLSv1.1 TLSv1.2', u'SERVER_REGEX_ALIAS': u'',
                u'REV_RUM_BEACON_URL': u'http://rum-02-prod-sjc.revsw.net/service', u'REV_PROFILES_COUNT': 1,
                u'CUSTOM_WEBSERVER_CO_CODE_AFTER': u'', u'REV_PROFILES_BASE_PORT_HTTPS': 80,
                u'DOMAINS_TO_PROXY_HTTP': [u'test1', u'test2'], u'ENABLE_QUIC': False,
                u'END_USER_RESPONSE_HEADERS': [], u'BYPASS_VARNISH_LOCATIONS': [], u'ENABLE_WAF': False, u'ssl': {},
                u'CONTENT_OPTIMIZERS_HTTP': [u'http://e', u'http://s', u'http://t', u'http://t'], u'VERSION': 27,
                u'ORIGIN_SERVER_NAME': u'test', u'SSL_CERT_ID': u'default', u'ENABLE_JS_SUBSTITUTE': True,
                u'SERVER_ALIASES': [], u'ENABLE_VARNISH': True, u'DOMAINS_TO_OPTIMIZE_HTTP': [u'test1', u'test2'],
                u'ENABLE_DECOMPRESSION': True, u'ENABLE_RUM': False, u'ORIGIN_IDLE_TIMEOUT': 80,
                u'ENABLE_PROXY_BUFFERING': False, u'DOMAIN_SHARDS_COUNT': 1, u'CUSTOM_WEBSERVER_CODE_BEFORE': u'',
                u'SSL_CIPHERS': u'ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS',
                u'ORIGIN_SERVERS_HTTP': [u'http://test'], u'WAF_RULES': [], u'CUSTOM_WEBSERVER_CODE_AFTER': u'',
                u'ENABLE_HTTP2': True, u'acl': {u'action': u'allow_except', u'enabled': False, u'acl_rules': []},
                u'ENABLE_SSL': True, u'DEBUG_MODE': False, u'ORIGIN_REQUEST_HEADERS': [],
                u'SSL_PREFER_SERVER_CIPHERS': True, u'ENABLE_HTTP': True,
                u'DOMAINS_TO_PROXY_HTTPS': [u'test1', u'test2']
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
                'caching_rules': '123',
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
                'css_choice': 'medium', 'rev_custom_json': {}, 'js_choice': 'medium',
                'co_apache_custom_config': '', 'enable_optimization': True,
                'rum_beacon_url': 'http://rum-02-prod-sjc.revsw.net/service', 'lua': [],
                'img_choice': 'medium', 'mode': 'custom', 'enable_decompression': True, 'enable_rum': True
            },
            'rev_traffic_mgr': {
                'tier': 'SILVER', 'overage': 30, 'transfer_size': '160 TB',
                'page_views': '40M', 'apdex_threshold_ms': 2000
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
            'caching_rules': '123',
            'ssl_certificates': 'rev_certs',
            'enable_decompression': True,
            'enable_rum': True
        }
        result_string = apache_gen_config_script.generate_bp_ui_config_json(self.domain)
        self.assertEqual(result_string, test_json)


    def test_parse_profile_template_get_count(self):
        result_count = apache_gen_config_script.parse_profile_template_get_count(
            os.path.join(TEST_CONFIG_DIR, "default_customer_profiles.vars.schema")
        )
        self.assertEqual(result_count, 1)



if __name__ == '__main__':
    unittest.main()