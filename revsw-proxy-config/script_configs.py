
APACHE_MAPPING_FILE = "/opt/revsw-config/apache/site-mappings.json"
APACHE_PATH = "/opt/revsw-config/apache/"  # used in pc-apache-config._get_domain_mapping
APACHE_GENERIC_SITE = "/opt/revsw-config/apache/generic-site/" # used in pc-apache-config._get_initial_domain_config

CONFIG_PATH = "/opt/revsw-config/"  # used in revsw_apache_config.__init__

NGINX_PATH = "/etc/nginx/"  # used in revsw_apache_config.__init__
VARNISH_PATH = "/etc/varnish/"  # used in revsw_apache_config.__init__

VARNISH_PATH_CONFIG = "/opt/revsw-config/varnish/"  # used in revsw_apache_config.__init__

WAF_RULES = "/opt/revsw-config/waf-rules/"  # used in revsw-waf-rule-manager._set_default_values
CERTS_FOLDER = "/opt/revsw-config/certs/"  # used in revsw-ssl-cert-manager._set_default_values
TMP_PATH = "/tmp/"  # used in revsw-ssl-cert-manager._set_default_values, revsw-waf-rule-manager._set_default_values

