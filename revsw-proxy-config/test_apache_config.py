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
import unittest
import itertools


from mock import Mock, patch
import revsw_apache_config
# import . as revsw
import script_configs
from revsw.logger import RevSysLogger
from revsw_apache_config import WebServerConfig, ConfigTransaction, PlatformWebServer, VarnishConfig, NginxConfig, \
    jinja_config_webserver_base_dir


TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files")
TEST_CONFIG_DIR = os.path.join(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/test_files"
)

revsw_apache_config._g_webserver_name = 'fdsdfsdfsd'
revsw_apache_config._log = RevSysLogger()



def redirect_to_test_dir(*args, **kwargs):
    return TEST_DIR

# Transaction class for testing
class TestConfigTransaction(ConfigTransaction):
    def __init__(self):
        self.rollbacks = []
        self.webserver_reload = False
        self.varnish_reload_cmd = None

        self.curr_idx = ConfigTransaction.file_idx
        ConfigTransaction.file_idx += 1

        varnish_dir = TEST_DIR
        etc_dir = TEST_DIR

    def finalize(self):
        pass

    def run(self, cmd_func, rollback_func=None):
        cmd_func()


class TestAbstractConfig(unittest.TestCase):
    testing_class = None

    def setUp(self):
        self.search_dirs_base = [os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/templates"
        )]
        self.subdirs = ("all/bp",)
        self.search_dirs = [os.path.join(base, subdir) for (base, subdir) in
                            itertools.product(self.search_dirs_base, self.subdirs)]
        self.platform = PlatformWebServer()
        self.platform.etc_dir = Mock(TEST_DIR)
        revsw_apache_config.jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        patch('revsw_apache_config._webserver_write_command', lambda x: x).start()
        self.testing_class.jinja_config_webserver_dir = Mock(return_value=TEST_DIR)


class TestWebServerConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = WebServerConfig('test_site', transaction=transaction)

    def test_gather_template_files(self):

        templates = self.testing_class.gather_template_files('bp', self.search_dirs)
        self.assertTrue(templates)

    def test_write_template_files(self):
        revsw_apache_config.jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        self.testing_class.write_template_files({'test_template.json': 'testing data'})
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/test_template.json")))

    def test_write_certs(self):
        revsw_apache_config.jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        cert = """-----BEGIN CERTIFICATE-----
test_cert
khbAidhAa0VTdw==
-----END CERTIFICATE-----
"""
        self.testing_class.write_certs(cert, cert, cert)
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/certs/server.crt")))
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/server.key")))
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/ca-bundle.crt")))


class TestVarnishConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = VarnishConfig('test_site', transaction=transaction)

    # TODO: first we need to refactor hardcoded  path
    # def test_write_config_file(self):
    #     self.varnish_config.write_config_file(self.search_dirs)

    def test_gather_template_files(self):
        templates = self.testing_class.gather_template_files(self.search_dirs)
        self.assertTrue(templates)

    @patch('revsw_apache_config.jinja_config_varnish_base_dir', side_effect=redirect_to_test_dir)
    def test_write_template_files(self, redirect_to_test_dir):
        self.testing_class.write_template_files({'test_template.json': 'testing data'})
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/test_template.json")))

    def test_load_site_config(self):
        test_json = {'test': 'test'}
        with open(os.path.join(TEST_CONFIG_DIR, "test_config.json"), "w") as f:
            json.dump(test_json, f, indent=2)

        self.testing_class.site_config_path = Mock(
            return_value=os.path.join(TEST_CONFIG_DIR, "test_config.json")
        )
        site_config = self.testing_class.load_site_config()
        self.assertEqual(site_config, test_json)

    def test_config_site(self):
        self.testing_class.site_config_path = Mock(
            return_value=os.path.join(TEST_CONFIG_DIR, "test_config2.json")
        )
        self.testing_class.config_site({'test': 'test'})
        self.assertTrue(os.path.exists(os.path.join(TEST_CONFIG_DIR, "test_config2.json")))

    def test_remove_site(self):
        open(os.path.join(TEST_CONFIG_DIR, "test_config.json"), "w")
        self.testing_class.site_config_path = Mock(
            return_value=os.path.join(TEST_CONFIG_DIR, "test_config.json")
        )
        self.testing_class.remove_site()
        self.assertFalse(os.path.exists(os.path.join(TEST_CONFIG_DIR, "test_config.json")))

    def test_site_config_path(self):
        config_path = self.testing_class.site_config_path()
        self.assertEqual(config_path, '%s/test_config.json' % TEST_CONFIG_DIR)


class TestNginxConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = NginxConfig('test_site', transaction=transaction)

    def test_configure_site(self):
        self.testing_class.configure_site({})

    def test_remove_site(self):
        script_configs.NGINX_PATH = TEST_DIR
        if not os.path.exists(os.path.join(TEST_DIR, "sites-available/test_site.conf")):
            os.mkdir("%s/sites-available" % TEST_DIR)
            with open("%s/sites-available/test_site.conf" % TEST_DIR, "wb") as f:
                f.write("test")
        if not os.path.exists(os.path.join(TEST_DIR, "sites-enabled/test_site.conf")):
            os.mkdir("%s/sites-enabled" % TEST_DIR)
            with open("%s/sites-enabled/test_site.conf" % TEST_DIR, "wb") as f:
                f.write("test")
        if not os.path.exists(os.path.join(TEST_DIR, "test_site")):
            os.mkdir("%s/test_site" % TEST_DIR)

        self.testing_class.remove_site()
        self.assertFalse(os.path.exists(os.path.join(TEST_DIR, "sites-available/test_site.conf")))
        self.assertFalse(os.path.exists(os.path.join(TEST_DIR, "sites-enabled/test_site.conf")))
        self.assertFalse(os.path.exists(os.path.join(TEST_DIR, "test_site")))


if __name__ == '__main__':
    unittest.main()