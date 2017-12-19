API_VERSION = 5  # used in apache-config, revsw-apache-config, pc-apache-config
SDK_VERSION = 1
_UI_CONFIG_VERSION = "1.0.6"  # used in pc-apache-config
_BP_CONFIG_VERSION = 28  # used in pc-apache-config, apache-gen-config-script
_CO_CONFIG_VERSION = 16  # used in pc-apache-config
_CO_PROFILES_CONFIG_VERSION = 2  # used in pc-apache-config, apache-gen-config-script
_VARNISH_CONFIG_VERSION = 17  # used in pc-apache-config, apache-gen-config-script
_UI_PURGE_VERSION = 1  # used in revsw-varnish-purge

APACHE_MAPPING_FILE = "/opt/revsw-config/apache/site-mappings.json"  # used in pc-apache-config._get_domain_mapping
APACHE_PATH = "/opt/revsw-config/apache/"  # used in pc-apache-config._get_initial_domain_config
APACHE_GENERIC_SITE = "/opt/revsw-config/apache/generic-site/"  # used in revsw-ssl-cert-manager._set_default_values

CERTS_FOLDER = "/opt/revsw-config/certs"  # used in revsw-ssl-cert-manager
CONFIG_PATH = "/opt/revsw-config/"  # used in revsw_apache_config
CONF_NAME = "revsw-apps.conf"  # used in revsw-sdk-nginx-gen-config

JINJA_CONF_VARS = "/opt/revsw-config/policy/apps.json"  # revsw-sdk-nginx-gen-config
JINJA_TEMPLATE = "/opt/revsw-config/templates/all/bp/sdk_nginx_conf.jinja"  # revsw-sdk-nginx-gen-config

NGINX_PATH = "/etc/nginx/"  # used in revsw_apache_config
NGINX_FINAL_LOCATION = "/etc/nginx/conf.d/"  # used in revsw-sdk-nginx-gen-config
NGINX_BACKUP_LOCATION = "/etc/nginx/backup/"  # used in revsw-sdk-nginx-gen-config

PROFILE_TEMPLATE = "co/standard_profiles"  # used in apache-gen-config-script

RUM_BEACON_URL = "http://rum-02-prod-sjc.revsw.net/service"  # used in apache-gen-config-script

TMP_PATH = "/tmp/"  # used in:
# apache-config
# revsw-ssl-cert-manager
# revsw-waf-rule-manager
# revsw-sdk-nginx-gen-config
# revsw-apache-config

VARNISH_PATH = "/etc/varnish/"  # used in revsw_apache_config
VARNISH_PATH_CONFIG = "/opt/revsw-config/varnish/"  # used in revsw_apache_config

WAF_RULES = "/opt/revsw-config/waf-rules/"  # used in revsw-waf-rule-manager
