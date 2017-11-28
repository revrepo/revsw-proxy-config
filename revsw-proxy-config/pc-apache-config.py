#!/usr/bin/env python
"""This script is used for the following purposes, usually started by the 
revsw-pcm-config:
    1. To parse the JSON configuration file from /opt/revsw-config/policy/.
        JSON file is in format "ui-config-<Domain name>.json".
    2. Adds, updates, deletes configuration files for nginx located in:
        1. /etc/nginx/sites-enabled/
        2. /etc/nginx/sites-availible/, and 
        3. /opt/revsw-config/apache/. 
        Reloads Nginx server if nessisary. 
    3. Adds, updates, deletes Varnish configuration for the following files
        and directories:
            1. /etc/varnish/revsw.vcl
            2. /opt/revsw-config/varnish/sites/
        Reloads Varnish if nessary 
"""
import argparse
import copy
import json
import os
import subprocess
import sys
import errno
import re
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "common"))

import script_configs
from revsw_apache_config import wildcard_to_regex, jinja_config_webserver_base_dir,\
                                jinja_config_webserver_dir, ConfigTransaction, \
                                dns_query, is_ipv4, ConfigException, PlatformWebServer, \
                                NginxConfig, underscore_url
from revsw_apache_config.varnishadmin import VarnishAdmin

from revsw.logger import RevSysLogger
from revsw_apache_config import revsw_config, configure_all, sorted_non_empty, \
                                set_log as acfg_set_log, VarnishConfig

varnish_admin = VarnishAdmin()


class ConfigCommon:
    """Common Configuration that checks if anything has changed with the server or varnish
    after loading a new configuration.

    Args and Attributes:
        webserver_config_vars (dict): Loaded JSON configuration file from NginxConfig.
            Object will change after running patch_config.
        varnish_config_vars (dict): Loaded JSON configuration file from VarnishConfig.
            Object will change after running patch_config.
        ui_config (dict): Loaded JSON configuration file from command line
            argument in main function call.


    """
    def __init__(self, webserver_config_vars, varnish_config_vars, ui_config):
        self.webserver_config_vars = webserver_config_vars
        self.varnish_config_vars = varnish_config_vars
        self.ui_config = ui_config
        self.ban_urls = set()
        # Private members
        self._must_ban_html = False
        self._config_changed = False
        self._varnish_changed = False
        self._parse_config_command_options()

    def _patch_if_changed_webserver_internal(self, webserver_cfg_field, enable_switch, option, val, ban_html_if_changed):
        # Patch the BP/CO/etc if present and allowed
        if not webserver_cfg_field in self.webserver_config_vars or (enable_switch and not self.cmd_opts[enable_switch]):
            return
        if self.webserver_config_vars[webserver_cfg_field].get(option) != val:
            self.webserver_config_vars[webserver_cfg_field][option] = val
            self._config_changed = True
            if ban_html_if_changed:
                self._must_ban_html = True

    def _parse_config_command_options(self):
        self.cmd_opts = {
            "http": True,
            "https": True,
            "ows-http-only": False,
            "ows-https-only": False,
            "spdy": True,
            "shards_count": 0,
            "config_bp": True,
            "config_co": True,
            "js_subst": False,
            "html_subst": False,
            "include_user_agent": False,
            "cache_ps_html": False,
            "cache_ignore_auth": False,
            "origin_secure_protocol": "use_end_user_protocol",
            "proxy_timeout": 5,
            "debug": False,
            "client_response_timeout": 600
        }

        for opt in self.ui_config.get("config_command_options", "").split():
            if opt == "disable-spdy":
                self.cmd_opts["spdy"] = False
            elif opt == "no-bp":
                self.cmd_opts["config_bp"] = False
            elif opt == "no-co":
                self.cmd_opts["config_co"] = False
            elif opt == "enable-js-substitute":
                self.cmd_opts["js_subst"] = True
            elif opt == "enable-html-substitute":
                self.cmd_opts["html_subst"] = True
            elif opt == "include-user-agent":
                self.cmd_opts["include_user_agent"] = True
            elif opt == "debug":
                self.cmd_opts["debug"] = True
            elif opt.startswith("shards-count="):
                self.cmd_opts["shards_count"] = int(opt[13:])
            elif opt == "cache-ps-html":
                self.cmd_opts["cache_ps_html"] = True
            elif opt == "cache-ignore-auth":
                self.cmd_opts["cache_ignore_auth"] = True
            elif opt == "origin_secure_protocol":
                self.cmd_opts["origin_secure_protocol"] = "use_end_user_protocol"
            elif opt.startswith("proxy-timeout="):
                self.cmd_opts["proxy_timeout"] = int(opt[14:])
            elif opt.startswith("client_response_timeout="):
                self.cmd_opts["client_response_timeout"] = int(opt[24:])
            # Don't use options
            elif opt.startswith("ows-http-only"):
                self.cmd_opts["ows-http-only"] = True
            elif opt.startswith("ows-https-only"):
                self.cmd_opts["ows-https-only"] = True
            elif opt == "http-only":
                self.cmd_opts["https"] = False
            elif opt == "https-only":
                self.cmd_opts["http"] = False
            else:
                fatal("Invalid config command option '%s'" % opt)

    def _add_ban_urls(self, ban_urls):
        self.ban_urls.update(ban_urls)

    def _patch_if_changed_bp_webserver(self, option, val, ban_html_if_changed=False):
        self._patch_if_changed_webserver_internal("bp", "config_bp", option, val, ban_html_if_changed)

    def _patch_if_changed_bp_varnish(self, option, val, ban_html_if_changed=False):
        if self.varnish_config_vars.get(option) != val:
            log.LOGI("Detected change for Varnish '%s'" % option)
            log.LOGD("From: ", json.dumps(self.varnish_config_vars.get(option)), "\r\nTo: ", json.dumps(val))
            self.varnish_config_vars[option] = val
            self._config_changed = True
            self._varnish_changed = True
            if ban_html_if_changed:
                self._must_ban_html = True

    def _patch_if_changed_co_webserver(self, option, val, ban_html_if_changed=False):
        self._patch_if_changed_webserver_internal("co", "config_co", option, val, ban_html_if_changed)

    def _patch_if_changed_co_profiles_webserver(self, option, val, ban_html_if_changed=False):
        self._patch_if_changed_webserver_internal("co_profiles", "config_co", option, val, ban_html_if_changed)

    def _patch_content_vars(self):
        co_component = self.ui_config["rev_component_co"]

        img_level = "none"
        js_level = "none"
        css_level = "none"

        def convert_choice(val):
            if val == "med":
                return "medium"
            return val

        enable_opt = co_component["enable_optimization"]
#        enable_decompression = co_component["enable_decompression"]
        profiles_count = 1

        if not enable_opt:
            opt_level = "none"
        elif co_component["mode"] == "least":
            opt_level = "min"
        elif co_component["mode"] == "moderate":
            opt_level = "med"
        elif co_component["mode"] == "aggressive":
            opt_level = "max"
        elif co_component["mode"] == "adaptive":
            opt_level = "adaptive"
            profiles_count = 4
        else:
            opt_level = "custom"
            img_level = convert_choice(co_component["img_choice"])
            js_level = convert_choice(co_component["js_choice"])
            css_level = convert_choice(co_component["css_choice"])

        self._patch_if_changed_co_profiles_webserver("REV_OPTIMIZATION_LEVEL", opt_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_IMG_LEVEL", img_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_JS_LEVEL", js_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_CSS_LEVEL", css_level)
        self._patch_if_changed_co_webserver("ENABLE_OPTIMIZATION", enable_opt)
        self._patch_if_changed_bp_webserver("REV_PROFILES_COUNT", profiles_count, True)
        self._patch_if_changed_co_webserver("REV_PROFILES_COUNT", profiles_count, True)

    def _patch_cache_vars(self):
        cache = self.ui_config["rev_component_bp"]

        self._patch_if_changed_bp_varnish("ENABLE_CACHE", cache["enable_cache"])
        self._patch_if_changed_bp_webserver("ENABLE_VARNISH", cache["enable_cache"])
        self._patch_if_changed_bp_varnish("INCLUDE_USER_AGENT", self.cmd_opts["include_user_agent"])
        self._patch_if_changed_bp_varnish("CACHE_PS_HTML", self.cmd_opts["cache_ps_html"])
        self._patch_if_changed_bp_varnish("CACHE_IGNORE_AUTH", self.cmd_opts["cache_ignore_auth"])
        self._patch_if_changed_bp_webserver("BYPASS_VARNISH_LOCATIONS", cache.get("cache_bypass_locations", []))

        # Check for caching rules mode (best or first)
        self._patch_if_changed_bp_varnish("CACHING_RULES_MODE", cache.get("caching_rules_mode", "best"))

        if "caching_rules" in cache:
            bans = _compute_ban_urls_from_caching_rules(self.varnish_config_vars.get("CACHING_RULES", {}),
                                                        cache["caching_rules"])
            self._add_ban_urls(bans)
            self._patch_if_changed_bp_varnish("CACHING_RULES", cache["caching_rules"])

        custom_vcl = {
            "backends": [],
            "recv": "",
            "hash": "",
            "pipe": "",
            "purge": "",
            "hit": "",
            "miss": "",
            "pass": "",
            "deliver": "",
            "synth": "",
            "backend_fetch": "",
            "backend_response": "",
            "backend_error": ""
        }
        custom_vcl_enabled = False
        if "custom_vcl" in cache:
            custom_vcl_enabled = cache["custom_vcl"]["enabled"]
            _merge_dicts(custom_vcl, cache["custom_vcl"])
            del custom_vcl["enabled"]

        self._patch_if_changed_bp_varnish("CUSTOM_VCL_ENABLED", custom_vcl_enabled)
        self._patch_if_changed_bp_varnish("CUSTOM_VCL", custom_vcl)

        geoip_headers = cache.get("enable_vcl_geoip_headers", False)
        self._patch_if_changed_bp_webserver("ENABLE_VARNISH_GEOIP_HEADERS", geoip_headers)
        self._patch_if_changed_bp_varnish("ENABLE_GEOIP_HEADERS", geoip_headers)

        self._patch_if_changed_bp_varnish("CLIENT_RESPONSE_TIMEOUT",
                                          cache.get("client_response_timeout",
                                                    self.cmd_opts["client_response_timeout"]))

        # BEGIN (BP-255)
        health_probe = {
            "HTTP_REQUEST": "",
            "HTTP_STATUS": 0,
            "PROBE_INTERVAL": 0,
            "PROBE_TIMEOUT": 0
        }
        enable_origin_health_probe = self.ui_config.get("enable_origin_health_probe", False)
        config_health_probe = self.ui_config.get("origin_health_probe", {"enable": False})
        log.LOGD("(BP-255) enable_origin_health_probe: %s" % enable_origin_health_probe)
        if enable_origin_health_probe:
            log.LOGI("(BP-255) config_health_probe:\t%s" % config_health_probe)
            health_probe = config_health_probe
            # health_probe["HTTP_REQUEST"] = [
            #     "%s %s HTTP/1.1" % (config_health_probe["method"], config_health_probe["url"]),
            # ] + ["%s: %s" % (header_pair[0], header_pair[1]) for header_pair in config_health_probe["headers"]]
            # health_probe["HTTP_STATUS"] = config_health_probe["expected_status"]
            # health_probe["PROBE_INTERVAL"] = config_health_probe["interval"]
            # health_probe["PROBE_TIMEOUT"] = config_health_probe["timeout"]

        self._patch_if_changed_bp_varnish("ENABLE_ORIGIN_HEALTH_PROBE", enable_origin_health_probe)
        self._patch_if_changed_bp_varnish("ORIGIN_HEALTH_PROBE", health_probe)
        # END (BP-255)

    def _patch_security_vars(self):
        component_bp = self.ui_config["rev_component_bp"]

        self._patch_if_changed_bp_webserver("ENABLE_WAF", component_bp.get("enable_waf", False))
        self._patch_if_changed_bp_webserver("WAF_RULES", component_bp.get("waf", []))
        self._patch_if_changed_bp_webserver("ENABLE_BOT_PROTECTION", component_bp.get("enable_bot_protection", False))
        self._patch_if_changed_bp_webserver("BOT_PROTECTION", component_bp.get("bot_protection", []))
        self._patch_if_changed_bp_webserver("BLOCK_CRAWLERS", component_bp.get("block_crawlers", True))

        self._patch_if_changed_bp_webserver("acl", component_bp.get("acl", {
            "enabled": False,
            "action": "allow_except",
            "acl_rules": []
        }))

        log.LOGD("Security parameters: %s" % component_bp)
        log.LOGD("ACL parameters: %s" % component_bp.get("acl"))
        log.LOGD("WAF parameters: %s" % component_bp.get("waf"))
        log.LOGD("BOT_PROTECTION rules: %s" % component_bp.get("bot_protection"))

    def _patch_ssl_vars(self):
        if "enable_ssl" in self.ui_config:
            self._patch_if_changed_bp_webserver("ENABLE_SSL", self.ui_config["enable_ssl"], False)
            self._patch_if_changed_bp_webserver("SSL_PROTOCOLS", self.ui_config["ssl_protocols"], "")
            self._patch_if_changed_bp_webserver("SSL_CIPHERS", self.ui_config["ssl_ciphers"], "")
            self._patch_if_changed_bp_webserver("SSL_PREFER_SERVER_CIPHERS", self.ui_config["ssl_prefer_server_ciphers"], True)
            self._patch_if_changed_bp_webserver("SSL_CERT_ID", self.ui_config["ssl_cert_id"], "")
        log.LOGD("Finished vars update in SSL")

    def _get_proxied_and_optimized_domains(self, cdn_urls):
        """
        Check the version number and handle appropriately due to change in
        variable names.
        """
        proxied_domains = cdn_urls
        optimized_domains = []

        old_version = False
        if _compare_versions(self.ui_config.get("version", "0.0.0"), revsw_config["_UI_CONFIG_VERSION"]) < 0 or \
                not "enable_3rd_party_runtime_rewrite" in self.ui_config.get("3rd_party_rewrite", {}):
            old_version = True

        if old_version:
            # Set sensible defaults for this option: obey "enable-js-substitute" command
            # and use the static servers list as the domains to rewrite
            third_party = self.ui_config.get("3rd_party_rewrite", {
                "enable_3rd_party_rewrite": self.cmd_opts["js_subst"],
                "3rd_party_urls": ",".join(proxied_domains)
            })

            if third_party["enable_3rd_party_rewrite"]:
                optimized_domains = [url.strip() for url in third_party["3rd_party_urls"].split(",")]
            optimized_domains += proxied_domains
            enable_rewr = third_party["enable_3rd_party_rewrite"]
        else:  # _UI_CONFIG_VERSION or newer
            third_party = self.ui_config.get("3rd_party_rewrite", {
                "enable_3rd_party_runtime_rewrite": self.cmd_opts["js_subst"],
                "3rd_party_runtime_domains": ",".join(proxied_domains),
                "enable_3rd_party_root_rewrite": False,
                "3rd_party_root_rewrite_domains": []
            })

            if third_party["enable_3rd_party_runtime_rewrite"]:
                optimized_domains = [url.strip() for url in third_party["3rd_party_runtime_domains"].split(",")]
            if third_party["enable_3rd_party_root_rewrite"]:
                proxied_domains += [url for url in third_party["3rd_party_root_rewrite_domains"].split(",")]
            optimized_domains += proxied_domains
            enable_rewr = third_party["enable_3rd_party_runtime_rewrite"]

        proxied_http_servers, proxied_https_servers = _convert_static_servers(proxied_domains)
        optimized_http_servers, optimized_https_servers = _convert_static_servers(optimized_domains)

        #_check_valid_domains(proxied_http_servers, "Proxied HTTP domain")
        #_check_valid_domains(proxied_https_servers, "Proxied HTTPS domain")
        #_check_valid_domains(optimized_http_servers, "Rewritten HTTP domain")
        #_check_valid_domains(optimized_https_servers, "Rewritten HTTPS domain")

        return (
            (proxied_http_servers, proxied_https_servers),
            (optimized_http_servers, optimized_https_servers),
            enable_rewr
        )

    def _patch_misc_vars(self):

        component_bp = self.ui_config["rev_component_bp"]
        component_co = self.ui_config["rev_component_co"]

        self._patch_if_changed_bp_webserver("BP_LUA_LOCATIONS", component_bp.get("lua", []))
        self._patch_if_changed_bp_webserver("CO_LUA_LOCATIONS", component_co.get("lua", []))

        log.LOGD("Start domain checking")
        ((http_servers, https_servers), (http_servers_rewr, https_servers_rewr), enable_rewr) = \
            self._get_proxied_and_optimized_domains(_get_cdn_overlay_urls(component_bp))
        log.LOGD("Finished domain checking")
        log.LOGD("Start vars update in misc")
        self._patch_if_changed_bp_webserver("DOMAINS_TO_PROXY_HTTP", http_servers, True)
        self._patch_if_changed_bp_webserver("DOMAINS_TO_PROXY_HTTPS", https_servers, True)
        self._patch_if_changed_bp_webserver("DOMAINS_TO_OPTIMIZE_HTTP", http_servers_rewr, True)
        self._patch_if_changed_bp_webserver("DOMAINS_TO_OPTIMIZE_HTTPS", https_servers_rewr, True)

        main_domain_name = self.webserver_config_vars["bp"]["SERVER_NAME"]
        ows_domain, ows_server = _get_ows_domain_and_server(main_domain_name, self.ui_config)
        self._patch_if_changed_bp_webserver("ORIGIN_SERVER_NAME", ows_domain)

        domain_widlcard_alias = self.ui_config.get("domain_wildcard_alias", "")
        domain_regex_alias = wildcard_to_regex(domain_widlcard_alias) if domain_widlcard_alias else ""
        self._patch_if_changed_bp_webserver("SERVER_REGEX_ALIAS", domain_regex_alias)
        self._patch_if_changed_bp_webserver("SERVER_ALIASES", self.ui_config.get("domain_aliases", []))

        self._patch_if_changed_bp_webserver("CUSTOM_WEBSERVER_CODE_BEFORE", component_bp.get("bp_apache_fe_custom_config", ""))
        self._patch_if_changed_bp_webserver("CUSTOM_WEBSERVER_CODE_AFTER", component_bp.get("bp_apache_custom_config", ""))
        self._patch_if_changed_bp_webserver("CUSTOM_WEBSERVER_CO_CODE_AFTER", component_co.get("co_apache_custom_config", ""))

        self._patch_if_changed_bp_webserver("ENABLE_HTTP", self.cmd_opts["http"])
        self._patch_if_changed_bp_webserver("ENABLE_HTTPS", self.cmd_opts["https"])
        self._patch_if_changed_bp_webserver("ENABLE_SPDY", self.cmd_opts["spdy"])
        self._patch_if_changed_bp_webserver("ENABLE_HTTP2", component_bp.get("enable_http2", True))
        self._patch_if_changed_bp_webserver("DOMAIN_SHARDS_COUNT", self.cmd_opts["shards_count"])

        self._patch_if_changed_bp_webserver("ENABLE_JS_SUBSTITUTE", enable_rewr)
        self._patch_if_changed_bp_webserver("ENABLE_HTML_SUBSTITUTE", enable_rewr and self.cmd_opts["html_subst"])

        self._patch_if_changed_bp_webserver("DEBUG_MODE", self.cmd_opts["debug"])
        self._patch_if_changed_bp_varnish("DEBUG_MODE", self.cmd_opts["debug"])

        self._patch_if_changed_bp_webserver("PROXY_TIMEOUT",
                                            self.ui_config.get("proxy_timeout", self.cmd_opts["proxy_timeout"]))
        self._patch_if_changed_bp_webserver("ORIGIN_IDLE_TIMEOUT", component_bp.get("origin_http_keepalive_ttl", 80))
        self._patch_if_changed_bp_webserver("ORIGIN_REUSE_CONNS", component_bp.get("origin_http_keepalive_enabled", True))

        self._patch_if_changed_bp_webserver("ENABLE_PROXY_BUFFERING", component_bp.get("enable_proxy_buffering", False))

        caching_rules = component_bp.get("caching_rules", [])
        responce_headers = []
        if caching_rules:
            for rule in caching_rules:
                for r in rule.get("end_user_response_headers", []):
                    responce_headers.append(r)

        self._patch_if_changed_bp_webserver("END_USER_RESPONSE_HEADERS", responce_headers)
        self._patch_if_changed_bp_webserver("ORIGIN_REQUEST_HEADERS", component_co.get("origin_request_headers", []))
        self._patch_if_changed_bp_webserver("ENABLE_QUIC", component_bp.get("enable_quic", False))

        self._patch_if_changed_bp_webserver("ENABLE_RUM", component_co.get("enable_rum"))
        self._patch_if_changed_bp_webserver("REV_RUM_BEACON_URL", component_co.get("rum_beacon_url"))

        self._patch_if_changed_bp_webserver("ENABLE_OPTIMIZATION", component_co.get("enable_optimization", True))
        self._patch_if_changed_bp_webserver("ENABLE_DECOMPRESSION", component_co.get("enable_decompression", True))

        origin_secure_protocol = self.ui_config.get("origin_secure_protocol", "")
        http = "http" if origin_secure_protocol != "https_only" else "https"
        https = "https" if origin_secure_protocol != "http_only" else "http"

        if self.cmd_opts["ows-http-only"]:
            https = "http"
        if self.cmd_opts["ows-https-only"]:
            http = "https"

        bp_cos = _get_content_optimizers(self.ui_config)
        if bp_cos:
            self._patch_if_changed_bp_webserver("CONTENT_OPTIMIZERS_HTTP", [] if not self.cmd_opts["http"]
                                                else ["%s://%s" % (http, co) for co in bp_cos])
            self._patch_if_changed_bp_webserver("CONTENT_OPTIMIZERS_HTTPS", [] if not self.cmd_opts["https"]
                                                else ["%s://%s" % (https, co) for co in bp_cos])

            self._patch_if_changed_bp_varnish("CONTENT_OPTIMIZERS_HTTP", [] if not self.cmd_opts["http"]
                                              else bp_cos)
            self._patch_if_changed_bp_varnish("CONTENT_OPTIMIZERS_HTTPS", [] if not self.cmd_opts["https"]
                                              else bp_cos)

        co_bypass_urls = component_bp.get("co_bypass_locations", [])
        self._patch_if_changed_bp_webserver("BYPASS_CO_LOCATIONS", co_bypass_urls)
        self._patch_if_changed_bp_varnish("BYPASS_CO_LOCATIONS", co_bypass_urls)


        _check_valid_domains([ows_server], "Origin server")

        self._patch_if_changed_bp_webserver("ORIGIN_SERVERS_HTTP", [] if not self.cmd_opts["http"]
                                            else ["%s://%s" % (http, ows_server)])
        self._patch_if_changed_bp_webserver("ORIGIN_SERVERS_HTTPS", [] if not self.cmd_opts["https"]
                                            else ["%s://%s" % (https, ows_server)])


        self._patch_if_changed_bp_webserver("ORIGIN_SECURE_PROTOCOL", origin_secure_protocol)


        log.LOGD("Finished vars update in misc")

    def can_config_bp(self):
        """Browser proxy"""
        return "bp" in self.webserver_config_vars and self.cmd_opts["config_bp"]

    def can_config_co(self):
        """Content optimization"""
        return "co" in self.webserver_config_vars and self.cmd_opts["config_co"]

    def config_changed(self):
        return self._config_changed

    def varnish_changed(self):
        return self._varnish_changed

    def must_ban_html(self):
        return self._must_ban_html

    def patch_config(self):
        log.LOGD("Run patch content vars")
        self._patch_content_vars()
        log.LOGD("Run patch cache vars")
        self._patch_cache_vars()
        log.LOGD("Run patch security vars")
        self._patch_security_vars()
        log.LOGD("Run patch misc vars")
        self._patch_misc_vars()
        log.LOGD("Run patch SSL vars")
        self._patch_ssl_vars()


def fatal(msg):
    log.LOGE(msg)
    sys.exit(1)


def _compatible_version(ver):
    try:
        [major, minor, _] = [int(x) for x in ver.split(".")]
        [good_major, good_minor, _] = [int(x) for x in revsw_config["_UI_CONFIG_VERSION"].split(".")]

        # Ignore micro version; it means the API is compatible
        return major < good_major or (major == good_major and minor <= good_minor)
    except:
        raise AttributeError("Invalid version string '%s'" % ver)


def _compare_versions(ver_a, ver_b):
    try:
        [a_major, a_minor, a_micro] = [int(x) for x in ver_a.split(".")]
        [b_major, b_minor, b_micro] = [int(x) for x in ver_b.split(".")]

        if a_major == b_major:
            if a_minor == b_minor:
                return a_micro - b_micro
            return a_minor - b_minor
        return a_major - b_major
    except:
        raise AttributeError("Invalid version string '%s' or '%s'" % (ver_a, ver_b))


def _check_proto_and_hostname(protocol_or_hostname):
    url_re = re.compile(
        r'^(https?://)?'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9_-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'$', re.IGNORECASE)
    if not url_re.search(protocol_or_hostname):
        fatal("'%s' is not a valid protocol and hostname URL." % protocol_or_hostname)


def _check_valid_domains(domains, var_name):
    for d in domains[:]:    # work on a copy of 'domains'
        if is_ipv4(d):
            continue
        try:
            dns_query(d)
        except LookupError:
            log.LOGW("%s address not valid (yet): %s" % (var_name, d))
            #domains.remove(d)   # this used to be a fatal error, but that breaks the whole config


def _convert_static_servers(servers):
    """
    Returns a pair of unique HTTP and HTTPS server hostnames from a list of protocol+hostname URLs
    """
    http_servers = set()
    https_servers = set()
    for s in sorted_non_empty(servers):
        _check_proto_and_hostname(s)
        if s.startswith("https://"):
            https_servers.add(s.replace("https://", ""))
        else:  # if no http:// prefix is present, it is implied
            http_servers.add(s.replace("http://", ""))
    return sorted(http_servers), sorted(https_servers)


def _compute_ban_urls_from_caching_rules(old, new):
    bans = []

    def urls_to_rules_dict(rules):
        urls_to_rules = {}
        for rule in rules:
            url_spec = rule["url"]
            url_ = url_spec["value"]
            if url_spec["is_wildcard"]:
                url_ = wildcard_to_regex(url_)
            rule_no_url = copy.copy(rule)
            del rule_no_url["url"]
            urls_to_rules[url_] = rule_no_url
        return urls_to_rules

    old_urls_to_rules = urls_to_rules_dict(old)
    new_urls_to_rules = urls_to_rules_dict(new)

    for url in set().union(old_urls_to_rules.keys(), new_urls_to_rules.keys()):
        if old_urls_to_rules.get(url) != new_urls_to_rules.get(url):
            bans.append(url)

    return bans


def _get_cdn_overlay_urls(bp):
    return bp["cdn_overlay_urls"] if bp.get("cache_opt_choice") != "Rev CDN" else []


def _get_content_optimizers(ui_config):
    cos = sorted_non_empty(ui_config.get("co_cnames")) or sorted_non_empty(ui_config.get("co_list"))

    # First check that the COs are valid addresses/domains.
    _check_valid_domains(cos, "Content optimizer")
    return cos


def _get_domain_mapping(domain_name):
    mapping = {}
    try:
        with open(revsw_config["site-mappings-filepath"]) as j:
            mappings = json.load(j)
        mapping = mappings.get(domain_name, {})
    except IOError as e:  # file doesn't exist
        if e.errno != errno.ENOENT:
            raise
    return mapping


def _get_ows_domain_and_server(domain_name, ui_config, mapping=None):
    if not mapping:
        mapping = _get_domain_mapping(domain_name)

    # If no mapping, use the actual domain name
    # This is a little backwards:
    # "origin_server" represents the Host header for the origin
    # "origin_domain" represents the address of the origin
    ows_domain_name = ui_config.get("origin_server")
    if not ows_domain_name:
        ows_domain_name = mapping.get("origin_domain", domain_name)
    ows_server = ui_config.get("origin_domain", ows_domain_name)

    return ows_domain_name, ows_server


def _gen_initial_domain_config(domain_name, ui_config):
    mapping = _get_domain_mapping(domain_name)
    ows_domain_name, ows_server = _get_ows_domain_and_server(domain_name, ui_config, mapping)


    # Let's see if we have a custom config for this domain
    config_str = ""

    try:
        with open("/opt/revsw-config/apache/custom-sites/%s/bp.json" % (domain_name)) as j:
            config_str = j.read()
    except IOError as e:  # file doesn't exist
        if e.errno != errno.ENOENT:
            raise

    # No custom config, generate from the generic site config and replace a magic string
    # with actual domain names
    if not config_str:
        with open( os.path.join(script_configs.APACHE_GENERIC_SITE, "bp.json")) as j:
            config_str = re.sub(r"ows-generic-domain\.1234", ows_domain_name, j.read())
            config_str = re.sub(r"ows-generic-domain_1234", underscore_url(ows_domain_name), config_str)
            config_str = re.sub(r"ows-generic-server\.1234", ows_server, config_str)
            config_str = re.sub(r"ows-generic-server_1234", underscore_url(ows_server), config_str)
            config_str = re.sub(r"generic-domain\.1234", domain_name, config_str)
            config_str = re.sub(r"generic-domain_1234", underscore_url(domain_name), config_str)

    config = json.loads(config_str)

    bp_cos = _get_content_optimizers(ui_config)
    if not bp_cos:
        bp_cos = mapping.get("optimizers")
    if bp_cos:
        for cmd in config["commands"]:
            if "varnish_config_vars" in cmd:
                cmd["varnish_config_vars"]["CONTENT_OPTIMIZERS_HTTP"] = bp_cos
                cmd["varnish_config_vars"]["CONTENT_OPTIMIZERS_HTTPS"] = bp_cos
            if "config_vars" in cmd and "bp" in cmd["config_vars"]:
                cmd["config_vars"]["bp"]["CONTENT_OPTIMIZERS_HTTP"] = ["http://%s" % co for co in bp_cos]
                cmd["config_vars"]["bp"]["CONTENT_OPTIMIZERS_HTTPS"] = ["https://%s" % co for co in bp_cos]

    return config


def delete_domain(domain_name):
    """Deletes domain

    Args:
        domain_name (str): Domain to be deleted"""
    log.LOGI("Deleting domain '%s'" % domain_name)

    configure_all({
        "version": revsw_config["API_VERSION"],
        "commands": [
            {
                "type": "delete",
                "site_name": underscore_url(domain_name),
                "domain_name": domain_name
            }
        ]
    })

    varnish_admin.ban('obj.http.X-Rev-Host == "%s"' % domain_name)
    log.LOGI("Deleted domain '%s'" % domain_name)


def add_or_update_domain(domain_name, ui_config, type):
    """Adds a new domain to the server or updates one if it already exists.

    Args:
        domain_name (str): Domain to add or update.
        ui_config (dict): JSON loaded from /opt/revsw-config/policy/ on server
        type (str): The different types you can have for your configure options.
            Some types are, "flush", "varnish_template", "mlogc_template", "delete",
            "batch", "force", "certs"
    """
    site_name = underscore_url(domain_name)
    nginx_config = NginxConfig(site_name)
    if not nginx_config.exists():
        log.LOGI("Adding domain '%s'" % domain_name)
        # Initial, default config
        config = _gen_initial_domain_config(domain_name, ui_config)
        config.update(dict(varnish_changed=False))
        config.update(dict(config_changed=False))
        config['commands'][0].update(dict(type=type))
        configure_all(config)
        log.LOGI("Added domain '%s'" % domain_name)

    log.LOGI("Updating domain '%s'" % domain_name)

    webserver_config_vars = nginx_config.load_input_vars()
    log.LOGD(u"Input JSON is: ", json.dumps(webserver_config_vars))

    try:
        log.LOGD(u"Start read Varnish Config")
        varnish_config_vars = VarnishConfig(site_name).load_site_config()
        log.LOGD(u"Finish read Varnish Config")
    except:
        log.LOGE("Couldn't load Varnish config for '%s' - ignoring" % site_name)

    log.LOGD(u"Start read Main Config")
    cfg_common = ConfigCommon(webserver_config_vars, varnish_config_vars, ui_config)
    log.LOGD(u"Finish read Main Config")

    log.LOGD(u"Start config patch")
    cfg_common.patch_config()
    log.LOGD(u"End config patch")

    log.LOGD(u"Updated JSON is: ", json.dumps(webserver_config_vars))
    #print json.dumps(varnish_config_vars)
    if cfg_common.config_changed() or cfg_common.varnish_changed:
        config = {
            "version": revsw_config["API_VERSION"],
            # TODO: rename type variable
            "type": type,
            "site_name": site_name,
            "config_vars": webserver_config_vars,
            "varnish_config_vars": varnish_config_vars,
        }

        # Apply patched config
        configure_all({
            "version": revsw_config["API_VERSION"],
            "commands": [config],
            "varnish_changed": cfg_common.varnish_changed(),
            "config_changed": cfg_common.config_changed()
        })

        # Ban Varnish URLs that match changed caching rules
        if cfg_common.ban_urls or cfg_common.must_ban_html():
            for url in cfg_common.ban_urls:
                log.LOGI("Banning URL '%s' on '%s'" % (url, domain_name))
                varnish_admin.ban('obj.http.X-Rev-Host == "%s" && obj.http.X-Rev-Url ~ "%s"' % (domain_name, url))
            if cfg_common.must_ban_html():
                log.LOGI("Banning HTML content '%s'" % domain_name)
                varnish_admin.ban('obj.http.X-Rev-Host == "%s" && obj.http.Content-Type == "text/html"' % domain_name)

    # Save UI config
    with open(os.path.join(jinja_config_webserver_dir(site_name), "ui-config.json"), "wt") as f:
        json.dump(ui_config, f, indent=2)

    log.LOGI("Updated domain '%s'" % domain_name)


def _merge_dicts(dst, src):
    if dst is None:
        return src

    if isinstance(dst, dict):
        # dicts must be merged
        if isinstance(src, dict):
            for key in src:
                if key in dst and isinstance(dst[key], dict):
                    _merge_dicts(dst[key], src[key])
                else:
                    dst[key] = src[key]
        else:
            raise AttributeError('Cannot merge non-dict "%s" into dict "%s"' % (src, dst))
    else:
        raise TypeError("Expected dict type instead of %s" % type(dst))

    return dst


def _diff_dicts(dst, src, dst_name, src_name):
    if not dst:
        if src:
            log.LOGD("Only in src: %s =" % src_name, src)
    else:
        if not src:
            log.LOGD("Only in dst: %s =" % dst_name, dst)
        else:
            if isinstance(dst, dict) and isinstance(src, dict):
                keys = set(src.keys()) | set(dst.keys())
                for key in keys:
                    _diff_dicts(dst.get(key), src.get(key), "%s.%s" % (dst_name, key), "%s.%s" % (src_name, key))
            else:
                if dst != src:
                    log.LOGD("Difference found:")
                    log.LOGD("    src: %s =" % src_name, src)
                    log.LOGD("    dst: %s =" % dst_name, dst)


def _upgrade_webserver_config(vars_, new_vars_for_version):
    """
    Upgrade Apache config vars up to the version(s) of the structures in 'new_vars_for_version'
    """
    if "bp" in vars_:
        bp = vars_["bp"]
        ver = bp.get("VERSION", 0)

        new_ver = new_vars_for_version["bp"].get("VERSION", 1)
        if new_ver > rev["_BP_CONFIG_VERSION"]:
            raise AttributeError("'bp' structure version is %d, which is newer than what pc-apache-config.py supports "
                                 "(%d). Upgrade your server packages." % (new_ver, revsw_config["_BP_CONFIG_VERSION"]))

        if ver <= 3 < new_ver:
            if "nss" in bp:
                del bp["nss"]

        if ver <= 4 < new_ver:
            bp["BLOCK_CRAWLERS"] = True

        if ver <= 5 < new_ver:
            bp["ENABLE_JS_SUBSTITUTE"] = False

        if ver <= 6 < new_ver:
            bp["DEBUG_MODE"] = False

        if ver <= 7 < new_ver:
            bp["ENABLE_HTML_SUBSTITUTE"] = False
            bp["DOMAINS_TO_OPTIMIZE_HTTP"] = bp["STATIC_CONTENT_SERVERS_HTTP"]
            bp["DOMAINS_TO_OPTIMIZE_HTTPS"] = bp["STATIC_CONTENT_SERVERS_HTTPS"]

        if ver <= 8 < new_ver:
            bp["BYPASS_VARNISH_LOCATIONS"] = []

        if ver <= 9 < new_ver:
            bp["CUSTOM_APACHE_CODE_BEFORE"] = ""

        if ver <= 10 < new_ver:
            bp["acl"] = {
                "enabled": False,
                "allow_all": False,
                "acl_rules": []
            }

        if ver <= 11 < new_ver:
            bp["acl"]["action"] = "allow_except" if bp["acl"]["allow_all"] else "deny_except"
            del bp["acl"]["allow_all"]

        if ver <= 12 < new_ver:
            bp["DOMAINS_TO_PROXY_HTTP"] = bp["STATIC_CONTENT_SERVERS_HTTP"]
            bp["DOMAINS_TO_PROXY_HTTPS"] = bp["STATIC_CONTENT_SERVERS_HTTPS"]
            del bp["STATIC_CONTENT_SERVERS_HTTP"]
            del bp["STATIC_CONTENT_SERVERS_HTTPS"]

        if ver <= 13 < new_ver:
            bp["PROXY_TIMEOUT"] = 5
            bp["ENABLE_SPDY"] = True

        if ver <= 14 < new_ver:
            bp["CONTENT_OPTIMIZER_SEND_RECV_TIMEOUT"] = 80

        if ver <= 15 < new_ver:
            del bp["CONTENT_OPTIMIZER_SEND_RECV_TIMEOUT"]

        if ver <= 16 < new_ver:
            bp["BYPASS_CO_LOCATIONS"] = []
            bp["ORIGIN_SERVERS_HTTP"] = []
            bp["ORIGIN_SERVERS_HTTPS"] = []
            bp["ORIGIN_IDLE_TIMEOUT"] = 80
            bp["ORIGIN_REUSE_CONNS"] = True

        if ver <= 17 < new_ver:
            bp["ENABLE_VARNISH_GEOIP_HEADERS"] = False

        if ver <= 18 < new_ver:
            bp["CUSTOM_WEBSERVER_CODE_BEFORE"] = bp["CUSTOM_APACHE_CODE_BEFORE"]
            bp["CUSTOM_WEBSERVER_CODE_AFTER"] = bp["CUSTOM_APACHE_CODE_AFTER"]
            del bp["CUSTOM_APACHE_CODE_BEFORE"]
            del bp["CUSTOM_APACHE_CODE_AFTER"]

        if ver <= 19 < new_ver:
            bp["ENABLE_PROXY_BUFFERING"] = False

        if ver <= 20 < new_ver:
            bp["SERVER_REGEX_ALIAS"] = ""

        if ver <= 21 < new_ver:
            bp["SERVER_ALIASES"] = []

        # (BP-92) BP
        if ver <= 22 < new_ver:
            bp["END_USER_RESPONSE_HEADERS"] = []

        if ver <= 23 < new_ver:
            bp["ENABLE_HTTP2"] = True
            bp["ENABLE_RUM"] = False
            bp["ORIGIN_REQUEST_HEADERS"] = [],
            bp["ENABLE_QUIC"] = False

        if ver <= 24 < new_ver:
            bp["ENABLE_SSL"] = True
            bp["SSL_PROTOCOLS"] = "TLSv1 TLSv1.1 TLSv1.2"
            bp["SSL_CIPHERS"] = "ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS"
            bp["SSL_PREFER_SERVER_CIPHERS"] = True
            bp["SSL_CERT_ID"] = ""

        if ver <= 25 < new_ver:
            # There is some configs with version 25
            pass

        if ver <= 26 < new_ver:
            bp["BP_LUA_LOCATIONS"] = []
            bp["CO_LUA_LOCATIONS"] = []

        if ver <= 27 < new_ver:
            bp["ENABLE_WAF"] = False
            bp["WAF_RULES"] = []

        if ver <= 28 < new_ver:
            bp["ENABLE_BOT_PROTECTION"] = False
            bp["BOT_PROTECTION"] = []

        bp["VERSION"] = new_ver

    if "co" in vars_:
        co = vars_["co"]
        ver = co.get("VERSION", 0)

        new_ver = new_vars_for_version["co"].get("VERSION", 1)
        if new_ver > revsw_config["_CO_CONFIG_VERSION"]:
            raise AttributeError("'co' structure version is %d, which is newer than what pc-apache-config.py supports "
                                 "(%d). Upgrade your server packages." % (new_ver, revsw_config["_CO_CONFIG_VERSION"]))

        if ver < 1:
            co["STATIC_CONTENT_SERVERS_HTTPS"] = []

        if ver <= 3 < new_ver:
            if "nss" in co:
                del co["nss"]

        if ver <= 4 < new_ver:
            co["ENABLE_JS_SUBSTITUTE"] = False

        if ver <= 5 < new_ver:
            co["DEBUG_MODE"] = False

        if ver <= 6 < new_ver:
            co["ENABLE_HTML_SUBSTITUTE"] = False
            co["DOMAINS_TO_OPTIMIZE_HTTP"] = co["STATIC_CONTENT_SERVERS_HTTP"]
            co["DOMAINS_TO_OPTIMIZE_HTTPS"] = co["STATIC_CONTENT_SERVERS_HTTPS"]

        if ver <= 7 < new_ver:
            co["DOMAINS_TO_PROXY_HTTP"] = co["STATIC_CONTENT_SERVERS_HTTP"]
            co["DOMAINS_TO_PROXY_HTTPS"] = co["STATIC_CONTENT_SERVERS_HTTPS"]
            del co["STATIC_CONTENT_SERVERS_HTTP"]
            del co["STATIC_CONTENT_SERVERS_HTTPS"]

        if ver <= 8 < new_ver:
            co["PROXY_TIMEOUT"] = 5

        if ver <= 9 < new_ver:
            co["ORIGIN_SEND_RECV_TIMEOUT"] = 80

        if ver <= 10 < new_ver:
            co["ORIGIN_IDLE_TIMEOUT"] = co["ORIGIN_SEND_RECV_TIMEOUT"]
            del co["ORIGIN_SEND_RECV_TIMEOUT"]
            co["ORIGIN_REUSE_CONNS"] = True

        if ver <= 11 < new_ver:
            co["CUSTOM_WEBSERVER_CODE_AFTER"] = co["CUSTOM_APACHE_CODE_AFTER"]
            del co["CUSTOM_APACHE_CODE_AFTER"]

        if ver <= 12 < new_ver:
            co["ENABLE_PROXY_BUFFERING"] = False

        # (BP-92) CO
        if ver <= 14 < new_ver:
            co["ORIGIN_REQUEST_HEADERS"] = []

        if ver <= 15 < new_ver:
            co["ENABLE_DECOMPRESSION"] = False

        co["VERSION"] = new_ver

    if "co_profiles" in vars_:
        co_profiles = vars_["co_profiles"]
        ver = co_profiles.setdefault("VERSION", 1)

        new_ver = new_vars_for_version["co_profiles"].get("VERSION", 1)
        if new_ver > revsw_config["_CO_PROFILES_CONFIG_VERSION"]:
            raise AttributeError("'co_profiles' structure version is %d, which is newer than what pc-apache-config.py "
                                 "supports (%d). Upgrade your server packages." %
                                 (new_ver, revsw_config["_CO_PROFILES_CONFIG_VERSION"]))

        if ver == 1 and new_ver > 1:  # Upgrade 1 to 2
            if "REV_CUSTOM_IMG_LEVEL" in co_profiles:
                if co_profiles["REV_CUSTOM_IMG_LEVEL"] == "med":
                    co_profiles["REV_CUSTOM_IMG_LEVEL"] = "medium"
            if "REV_CUSTOM_JS_LEVEL" in co_profiles:
                if co_profiles["REV_CUSTOM_JS_LEVEL"] == "med":
                    co_profiles["REV_CUSTOM_JS_LEVEL"] = "medium"
            if "REV_CUSTOM_CSS_LEVEL" in co_profiles:
                if co_profiles["REV_CUSTOM_CSS_LEVEL"] == "med":
                    co_profiles["REV_CUSTOM_CSS_LEVEL"] = "medium"

        co_profiles["VERSION"] = new_ver


def _upgrade_varnish_site_config(vars_, new_vars_for_version):
    """Upgrade Varnish site config vars up to the version of the structure in
    'new_vars_for_version'
    """
    ver = vars_.setdefault("VERSION", 1)

    new_ver = new_vars_for_version.get("VERSION", 1)
    if new_ver > revsw_config["_VARNISH_CONFIG_VERSION"]:
        raise AttributeError("Varnish site structure version is %d, which is newer than what pc-apache-config.py "
                             "supports (%d). Upgrade your server packages." % (new_ver, revsw_config["_VARNISH_CONFIG_VERSION"]))

    if ver == 2 and new_ver > 2:  # Upgrade 2 to 3
        # Convert URLS_REMOVE_COOKIES_REGEX into CACHING_RULES
        caching_rules = []
        for ign_cookie in vars_["URLS_REMOVE_COOKIES_REGEX"]:
            remove_cookies_rule = {
                "version": 2,
                "url": {
                    "is_wildcard": False,
                    "value": ign_cookie
                },
                "edge_caching": {
                    "override_origin": False,
                    "override_no_cc": False,
                    "new_ttl": 0,
                    "query_string_keep_or_remove_list": [],
                    "query_string_list_is_keep": False
                },
                "browser_caching": {
                    "override_edge": False,
                    "new_ttl": 0,
                    "force_revalidate": False
                },
                "cookies": {
                    "override": True,
                    "ignore_all": True,
                    "keep_or_ignore_list": [],
                    "list_is_keep": False,
                    "remove_ignored_from_request": True,
                    "remove_ignored_from_response": True
                }
            }
            caching_rules.append(remove_cookies_rule)

        vars_["CACHING_RULES"] = caching_rules

    if ver <= 3 < new_ver:
        vars_["DEBUG_MODE"] = False

    if ver <= 4 < new_ver:
        vars_["INCLUDE_USER_AGENT"] = False

    if ver <= 5 < new_ver:
        vars_["CACHE_PS_HTML"] = False

    if ver <= 6 < new_ver:
        vars_["DOMAINS_TO_PROXY_HTTP"] = vars_.get("STATIC_CONTENT_SERVERS_HTTP", [])
        vars_.pop("STATIC_CONTENT_SERVERS_HTTP", None)

    # Set caching rules mode to default ("best"), if version < 8
    if ver <= 7 < new_ver:
        vars_["CACHING_RULES_MODE"] = "best"

    # Add the default Cache Auth behavior
    if ver <= 8 < new_ver:
        vars_["CACHE_IGNORE_AUTH"] = False

    if ver <= 9 < new_ver:
        vars_["BYPASS_CO_LOCATIONS"] = []

    if ver <= 10 < new_ver:
        custom_vcl = {
            "backends": [],
            "recv": "",
            "hash": "",
            "pipe": "",
            "purge": "",
            "hit": "",
            "miss": "",
            "pass": "",
            "deliver": "",
            "synth": "",
            "backend_fetch": "",
            "backend_response": "",
            "backend_error": ""
        }
        vars_["CUSTOM_VCL_ENABLED"] = False
        vars_["CUSTOM_VCL"] = custom_vcl

    if ver <= 11 < new_ver:
        vars_["ENABLE_GEOIP_HEADERS"] = False

    if ver <= 12 < new_ver:
        vars_["CLIENT_RESPONSE_TIMEOUT"] = 600

    if ver <= 13 < new_ver:
        vars_["ENABLE_ORIGIN_HEALTH_PROBE"] = False
        vars_["ORIGIN_HEALTH_PROBE"] = {
            "HTTP_REQUEST": "",
            "HTTP_STATUS": 0,
            "PROBE_INTERVAL": 0,
            "PROBE_TIMEOUT": 0
        }

    if ver <= 16 < new_ver:
        # Update caching rules with ESI support option
        for caching_rule in vars_["CACHING_RULES"]:
            if "enable_esi" not in caching_rule:
                caching_rule["enable_esi"] = False

    if ver <= 17 < new_ver:
        for caching_rule in vars_["CACHING_RULES"]:
            if "serve_stale" not in caching_rule:
                caching_rule["serve_stale"] = {
                  "enable": False,
                  "while_fetching_ttl": 8,
                  "origin_sick_ttl": 15
                }
            if "query_string_keep_or_remove_list" not in caching_rule["edge_caching"]:
                caching_rule["edge_caching"]["query_string_keep_or_remove_list"] = []

    if "URLS_REMOVE_COOKIES_REGEX" in vars_:
        del vars_["URLS_REMOVE_COOKIES_REGEX"]
    if "CACHE_MAX_TIME_SEC" in vars_:
        del vars_["CACHE_MAX_TIME_SEC"]

    vars_["VERSION"] = new_ver


def _upgrade_domain_config(domain_name):
    log.LOGI("Computing config upgrade for domain '%s'" % domain_name)

    site_name = underscore_url(domain_name)

    # We need the UI-provided config for this site.
    # We'll look for it in these places, in order:
    # - the site config dir
    # - the global config dir, with site-specific extension
    # - the global config dir, ui-config.json
    cfg_files = [
        os.path.join(jinja_config_webserver_dir(site_name), "ui-config.json"),
        os.path.join(jinja_config_webserver_base_dir(), "ui-config-%s.json" % domain_name),
        os.path.join(jinja_config_webserver_base_dir(), "ui-config.json")
    ]
    ui_config = {}
    for cfg_fname in cfg_files:
        try:
            # Load config specified by UI
            with open(cfg_fname) as f:
                ui_config = json.load(f)

            if ui_config.get("domain_name") == domain_name:
                # Found it
                log.LOGI("Loaded UI config for upgrade from '%s'" % cfg_fname)
                break
            else:
                # Don't use a UI config from a different site
                ui_config = {}
        except IOError:  # Ignore missing ui_config
            ui_config = {}

    # Generate an initial config, extract the "config" command and patch it with the old one
    init_config = _gen_initial_domain_config(domain_name, ui_config)

    new_config = {}
    for cmd in init_config["commands"]:
        if cmd["type"] == "config":
            new_config = cmd
            break
    if not new_config:
        raise AssertionError("No 'config' command in initial site configuration")

    new_webserver_config_vars = new_config["config_vars"]
    new_varnish_config_vars = new_config.get("varnish_config_vars")

    acfg = PlatformWebServer().config_class()(site_name)
    old_webserver_config_vars = acfg.load_input_vars()

    if new_varnish_config_vars:
        old_varnish_config_vars = {}
        # noinspection PyBroadException
        try:
            old_varnish_config_vars = VarnishConfig(site_name).load_site_config()
        except:
            log.LOGE("Couldn't load Varnish config for '%s' - ignoring" % site_name)
    else:
        old_varnish_config_vars = None

    _diff_dicts(new_webserver_config_vars, old_webserver_config_vars, "new_webserver_config", "old_webserver_config")

    # First convert the old config to the new config format, then patch the new config with the old values
    _upgrade_webserver_config(old_webserver_config_vars, new_webserver_config_vars)
    new_webserver_config_vars = _merge_dicts(new_webserver_config_vars, old_webserver_config_vars)
    # print "New Apache config:", json.dumps(new_webserver_config_vars, indent=2)

    if new_varnish_config_vars:
        _diff_dicts(new_varnish_config_vars, old_varnish_config_vars, "new_varnish_config", "old_varnish_config")

        _upgrade_varnish_site_config(old_varnish_config_vars, new_varnish_config_vars)
        new_varnish_config_vars = _merge_dicts(new_varnish_config_vars, old_varnish_config_vars)
    else:
        new_varnish_config_vars = None

    # If ui-config is present, we can simply use the freshly generated config, because it has all the information
    # we need.
    # If ui-config is NOT present, then we have to patch the new config with values from it.
    if ui_config:
        cfg_common = ConfigCommon(new_webserver_config_vars, new_varnish_config_vars, ui_config)
        cfg_common.patch_config()

    # Apply the patched configuration
    config = new_config
    config["version"] = revsw_config["API_VERSION"]
    config["config_vars"] = new_webserver_config_vars
    config["varnish_config_vars"] = new_varnish_config_vars

    log.LOGI("Computed config upgrade for domain '%s'" % domain_name)
    return config


def upgrade_all_domains():
    """Changes the schemas of all the domain configurations to the
    latest version."""
    log.LOGI("Upgrading all active domains")

    active_domains = PlatformWebServer().config_class().get_all_active_domains()

    # We first disable all Apache, then add them back one at a time, to know for certain which one is breaking
    # the config. We'll leave that one disabled.
    transaction = ConfigTransaction()
    acfg = PlatformWebServer().config_class()('*', transaction)
    acfg.disable_all_sites()

    cmds = []
    fail_msg = None
    fail_domains = set()
    domain_name = None
    try:
        for domain_name in active_domains:
            cmd = _upgrade_domain_config(domain_name)
            log.LOGD("Upgrade command for '%s':" % domain_name, json.dumps(cmd, indent=2))
            cmds.append(cmd)

        # Apply patched config
        configure_all({
            "version": revsw_config["API_VERSION"],
            "commands": cmds,
            "varnish_changed": True,
            "config_changed": True
        })
    except ConfigException as ce:
        fail_domains = ce.error_domains
        fail_msg = ce.message
        traceback.print_exc()
    except Exception as e:
        fail_msg = e.message
        fail_domains.add(domain_name)
        traceback.print_exc()

    if fail_msg:
        transaction.rollback()
        log.LOGE("Failures during upgrade: %s" % fail_msg)
        for f in fail_domains:
            log.LOGE("  -> Domain '%s'" % f)
        raise RuntimeError("Failed to upgrade domain(s): %s" % ", ".join([f for f in fail_domains]))
    else:
        transaction.finalize()
        log.LOGI("Upgraded all active domains")


def _main():
    global log

    parser = argparse.ArgumentParser(description="Configure Apache and Varnish from Policy Controller.",
                                     formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("-f", "--config-file", help="JSON file containing configuration",
                        default=os.path.join(jinja_config_webserver_base_dir(), "ui-config.json"))
    parser.add_argument("-U", "--upgrade", help="Upgrade all existing sites using after a generic site template update",
                        action="store_true")
    parser.add_argument("-v", "--verbose", help="Verbose logging", action="store_true")
    args = parser.parse_args()

    log = RevSysLogger(args.verbose)
    acfg_set_log(log)

    try:
        if args.upgrade:
            upgrade_all_domains()
        else:
            # Load config specified by UI
            with open(args.config_file) as f:
                _ui_config = json.load(f)

            ver = _ui_config.get("version", "0.0.0")
            if not _compatible_version(ver):
                raise AttributeError("Provided JSON config version '%s' is not compatible with current version '%s'" %
                                     (ver, revsw_config["_UI_CONFIG_VERSION"]))

            # Interpret content
            domain_name = _ui_config["domain_name"]

            if _ui_config["operation"] == "update":
                add_or_update_domain(domain_name, _ui_config, "config")
            elif _ui_config["operation"] == "update-batch":
                add_or_update_domain(domain_name, _ui_config, "batch")
            elif _ui_config["operation"] == "update-force":
                add_or_update_domain(domain_name, _ui_config, "force")
            elif _ui_config["operation"] == "delete":
                delete_domain(domain_name)
            else:
                raise AttributeError("Invalid operation '%s'" % _ui_config["operation"])

    except Exception as e:
        print "========================================================================================================"
        log.LOGE(str(e))
        # raise
        sys.exit(-1)


if __name__ == "__main__":
    # Main function
    _main()