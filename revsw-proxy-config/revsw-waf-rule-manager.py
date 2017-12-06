#!/usr/bin/env python
"""This module provides a command line interface to update the WAF rules
for Nginx edge server.

This module is used by the revsw-pcm-config daemon to change and refresh Nginx
server WAF configuration on edge server in location /opt/revsw-config/waf-rules/.
JSON Configuration file is located in /opt/revsw-config/policy/waf_rule.json
Usage of script:
    $ rewsw-waf-rule-manager -f /opt/revsw-config/policy/waf_rule.json
TODO:
    1. Write Unit test for module
    2. Switch optparse for argparse due to depreciation of optparse
"""

import json
import optparse
import os
import subprocess
import sys
import script_configs
from revsw.logger import RevSysLogger


def run_cmd(cmd, logger, help_=None, silent=False):
    """Run a shell command.

    Args:
        cmd (str): Shell command to run on server.
        logger (instance): Logger instance. Logger is either RevStdLogger or RevSysLogger.
        help (str, optional): Help info to show. Defaults to None.
        silent (boolean, optional): Show more info when running if true. Defaults to false.
    """
    errmsg = None
    try:
        if help_ or not silent:
            logger.LOGI(help_ or "Running '%s'" % cmd)

        child = subprocess.Popen(
            cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        (stdout, stderr) = child.communicate()

        if child.returncode < 0:
            errmsg = "'%s' was terminated by signal %d" % (
                cmd, -child.returncode)
        elif child.returncode > 0:
            errmsg = "'%s' returned %d" % (cmd, child.returncode)

        if not silent:
            for line in stderr.split("\n"):
                logger.LOGI(line)
    except OSError as e:
        if not silent:
            logger.LOGE("Execution of '%s' failed:" % cmd, e)
        raise

    if errmsg:
        if not silent:
            logger.LOGE(errmsg)
        raise OSError(errmsg)


class ConfigWAF:
    """Class that sets up Nginx server waf rules.

    Args:
        args (dict, optional): Optional External argument to overide defualt
            configuration file. Defualt is empty.

    Attributes:
        log (instance): Logging utility
        conf (dict): Configuration settings such as location, temp location and
            operation type.
        config_vars (dict): JSON file of configuration variables.
        rollback (list): List of roll back functions.
        status (bool): True if configuration settings are correct. False
            otherwise
    """

    def __init__(self, args={}):
        self.log = RevSysLogger(args["verbose_debug"])
        self.conf = {}
        self.config_vars = {}
        self.rollbacks = []
        self.status = False

        self._set_default_values()
        self._interpret_arguments(args)

        if self._read_config_files() != 0:
            self.log.LOGE("Json configuration file has a problem!")
        else:
            self._backup_rules()
            if self.config_vars['operation'] == "update":
                self._create_rules()
                self.status = True
            elif self.config_vars['operation'] == "delete":
                self.status = self._remove_rules()

        self.log.LOGD("Config values: " + json.dumps(self.conf))
        self.log.LOGD("Config vars: " + json.dumps(self.config_vars))

    def _set_default_values(self):
        self.conf['location'] = script_configs.WAF_RULES
        self.conf['tmp_location'] = script_configs.TMP_PATH
        self.conf['operation'] = None

    def _interpret_arguments(self, args):
        # override local arguments if a value was provided from outside
        for item in args:
            self.conf[item] = args[item]

    def _read_config_files(self):
        """
        input: reads the content of the configuration json file
        output: returns a status code and populates self.config_vars if everything is ok
         - 0 - if no problems have been encountered
         - 1 - if the provided file is not in the correct json file
         - 2 - if the provided file doesn't exist
         - 3 - unknown error case
        """
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        conf_full_path = self.conf["config_vars"]
        self.log.LOGD("Reading file from: " + conf_full_path)
        try:
            with open(conf_full_path) as f:
                try:
                    self.config_vars = json.load(f)
                    return 0
                except ValueError as e:
                    self.log.LOGE("Bad JSON format for file " + conf_full_path)
                    self.log.LOGE(e)
                    return 1
        except BaseException:
            self.log.LOGE("Can't find file " + conf_full_path)
            return 2

        return 3

    def _backup_rules(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        # make backup for this file
        try:
            self.run(
                lambda: run_cmd("rm -Rf %srevsw-waf-rule.tar && tar cf %srevsw-waf-rule.tar %s" % (
                    self.conf['tmp_location'], self.conf['tmp_location'], self.conf['location']),
                    self.log, "Backing up existing rules"),
                lambda: run_cmd("rm -Rf %s && tar -C / -xf %srevsw-waf-rule.tar" % (
                    self.conf['location'], self.conf['tmp_location']), self.log, "Restoring waf directory"))
        except BaseException:
            self.log.LOGE(
                "An error appeared while trying to backup the original files")
            raise

    def _create_rules(self):
        self.log.LOGI("Save rules " + sys._getframe().f_code.co_name)

        if not os.path.exists(self.conf["location"]):
            os.makedirs(self.conf["location"])

        body = ""
        for x in self.config_vars["rule_body"].split('\n'):
            rule = x.strip()
            if len(rule) > 0:
                if rule[0] != "#":
                    body += "BasicRule "
            body += '%s\n' % rule

        with open(self.conf["location"] + self.config_vars["id"] + '.rule', 'w+') as \
                f:
            f.write(body)

    def _remove_rules(self):
        self.log.LOGI("Starting removing process " +
                      sys._getframe().f_code.co_name)
        # remove the active configuration file

        files_patch = self.conf["location"] + self.config_vars["id"] + ".rule"
        print(files_patch)
        if os.path.isfile(files_patch):
            try:
                os.remove(files_patch)
                return True
            except BaseException:
                self.log.LOGE(
                    "An error appeared while removing the rules file " + files_patch)
                return False
        else:
            self.log.LOGI("File not found")
            return False

    def _reload_nginx(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        # check if configuration is correct
        p = subprocess.Popen('/etc/init.d/revsw-nginx configtest', shell=True)
        p.communicate()

        if p.returncode != 0:
            self.log.LOGE("Nginx configuration has a problem!")
            run_cmd(
                "rm -Rf %s && tar -C / -xf %srevsw-waf-rule.tar" % (
                    self.conf['location'], self.conf['tmp_location']),
                self.log, "Restoring rules directory")
            return p.returncode

        # nginx reload configuration if there are no errors
        p = subprocess.Popen('/etc/init.d/revsw-nginx reload', shell=True)
        p.communicate()

        return p.returncode

    def rollback(self):
        """Executes rollback functions stored in instance variable rollbacks
        """
        while self.rollbacks:
            self.rollbacks.pop()()

    def run(self, cmd_func, rollback_func=None):
        """Runs command and adds rollback function to rollbacks instance variable

        Args:
            cmd_func (function): Function to run on system. In this module we use the
                run_cmd function access shell on edge server.
            rollback_func(function, optional): Rollback function to add to
                rollbacks instance variable. Defaults to none.
        """
        try:
            cmd_func()
            if rollback_func:
                self.rollbacks.append(rollback_func)
        except BaseException:
            self.log.LOGE("Transaction failed, rolling back")
            self.rollback()
            raise


if __name__ == "__main__":
    parser = optparse.OptionParser()

    parser.add_option('-f',
                      '--file',
                      action="store",
                      dest="config_vars",
                      help="Specify the configuration file!"
                      )
    parser.add_option('-v',
                      '--verbose',
                      action="store_true",
                      dest="verbose_debug",
                      help="Specify the verbose flag to print more background info!"
                      )
    options, args = parser.parse_args()

    args = {}
    if options.config_vars:
        args["config_vars"] = options.config_vars
    else:
        RevSysLogger(1).LOGE("Bad request")
        exit()
    if getattr(options, 'config_vars'):
        args["verbose_debug"] = 1
    else:
        args["verbose_debug"] = 0

    conf_manager = ConfigWAF(args=args)
    if conf_manager.status:
        conf_manager._reload_nginx()
