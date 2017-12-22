API_VERSION = 5
SDK_VERSION = 1
_UI_CONFIG_VERSION = "1.0.6"
_BP_CONFIG_VERSION = 29
_CO_CONFIG_VERSION = 16
_CO_PROFILES_CONFIG_VERSION = 2
_VARNISH_CONFIG_VERSION = 17
_UI_PURGE_VERSION = 1

APACHE_MAPPING_FILE = "/opt/revsw-config/apache/site-mappings.json"
# used in pc-apache-config._get_domain_mapping
APACHE_PATH = "/opt/revsw-config/apache/"
# used in pc-apache-config._get_initial_domain_config
APACHE_GENERIC_SITE = "/opt/revsw-config/apache/generic-site/"

# used in revsw-ssl-cert-manager._set_default_values
CERTS_FOLDER = "/opt/revsw-config/certs/"
CONFIG_PATH = "/opt/revsw-config/"  # used in revsw_apache_config.__init__
CONF_NAME = "revsw-apps.conf"

JINJA_CONF_VARS = "/opt/revsw-config/policy/apps.json"
JINJA_TEMPLATE = "/opt/revsw-config/templates/all/bp/sdk_nginx_conf.jinja"

NGINX_PATH = "/etc/nginx/"  # used in revsw_apache_config.__init__
NGINX_FINAL_LOCATION = "/etc/nginx/conf.d/"
NGINX_BACKUP_LOCATION = "/etc/nginx/backup/"

PROFILE_TEMPLATE = "co/standard_profiles"

RUM_BEACON_URL = "http://rum-02-prod-sjc.revsw.net/service"

# used in revsw-ssl-cert-manager._set_default_values, revsw-waf-rule-manager._set_default_values
TMP_PATH = "/tmp/"

VARNISH_PATH = "/etc/varnish/"  # used in revsw_apache_config.__init__
# used in revsw_apache_config.__init__
VARNISH_PATH_CONFIG = "/opt/revsw-config/varnish/"

# used in revsw-waf-rule-manager._set_default_values
WAF_RULES = "/opt/revsw-config/waf-rules/"
