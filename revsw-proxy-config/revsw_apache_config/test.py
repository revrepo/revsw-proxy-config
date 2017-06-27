import json
import os
import unittest
import itertools


from mock import Mock, patch

import . as revsw
from revsw.logger import RevSysLogger
from . import WebServerConfig, ConfigTransaction, PlatformWebServer, VarnishConfig, NginxConfig, jinja_config_webserver_base_dir, _g_webserver_name


TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files")
TEST_CONFIG_DIR = os.path.join(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/test_files"
)

_log = RevSysLogger()


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
        jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        patch('revsw_apache_config._webserver_write_command', lambda x: x).start()
        self.testing_class.jinja_config_webserver_dir = Mock(return_value=TEST_DIR)


class TestWebServerConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = WebServerConfig('test_site', transaction=transaction)

    def test_gather_template_files(self):
        global _g_webserver_name
        _g_webserver_name = 'fdsdfsdfsd'
        templates = self.testing_class.gather_template_files('bp', self.search_dirs)
        self.assertTrue(templates)

    def test_write_template_files(self):
        self.testing_class.write_template_files({'test_template.json': 'testing data'})
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/test_template.json")))

    def test_write_certs(self):
        cert = "fashdfahfff234123jkkhr1j="
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
        self.assertEqual(config_path, '/opt/revsw-config/varnish/sites/test_site.json')


class TestNginxConfig(unittest.TestCase):
    transaction = TestConfigTransaction()
    testing_class = NginxConfig('test_site', transaction=transaction)

    # TODO: first we need to refactor hardcoded  path to nginx
    # def test_configure_site(self):
    #     self.nginx_config.configure_site(self.search_dirs)
    #
    # def test_remove_site(self):
    #     self.nginx_config.remove_site(self.search_dirs)


if __name__ == '__main__':
    unittest.main()