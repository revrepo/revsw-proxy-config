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
import revsw


from mock import Mock, patch
import revsw_apache_config
# import . as revsw
import script_configs
from revsw.logger import RevSysLogger
from revsw_apache_config import WebServerConfig, ConfigTransaction, PlatformWebServer, VarnishConfig, NginxConfig, \
    jinja_config_webserver_base_dir


TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temporary_testing_files/")
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
        # create folder for tests
        os.system("mkdir %s" % TEST_DIR)
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

    def tearDown(self):
        # remove all temporary test files
        os.system("rm -r %s" % TEST_DIR)


class TestWebServerConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = WebServerConfig('test_site', transaction=transaction)

    def test_gather_template_files(self):
        subdirs = ("nginx/common",)
        search_dirs = [os.path.join(base, subdir) for (base, subdir) in
                            itertools.product(self.search_dirs_base, subdirs)]
        templates = self.testing_class.gather_template_files('balancer', search_dirs)
        self.assertTrue(templates)

    def test_write_template_files(self):
        revsw_apache_config.jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        self.testing_class.write_template_files({'test_template.json': 'testing data'})
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/test_template.json")))

    def test_write_certs(self):
        revsw_apache_config.jinja_config_webserver_base_dir = Mock(return_value=TEST_DIR)
        cert = """-----BEGIN CERTIFICATE-----
MIIDizCCAnOgAwIBAgIJAIKWzl34sq5rMA0GCSqGSIb3DQEBBQUAMFwxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQxFTATBgNVBAMMDHJldnN3LWNvbmZpZzAeFw0xNDAzMjQx
ODQ3MTNaFw0xNTAzMjQxODQ3MTNaMFwxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApT
b21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxFTAT
BgNVBAMMDHJldnN3LWNvbmZpZzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBAMX9kMXcdF0z1vEryj79xV7Lz8YP3CL+ByrR+JsXlD0TTSH3xx9G2gxIrT/E
Nv5z4P4DXYUs4/74iyS645WTddiv4Z3vkcqvYbmdy0BRTdg80oOEKbkSO9CnjDbt
7ylXAXs0n3zZT9Ms92dko3nf0W0suwrD3RnksOxMZoFes02qsf73B8xqp7m9Bm93
16U9DGBAkdgzctlVj5DdARW7BnUjYpUAvMZG+9cgLu84HDdrrMgxOGEc5SwWJqLK
pRzJireDR88WoBnFPsBl4cvwS0K6FMaLcrnNpX2IBXf8FE9uaXNW9n0DaEAltTDa
M3Twv+kkuyu4Fw6Ed34hZeb+NsECAwEAAaNQME4wHQYDVR0OBBYEFLgvOaN9ERpV
nuQo8JzHvdRVWexcMB8GA1UdIwQYMBaAFLgvOaN9ERpVnuQo8JzHvdRVWexcMAwG
A1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBACWJj+fsjTUqcvubiHXaK57I
8FsbjfYXVw7qzi5EqnLj0uXB+DYYUZB8dI9s7zLvnuqKqH6fXw4ahp+1DOAIMDie
tI/6rkTKykqw05A0Yd7hpK35+5YR9XC5Nh0NCRnHCaEsEOyaN+v5wy4+JMy44IWu
EBTSrTVumTy7w7A52GEbsObVQM1UNB94zBrQFPrcOLdIerARWf4yJ2RkJzGpy3+c
BTInOSVqmsV3Dna4cw+S9hC7e+goeeCwyse6EBQSQtNwXLk6NAWzM7DK0FzKWWa+
pBQFcL5ZOPHeTbfzHnljVA0G1kbwcJmKPCuNhwGIrjCX7XQncaJGNxIplRJkb7k=
-----END CERTIFICATE-----
"""

        # self.testing_class.write_certs(cert, cert, cert)
        # self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/certs/server.crt")))
        # self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/server.key")))
        # self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_site/ca-bundle.crt")))

    def test_fixup_certs(self):
        self.testing_class._fixup_certs()
        self.assertTrue(os.path.islink((os.path.join(TEST_DIR, "test_site/certs/server.crt"))))
        self.assertTrue(os.path.islink((os.path.join(TEST_DIR, "test_site/certs/server.key"))))
        self.assertTrue(os.path.islink((os.path.join(TEST_DIR, "test_site/certs/ca-bundle.crt"))))
        self.assertTrue(os.path.islink((os.path.join(TEST_DIR, "test_site/certs/server-chained.crt"))))


class TestVarnishConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = VarnishConfig('test_site', transaction=transaction)

    def test_write_config_file(self):
        script_configs.VARNISH_PATH = TEST_DIR
        script_configs.CONFIG_PATH = TEST_DIR
        script_configs.VARNISH_PATH_CONFIG = TEST_DIR
        # create folder for tests and copy files for test
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'bin/'))
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'sites/'))

        os.system("cp %s %s" % (
            os.path.join(os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/conf_files_formatter.sh"
            ),
            os.path.join(TEST_DIR, 'bin/')
        ))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.jinja"), os.path.join(TEST_DIR, 'test_site/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.json"), os.path.join(TEST_DIR, 'bin/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.json"), os.path.join(TEST_DIR, 'sites/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "test_site.json"), os.path.join(TEST_DIR, 'sites/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "test_domain.json"), os.path.join(TEST_DIR, 'sites/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.vars.schema"), os.path.join(TEST_DIR, 'test_site/')))


        self.testing_class.write_config_file(self.search_dirs)

    def test_gather_template_files(self):
        templates = self.testing_class.gather_template_files(self.search_dirs)
        self.assertTrue(templates)

    @patch('revsw_apache_config.jinja_config_varnish_base_dir', side_effect=redirect_to_test_dir)
    def test_write_template_files(self, redirect_to_test_dir):
        self.testing_class.write_template_files({'test_template.json': 'testing data'})
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "test_template.json")))

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

    def test_extract_domain_locations_from_vcl(self):
        script_configs.VARNISH_PATH = TEST_CONFIG_DIR
        config_path = self.testing_class._extract_domain_locations_from_vcl()
        self.assertEqual(config_path, [])


class TestNginxConfig(TestAbstractConfig):
    transaction = TestConfigTransaction()
    testing_class = NginxConfig('test_site', transaction=transaction)

    def test_configure_site(self):
        revsw.misc.run_cmd = Mock(return_value=None)
        script_configs.NGINX_PATH = TEST_DIR
        script_configs.CONFIG_PATH = TEST_DIR
        # create folder for tests and copy files for test
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'test_site/'))
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'bin/'))
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'sites-available/'))
        os.system("mkdir %s" % os.path.join(TEST_DIR, 'sites-enabled/'))


        os.path.join(os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/test_files"
        )
        os.system("cp %s %s" % (
            os.path.join(os.path.dirname(
                os.path.dirname(os.path.abspath(__file__))), "revsw-proxy-config/conf_files_formatter.sh"
            ),
            os.path.join(TEST_DIR, 'bin/')
        ))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.jinja"), os.path.join(TEST_DIR, 'test_site/')))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.vars.schema"), os.path.join(TEST_DIR, 'test_site/')))

        self.testing_class.configure_site({
            "configs": [{"sdk_domain_name": "test"}],
            "bpname": "test"
        })
        self.assertTrue(os.path.exists(os.path.join(TEST_DIR, "sites-available/test_site.conf")))

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

    def test_get_all_active_domains(self):
        script_configs.APACHE_PATH = TEST_DIR
        # create test folder
        os.mkdir(os.path.join(TEST_DIR, "test_site"))
        os.system("cp %s %s" % (os.path.join(TEST_CONFIG_DIR, "main.json"), os.path.join(TEST_DIR, "test_site")))

        domains = self.testing_class.get_all_active_domains()
        self.assertEqual(domains, ["test_domain",])


if __name__ == '__main__':
    unittest.main()