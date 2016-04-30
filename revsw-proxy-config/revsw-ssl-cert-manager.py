#!/usr/bin/env python
import json
import optparse
import os
import shutil
import socket
import subprocess
import sys
from revsw.logger import RevSysLogger


def run_cmd(cmd, logger, help=None, silent=False):
    """
    Run a shell command.
    logger is either RevStdLogger of RevSysLogger
    """
    errmsg = None
    try:
        if help or not silent:
            logger.LOGI(help or "Running '%s'" % cmd)

        child = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        (stdout, stderr) = child.communicate()

        if child.returncode < 0:
            errmsg = "'%s' was terminated by signal %d" % (cmd, -child.returncode)
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


class ConfigSSL:
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
            self._backup_certs()
            if self.config_vars['operation'] == "update":
                self._create_certs()
                if self.config_vars['cert_type'] == "shared":
                    self._create_symlink()
                self.status = True
            elif self.config_vars['operation'] == "delete":
                self.status = self._remove_certs()

        self.log.LOGD("Config values: " + json.dumps(self.conf))
        self.log.LOGD("Config vars: " + json.dumps(self.config_vars))

    def _set_default_values(self):

        self.conf['location'] = "/opt/revsw-config/certs/"
        self.conf['tmp_location'] = "/tmp/"
        self.conf['operation'] = None

        self.conf['cert'] = "public.crt"
        self.conf['key'] = "private.key"
        self.conf['passphrase'] = "pass.txt"
        self.conf['info'] = "info.txt"

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
        except:
            self.log.LOGE("Can't find file " + conf_full_path)
            return 2

        return 3

    def _backup_certs(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)
        # make backup for this file
        try:
            self.run(
                lambda: run_cmd("rm -Rf %srevsw-ssl-cert.tar && tar cf %srevsw-ssl-cert.tar %s" % (
                self.conf['tmp_location'], self.conf['tmp_location'], self.conf['location']),
                                self.log, "Backing up existing certificates"),
                lambda: run_cmd("rm -Rf %s && tar -C / -xf %srevsw-ssl-cert.tar" % (
                self.conf['location'], self.conf['tmp_location']), self.log, "Restoring certificates directory"))
        except:
            self.log.LOGE("An error appeared while trying to backup the original files")
            raise

    def _create_certs(self):
        self.log.LOGI("Save certificates " + sys._getframe().f_code.co_name)

        files_patch = self.conf["location"] + self.config_vars["id"] + "/"

        if not os.path.exists(files_patch):
            os.makedirs(files_patch)

        with open(files_patch + self.conf['cert'], 'w+') as f: f.write(self.config_vars["public_ssl_cert"])
        with open(files_patch + self.conf['key'], 'w+') as f: f.write(self.config_vars["private_ssl_key"])
        with open(files_patch + self.conf['passphrase'], 'w+') as f: f.write(
            self.config_vars["private_ssl_key_passphrase"])

        with open(files_patch + self.conf['info'], 'w+') as f: f.write(json.dumps(self.config_vars))

    def _create_symlink(self):
        files_patch = self.conf["location"] + "default"
        if os.path.exists(files_patch):
            os.unlink(files_patch)
        os.symlink(self.conf["location"] + self.config_vars["id"] + "/", files_patch)
        self.log.LOGI("Created default symlink")

    def _remove_certs(self):
        self.log.LOGI("Starting removing process " + sys._getframe().f_code.co_name)
        # remove the active configuration file

        files_patch = self.conf["location"] + self.config_vars["id"] + "/"
        if os.path.isdir(files_patch):
            try:
                if os.path.exists(files_patch):
                    # remove the directory with files
                    shutil.rmtree(files_patch)
                    return True
            except:
                self.log.LOGE("An error appeared while removing the certificate file " + files_patch)
                return False
        else:
            self.log.LOGI("Directory not found")
            return False

    def _reload_nginx(self):
        self.log.LOGI("Starting processing " + sys._getframe().f_code.co_name)

        # check if configuration is correct
        p = subprocess.Popen('/etc/init.d/revsw-nginx configtest', shell=True)
        p.communicate()

        if p.returncode != 0:
            self.log.LOGE("Nginx configuration has a problem!")
            run_cmd(
                "rm -Rf %s && tar -C / -xf %srevsw-ssl-cert.tar" % (self.conf['location'], self.conf['tmp_location']),
                self.log, "Restoring certificates directory")
            return p.returncode

        # nginx reload configuration if there are no errors
        p = subprocess.Popen('/etc/init.d/revsw-nginx reload', shell=True)
        p.communicate()

        return p.returncode

    def rollback(self):
        while self.rollbacks:
            self.rollbacks.pop()()

    def run(self, cmd_func, rollback_func=None):
        try:
            cmd_func()
            if rollback_func:
                self.rollbacks.append(rollback_func)
        except:
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
    if options.verbose_debug:
        args["verbose_debug"] = 1
    else:
        args["verbose_debug"] = 0

    conf_manager = ConfigSSL(args=args)
    if conf_manager.status:
        conf_manager._reload_nginx()
