import json
import optparse
import os
import shutil
import subprocess
import sys

import jinja2
from jinja2.runtime import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment

# Defines config structure version
SDK_VERSION = 1

class NginxConfigSDK:

    def __init__(self, debug=0, args={}):
        self.debug = debug
        self.nginx_conf = {}
        
        self._set_default_values()
        self._interpret_arguments(args)

        self.env = ImmutableSandboxedEnvironment(
            line_statement_prefix=None,
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=StrictUndefined
        ) 

    def _set_default_values(self):
        self.nginx_conf["jinja_template"] = "/opt/revsw-config/templates/all/bp/sdk_nginx_conf.jinja"
        self.nginx_conf["jinja_conf_vars"] = "/opt/revsw-config/policy/apps.json"

        self.nginx_conf["conf_name"] = "revsw-apps.conf"
        self.nginx_conf["tmp_location"] = "/tmp/"
        self.nginx_conf["final_location"] = "/etc/nginx/conf.d/"
        self.nginx_conf["backup_location"] = "/etc/nginx/backup/"

    def _interpret_arguments(self, args):
        # override local arguments if a value was provided from outside
        for item in args:
            self.nginx_conf[item] = args[item]

    def _debug_process(self, message):
        self._generic_log("DEBUG info", message)

    def _error_process(self, message):
        self._generic_log("ERROR info", message)

    def _generic_log(self, type_info, message):
        if self.debug == 1:
            print type_info, message
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
        
        final_file = self.nginx_conf["tmp_location"] + self.nginx_conf["conf_name"]
        with open(final_file, 'w+') as f:
            f.write(final_nginx_config)

        shutil.copy2(self.nginx_conf["tmp_location"] + self.nginx_conf["conf_name"],
            self.nginx_conf["final_location"] + self.nginx_conf["conf_name"])

    def _backup_active_sdk_nginx_config(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)
        # make backup for this file

        try:
            if not os.path.exists(self.nginx_conf["backup_location"]):
                os.makedirs(self.nginx_conf["backup_location"])
            shutil.copy2(self.nginx_conf["final_location"] + self.nginx_conf["conf_name"], 
                self.nginx_conf["backup_location"] + self.nginx_conf["conf_name"])
        except:
            self._error_process("An error appeared while trying to backup the original file! Stop processing")
            raise

    def _restore_sdk_nginx_from_backup(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

        # restore file from tmp backup location
        try:
            shutil.copy2(self.nginx_conf["backup_location"] + self.nginx_conf["conf_name"], 
                self.nginx_conf["final_location"] + self.nginx_conf["conf_name"])
        except:
            self._error_process("An error appeared while trying to get backup file! Stop processing")
            raise

    def _load_new_configuration(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

        # nginx reload configuration to see if there are errors
        p = subprocess.Popen('/etc/init.d/revsw-nginx reload', shell=True)
        p.communicate()

        return p.returncode

    def refresh_configuration(self):
        self._debug_process("Starting processing " + sys._getframe().f_code.co_name)

        # backup current configuration
        self._backup_active_sdk_nginx_config()
        
        self._read_jinja_template()
        self._read_sdk_config_files()
        self._generate_final_nginx_config()
        
        result = self._load_new_configuration()
        if result != 0:
            self._error_process("Problem loading new configuration - restoring original file")
            self._restore_sdk_nginx_from_backup()

if __name__ == "__main__":
    parser = optparse.OptionParser()
    
    parser.add_option('-t', 
        '--jinja-template', 
        action="store", 
        dest="jinja_template", 
        help="Specify the jinja template file location"
    )
    parser.add_option('-f', 
        '--jinja-conf-vars',
        action="store",
        dest="jinja_conf_vars",
        help="Specify the configuration file for the template!"
    )
    options, args = parser.parse_args()
    
    args = { "test": "some_val" }
    if options.jinja_template:
        args["jinja_template"] = options.jinja_template
    if options.jinja_conf_vars:
        args["jinja_conf_vars"] = options.jinja_conf_vars
    
    conf_manager = NginxConfigSDK(debug=1, args=args)
    conf_manager.refresh_configuration()
