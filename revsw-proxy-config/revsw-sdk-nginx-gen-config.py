import jinja2
from jinja2.runtime import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment
import json
import shutil
import sys

# Defines config structure version
SDK_VERSION = 1

class NginxConfigSDK:
    def __init__(self, debug=0, site_name=None, transaction=None):
        self.debug = debug
	self.nginx_conf = {}

	# default path values
	self.nginx_conf["tmp_conf"] = "/tmp/temp_local_revsw-sdk-config.conf"
	self.nginx_conf["final_location"] = "/etc/nginx/conf.d/revsw-sdk-config.conf"
	self.nginx_conf["backup_location"] = "/tmp/backup_revsw-sdk-config.conf"
	self.nginx_conf["jinja_template"] = "/home/strajan/repo/revsw-proxy-config/revsw-proxy-config/templates/all/bp/sdk_nginx_conf.jinja"
	self.nginx_conf["jinja_conf_vars"] = "/home/strajan/tmp/sdk_nginx/nginx_config_test.conf"

        self.search_path = []

        self.env = ImmutableSandboxedEnvironment(
            line_statement_prefix=None,
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=StrictUndefined
        ) 


    def _debug_process(self, message):
        if self.debug == 1:
            print(message)
        return 0

    def _read_jinja_template(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

	template_full_path = self.nginx_conf["jinja_template"]
        self._debug_process("Loading SDK Nginx template!")
	with open(template_full_path) as f:
		self.string_template = f.read()
        self._debug_process("Loaded SDK Nginx template: " + template_full_path)


    def _read_sdk_config_files(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

	conf_full_path = self.nginx_conf["jinja_conf_vars"]
        self._debug_process("Reading file from: " + conf_full_path)
        with open(conf_full_path) as f:
            self.config_vars = json.load(f)
            return 0

        return 1

        
    def _generate_final_nginx_config(self):
        """
        Generate the final nginx configuration based on the jinja template and on the configuration files.
        """
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)
	
	key_list = self.config_vars["configs"]
	template = self.env.from_string(self.string_template)
	final_nginx_config = template.render(configs=key_list)

        with open(self.nginx_conf["tmp_conf"], 'w+') as f:
            f.write(final_nginx_config)
	    return 0

    	return 1


    def _backup_active_sdk_nginx_config(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)
        # make backup for this file
	try:
		shutil.copy2(self.nginx_conf["final_location"], self.nginx_conf["backup_location"])
	except:
		self._debug_process("An error appeared while trying to backup the original file! Stop processing")
		raise

    def _restore_sdk_nginx_from_backup(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)
        # restore file from tmp backup location
	try:
		shutil.copy2(self.nginx_conf["backup_location"], self.nginx_conf["final_location"])
	except:
		self._debug_process("An error appeared while trying to get backup file! Stop processing")
		raise


    def _load_new_configuration(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)
        # nginx reload configuration to see if there are errors

        return 1 # this is an error

    def refresh_configuration(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

        self._read_jinja_template()
        self._read_sdk_config_files()

        self._generate_final_nginx_config()

        # start replacing the new file
        self._backup_active_sdk_nginx_config()
        result = self._load_new_configuration()
        if result != 0:
            self._debug_process("Problem loading new configuration - restoring original file")
            self._restore_sdk_nginx_from_backup()

if __name__ == "__main__":
        conf_manager = NginxConfigSDK(debug=1)
        conf_manager.refresh_configuration()
