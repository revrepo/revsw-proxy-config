#!/usr/bin/env python
import json
import optparse
import os
import shutil
import socket
import subprocess
import sys

from jinja2.runtime import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment

from revsw.logger import RevSysLogger

# Defines config structure version
SDK_VERSION = 1

class NginxConfigSDK:

    def __init__(self, args={}):
        self.log = RevSysLogger(args["verbose_debug"])
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
        # hardcoded paths, better have main config for this case

    def _interpret_arguments(self, args):
        # override local arguments if a value was provided from outside
        # how do we know if arg from outside, this functions just appends all keys and values to nginx_config, pointless
        # used once
        for item in args:
            self.nginx_conf[item] = args[item]

    def _read_jinja_template(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        
        template_full_path = self.nginx_conf["jinja_template"]
        self.log.LOGD("Loading SDK Nginx template!")
        with open(template_full_path) as f:
            self.string_template = f.read()
            self.log.LOGD("Loaded SDK Nginx template: " + template_full_path)

    def _read_sdk_config_files(self):
        """
        input: reads the content of the configuration json file
        output: returns a status code and populates self.config_vars if everything is ok
         - 0 - if no problems have been encountered
         - 1 - if the provided file is not in the correct json file
         - 2 - if the provided file doesn't exist
         - 3 - unknown error case
        """
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        
        conf_full_path = self.nginx_conf["jinja_conf_vars"]
        self.log.LOGD("Reading file from: " + conf_full_path)
        try:
            with open(conf_full_path) as f:
                try:
                    self.config_vars = json.load(f)
                    return 0
                except:
                    self.log.LOGE("Bad JSON format for file " + conf_full_path)
                    return 1
        except:
            self.log.LOGE("Can't find file " + conf_full_path)
            return 2
        
        return 3
        # code never reach return 3

    def _generate_final_nginx_config(self):
        """
        Generate the final nginx configuration based on the jinja template and on the configuration files.
        """
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        config_exists = 1
        
        key_list = self.config_vars["configs"]
        template = self.env.from_string(self.string_template)
        final_nginx_config = template.render(configs=key_list, bpname=socket.gethostname().split('.')[0])
        
        final_file = self.nginx_conf["tmp_location"] + self.nginx_conf["conf_name"]
        with open(final_file, 'w+') as f:
            f.write(final_nginx_config)

        shutil.copy2(self.nginx_conf["tmp_location"] + self.nginx_conf["conf_name"],
            self.nginx_conf["final_location"] + self.nginx_conf["conf_name"])

    def _backup_active_sdk_nginx_config(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        # make backup for this file

        conf_final_path = self.nginx_conf["final_location"] + self.nginx_conf["conf_name"]
        conf_backup_path = self.nginx_conf["backup_location"] + self.nginx_conf["conf_name"]
        try:
            if not os.path.exists(self.nginx_conf["backup_location"]):
                os.makedirs(self.nginx_conf["backup_location"])

            if os.path.exists(conf_final_path):
                shutil.copy2(conf_final_path, conf_backup_path)
        except:
            self.log.LOGE("An error appeared while trying to backup the original file " + conf_final_path + " to " + conf_backup_path)
            raise

    def _remove_active_sdk_nginx_config(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        # remove the active configuration file

        conf_final_path = self.nginx_conf["final_location"] + self.nginx_conf["conf_name"]
        try:
            if os.path.exists(conf_final_path):
                # remove the file
                os.remove(conf_final_path)
        except:
            self.log.LOGE("An error appeared while removing the configuration file " + conf_final_path)
            raise

    def _restore_sdk_nginx_from_backup(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        # restore file from tmp backup location
        try:
            shutil.copy2(self.nginx_conf["backup_location"] + self.nginx_conf["conf_name"], 
                self.nginx_conf["final_location"] + self.nginx_conf["conf_name"])
        except:
            self.log.LOGE("An error appeared while trying to get backup file! Stop processing")
            raise

    def _load_new_configuration(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        # check if configuration is correct
        p = subprocess.Popen('/etc/init.d/revsw-nginx configtest', shell=True)
        p.communicate()

        if p.returncode != 0:
            self.log.LOGE("Nginx configuration has a problem!")
            return p.returncode

        # nginx reload configuration if there are no errors
        p = subprocess.Popen('/etc/init.d/revsw-nginx reload', shell=True)
        p.communicate()

        return p.returncode

    def refresh_configuration(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        # backup current configuration
        self._read_jinja_template()

        file_read_status = self._read_sdk_config_files()

        # in case that a problem appeared reading the configuration JSON file
        # remove the config file and reload nginx
        if file_read_status != 0:
            self._remove_active_sdk_nginx_config()
            result = self._load_new_configuration()
            if result != 0:
                exit(1)

            exit(0)

        flags_problem = 0
        try:
            # check if configuration type is correct
            tmp = self.config_vars["configuration_type"]
            if tmp != "sdk_apps_config":
                self.log.LOGE("The provided configuration type is not valid!")
                raise
        except:
            self.log.LOGE("Key configuration_type must be defined!")
            flags_problem = 1

        try:
            # check if operation is defined
            tmp = self.config_vars["operation"]
        except:
            self.log.LOGE("JSON file doesn't contain operation type!")
            flags_problem = 1

        try:
            # check configs is defined
            tmp = self.config_vars["configs"]
        except:
            self.log.LOGE("JSON file doesn't contain configs parameter!")
            flags_problem = 1

        if flags_problem == 1:
            self._remove_active_sdk_nginx_config()
            result = self._load_new_configuration()
            exit(1)
        
        if self.config_vars["operation"] != "app-update":
            self.log.LOGD("Unknown operation was provided! Exiting gracefully!")
            exit(0)

        config_problem = 0
        try:
            if not type(self.config_vars["configs"]) is list:
                self.log.LOGE("Param configs should be a list!")
                raise
            if len(self.config_vars["configs"]) < 1:
                self.log.LOGE("At least one config should be defined!")
                raise
        except:
            config_problem = 1

        if config_problem == 0:
            self._backup_active_sdk_nginx_config()
            self._generate_final_nginx_config()
        else:
            self._remove_active_sdk_nginx_config()
        
        result = self._load_new_configuration()
        if (result != 0) and (config_problem == 0):
            self.log.LOGE("Problem loading new configuration - restoring original file")
            self._restore_sdk_nginx_from_backup()
            sys.exit(1)

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
    parser.add_option('-v', 
        '--verbose',
        action="store_true",
        dest="verbose_debug",
        help="Specify the verbose flag to print more background info!"
    )
    options, args = parser.parse_args()
    
    args = { }
    if options.jinja_template:
        args["jinja_template"] = options.jinja_template
    if options.jinja_conf_vars:
        args["jinja_conf_vars"] = options.jinja_conf_vars
    if options.verbose_debug:
        args["verbose_debug"] = 1
    else:
        args["verbose_debug"] = 0
    
    conf_manager = NginxConfigSDK(args=args)
    conf_manager.refresh_configuration()
