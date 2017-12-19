#!/usr/bin/env python
import argparse
import json
import itertools
import os
import sys
import traceback
from cStringIO import StringIO

from script_configs import CONFIG_PATH, API_VERSION
from revsw.logger import RevStdLogger
from revsw.misc import file_to_gzip_base64_string
from revsw.tls import RevTLSCredentials, RevTLSClient
from revsw_apache_config import set_log as apache_cfg_set_log, \
    VarnishConfig, PlatformWebServer, \
    WebServerConfig, NginxConfig

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "common"))
sys.path.insert(0, os.path.realpath(
    os.path.join(os.path.dirname(__file__), ".")))


def main():
    parser = argparse.ArgumentParser(description="Configure Apache and Varnish.",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    actions = parser.add_subparsers(title="Subcommands",
                                    dest="command")
    start = actions.add_parser("start",
                               help="Starts a configuration from scratch")
    start.add_argument("-I", "--include-dir",
                       help="Configuration template search directory, for 'include' and 'import'",
                       action="append",
                       default=[])
    start.add_argument("-c", "--customer-id",
                       help="Customer database ID",
                       default=1)
    start.add_argument("-v", "--verbose",
                       help="Verbose output",
                       action="store_true")
    start.add_argument("-s", "--simulate",
                       help="Simulate configuration, but don't actually configure",
                       action="store_true")
    start.add_argument("server_addr",
                       help="Address of server to configure")
    flush_sites = actions.add_parser("flush_sites",
                                     help="Remove all configured sites on the server")
    flush_sites.add_argument("-I", "--include-dir",
                             help="Configuration template search directory, for 'include' and 'import'",
                             action="append", default=[])
    add_mod = actions.add_parser("config",
                                 help="Configure site, adding it if necessary")
    add_mod.add_argument("-I", "--include-dir",
                         help="Configuration template search directory, for 'include' and 'import'",
                         action="append", default=[])
    add_mod.add_argument("-V", "--varnish-vars",
                         help="Use Varnish cache and configure it using this JSON template variables file",
                         default=None)
    add_mod.add_argument("site_name_config",
                         help="Unique identifier for site specified in template")
    add_mod.add_argument("template_file",
                         help="Configuration template, without extension. The files <template>.jinja"
                              " and <template>.vars.schema must exist",
                         default="main")
    add_mod.add_argument("vars_file",
                         help="Input JSON template variables file")
    delete = actions.add_parser("del",
                                help="Delete site")
    delete.add_argument("site_name_del",
                        help="Unique identifier of site to delete")
    delete.add_argument("-I", "--include-dir",
                        help="Configuration template search directory, for 'include' and 'import'",
                        action="append", default=[])
    certs = actions.add_parser("certs",
                               help="Send site certificates")
    certs.add_argument("site_name_certs",
                       help="Unique identifier of site for which certificates are provided")
    certs.add_argument("certs_dir",
                       help="Directory containing cert8.db, key3.db and secmod.db for the site")
    certs.add_argument("-I", "--include-dir",
                       help="Configuration template search directory, for 'include' and 'import'",
                       action="append", default=[])
    varnish_template = actions.add_parser("varnish_template",
                                          help="Upload Varnish configuration template")
    varnish_template.add_argument("-I", "--include-dir",
                                  help="Configuration template search directory, for 'include' and 'import'",
                                  action="append", default=[])
    send = actions.add_parser("send",
                              help="Send the generated configuration to the server")
    send.add_argument("-I", "--include-dir",
                      help="Configuration template search directory, for 'include' and 'import'",
                      action="append", default=[])
    copy = actions.add_parser("copy",
                              help="Copy the generated configuration to the specified file")
    copy.add_argument("copy_file_name",
                      help="File to copy to")
    copy.add_argument("-I", "--include-dir",
                      help="Configuration template search directory, for 'include' and 'import'",
                      action="append", default=[])

    args = parser.parse_args()

    if "include_dir" in vars(args) and vars(args)["include_dir"] != []:
        TMP_PATH = vars(args)["include_dir"][0]
    else:
        from script_configs import TMP_PATH

    global log

    try:
        class Actions:
            START = 1
            FLUSH_SITES = 2
            CONFIG = 3
            DELETE = 4
            CERTS = 5
            VARNISH_TEMPLATE = 6
            SEND = 7
            COPY = 8

        if args.command == "start":
            action = Actions.START
        elif args.command == "flush_sites":
            action = Actions.FLUSH_SITES
        elif args.command == "del":
            action = Actions.DELETE
        elif args.command == "certs":
            action = Actions.CERTS
        elif args.command == "config":
            action = Actions.CONFIG
        elif args.command == "varnish_template":
            action = Actions.VARNISH_TEMPLATE
        elif args.command == "send":
            action = Actions.SEND
        elif args.command == "copy":
            action = Actions.COPY
        else:
            raise AttributeError("Unknown command line action")

        if action == Actions.START:
            log = RevStdLogger(args.verbose)
            log.LOGI("Starting new configuration for server '%s'" %
                     args.server_addr)
            with open("%sapache-config.conf" % TMP_PATH, "w") as c:
                json.dump(vars(args), c)
            with open("%sapache-config.json" % TMP_PATH, "w") as j:
                j.write('{"type": "apache", "version": %d, "commands": []}' %
                        API_VERSION)
            sys.exit(0)

        with open("%sapache-config.conf" % TMP_PATH) as c:
            global_cfg = json.load(c)

        with open("%sapache-config.json" % TMP_PATH) as j:
            global_json = json.load(j)

        log = RevStdLogger(global_cfg["verbose"])
        apache_cfg_set_log(log)

        # Send current config and exit
        if action == Actions.SEND:
            log.LOGD("Sending configuration to '%s'" % global_cfg["server_addr"])

            data = StringIO()
            json.dump(global_json, data)

            # Send config to server
            creds_path = CONFIG_PATH

            tls_creds = RevTLSCredentials("%s/clicert.pem" % creds_path,
                                          "%s/clikey.pem" % creds_path,
                                          "alabala",
                                          "%s/srvcert.pem" % creds_path)

            if not global_cfg["simulate"]:
                c = RevTLSClient((global_cfg["server_addr"], 16002), tls_creds)
                c.sendall(data.getvalue())
                rsp = c.recvall()
                print "Response: %s" % rsp

            data.close()
            sys.exit(0)

        if action == Actions.COPY:
            log.LOGD("Copying configuration to '%s'" % args.copy_file_name)

            with open(args.copy_file_name, "w") as j:
                json.dump(global_json, j, indent=2)

            sys.exit(0)

        # Main processing
        if action == Actions.FLUSH_SITES:
            log.LOGD("Removing all sites")
            config = {
                "type": "flush"
            }

        elif action == Actions.VARNISH_TEMPLATE:
            log.LOGD("Saving Varnish config template")

            search_dirs = ["."] + \
                [TMP_PATH] + \
                [os.path.join(os.path.dirname(__file__), "templates/all/bp"),
                 "/opt/revsw-config/templates/all/bp"]
            config = {
                "type": "varnish_template",
                "templates": VarnishConfig().gather_template_files(search_dirs)
            }

        elif action == Actions.CONFIG:    # also add
            log.LOGD("Regenerate web server config for site '%s'" % args.site_name_config)

            search_dirs_base = ["."] + [TMP_PATH] + \
                               [os.path.join(os.path.dirname(__file__), "templates"),
                                "/opt/revsw-config/templates"]

            templates = {}

            sub_dirs = ("all", "nginx")
            search_dirs = [os.path.join(base, subdir) for (base, subdir) in
                           itertools.product(search_dirs_base, sub_dirs)]

            log.LOGD("Search dirs:", search_dirs)

            with open(args.vars_file) as f:
                config_vars = json.load(f)

            NginxConfig(args.site_name_config)
            templates["nginx"] = WebServerConfig.gather_template_files(
                args.template_file, search_dirs)

            config = {
                "type": "config",
                "site_name": args.site_name_config,
                "templates": templates,
                "config_vars": config_vars
            }

            if args.varnish_vars:
                log.LOGD("Reading Varnish config from '%s'" %
                         args.varnish_vars)
                with open(args.varnish_vars) as f:
                    config["varnish_config_vars"] = json.load(f)

        elif action == Actions.DELETE:
            log.LOGD("Delete site '%s'" % args.site_name_del)

            PlatformWebServer().config_class()(args.site_name_del)
            config = {
                "type": "delete",
                "site_name": args.site_name_del
            }

        elif action == Actions.CERTS:
            log.LOGD("Configure certificates for site '%s'" % args.site_name_certs)

            PlatformWebServer().config_class()(args.site_name_certs)
            config = {
                "type": "certs",
                "site_name": args.site_name_certs
            }

            certs = {}

            certs["crt"] = file_to_gzip_base64_string(
                "%s/server.crt" % args.certs_dir)
            certs["key"] = file_to_gzip_base64_string(
                "%s/server.key" % args.certs_dir)
            certs["ca-bundle"] = file_to_gzip_base64_string(
                "%s/ca-bundle.crt" % args.certs_dir)

            config["certs"] = certs

        # Add new command
        global_json["commands"].append(config)
        with open("%sapache-config.json" % TMP_PATH, "w") as j:
            json.dump(global_json, j, indent=2)

    except Exception as e:
        traceback.print_exc()
        log.LOGE(e)
        sys.exit(1)


if __name__ == "__main__":
    main()
