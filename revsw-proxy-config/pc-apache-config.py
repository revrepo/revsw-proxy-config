#!/usr/bin/env python
import argparse
import copy
import json
import os
import sys
import errno
import re
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "common"))

from revsw_apache_config import wildcard_to_regex, jinja_config_webserver_base_dir, jinja_config_webserver_dir, \
    ConfigTransaction, dns_query, is_ipv4, ConfigException, PlatformWebServer
from revsw_apache_config.varnishadmin import VarnishAdmin

from revsw.logger import RevSysLogger
from revsw_apache_config import API_VERSION, configure_all, set_log as acfg_set_log, VarnishConfig, \
    sorted_non_empty

_UI_CONFIG_VERSION = "1.0.6"
_PROXY_CONFIG_VERSION = 1
_CO_PROFILES_CONFIG_VERSION = 2
_VARNISH_CONFIG_VERSION = 15


class ConfigCommon:
    def __init__(self, webserver_config_vars, varnish_config_vars, ui_config):
        self.webserver_config_vars = webserver_config_vars
        self.varnish_config_vars = varnish_config_vars
        self.ui_config = ui_config
        self.ban_urls = set()

        # Private members
        self._must_ban_html = False
        self._config_changed = False

        self._parse_config_command_options()

    def _patch_if_changed_webserver_internal(self, webserver_cfg_field, enable_switch, option, val, ban_html_if_changed):
        if not webserver_cfg_field in self.webserver_config_vars or (enable_switch and not self.cmd_opts[enable_switch]):
            return
        if self.webserver_config_vars[webserver_cfg_field].get(option) != val:
            self.webserver_config_vars[webserver_cfg_field][option] = val
            self._config_changed = True
            if ban_html_if_changed:
                self._must_ban_html = True

    def _parse_config_command_options(self):
        self.cmd_opts = {
            "ows_http": True,
            "ows_https": True,
            "http": True,
            "https": True,
            "spdy": True,
            "shards_count": 0,
            "config": True,
            "js_subst": False,
            "html_subst": False,
            "include_user_agent": False,
            "cache_ps_html": False,
            "cache_ignore_auth": False,
            "proxy_timeout": 5,
            "debug": False,
            "client_response_timeout": 600
        }

        for opt in self.ui_config.get("config_command_options", "").split():
            if opt == "ows-http-only":
                self.cmd_opts["ows_https"] = False
            elif opt == "ows-https-only":
                self.cmd_opts["ows_http"] = False
            elif opt == "http-only":
                self.cmd_opts["https"] = False
            elif opt == "https-only":
                self.cmd_opts["http"] = False
            elif opt == "disable-spdy":
                self.cmd_opts["spdy"] = False
            elif opt == "enable-js-substitute":
                self.cmd_opts["js_subst"] = True
            elif opt == "enable-html-substitute":
                self.cmd_opts["html_subst"] = True
            elif opt == "include-user-agent":
                self.cmd_opts["include_user_agent"] = True
            elif opt == "no-bp":
                self.cmd_opts["config_bp"] = True
            elif opt == "no-co":
                self.cmd_opts["config_co"] = True
            elif opt == "debug":
                self.cmd_opts["debug"] = True
            elif opt.startswith("shards-count="):
                self.cmd_opts["shards_count"] = int(opt[13:])
            elif opt == "cache-ps-html":
                self.cmd_opts["cache_ps_html"] = True
            elif opt == "cache-ignore-auth":
                self.cmd_opts["cache_ignore_auth"] = True
            elif opt.startswith("proxy-timeout="):
                self.cmd_opts["proxy_timeout"] = int(opt[14:])
            elif opt.startswith("client_response_timeout="):
                self.cmd_opts["client_response_timeout"] = int(opt[24:])
            else:
                fatal("Invalid config command option '%s'" % opt)

    def _add_ban_urls(self, ban_urls):
        self.ban_urls.update(ban_urls)

    def _patch_if_changed_webserver(self, option, val, ban_html_if_changed=False):
        self._patch_if_changed_webserver_internal("proxy", "config", option, val, ban_html_if_changed)

    def _patch_if_changed_varnish(self, option, val, ban_html_if_changed=False):
        if self.varnish_config_vars.get(option) != val:
            log.LOGI("Detected change for Varnish '%s'" % option)
            self.varnish_config_vars[option] = val
            self._config_changed = True
            if ban_html_if_changed:
                self._must_ban_html = True

    def _patch_if_changed_co_profiles_webserver(self, option, val, ban_html_if_changed=False):
        self._patch_if_changed_webserver_internal("co_profiles", "config", option, val, ban_html_if_changed)

    def _patch_content_vars(self):
        content = self.ui_config["rev_component_co"]

        img_level = "none"
        js_level = "none"
        css_level = "none"

        def convert_choice(val):
            if val == "med":
                return "medium"
            return val

        enable_opt = content["enable_optimization"]
        # enable_decompression = content["enable_decompression"]
        profiles_count = 1

        if not enable_opt:
            opt_level = "none"
        elif content["mode"] == "least":
            opt_level = "min"
        elif content["mode"] == "moderate":
            opt_level = "med"
        elif content["mode"] == "aggressive":
            opt_level = "max"
        elif content["mode"] == "adaptive":
            opt_level = "adaptive"
            profiles_count = 4
        else:
            opt_level = "custom"
            img_level = convert_choice(content["img_choice"])
            js_level = convert_choice(content["js_choice"])
            css_level = convert_choice(content["css_choice"])

        rum_beacon = str(content["rum_beacon_url"]) if content.get("enable_rum", True) else ""

        self._patch_if_changed_co_profiles_webserver("REV_OPTIMIZATION_LEVEL", opt_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_IMG_LEVEL", img_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_JS_LEVEL", js_level)
        self._patch_if_changed_co_profiles_webserver("REV_CUSTOM_CSS_LEVEL", css_level)
        self._patch_if_changed_webserver("ENABLE_OPTIMIZATION", enable_opt)
        #self._patch_if_changed_webserver("ENABLE_DECOMPRESSION", enable_decompression)
        self._patch_if_changed_webserver("REV_RUM_BEACON_URL", rum_beacon, True)

        self._patch_if_changed_webserver("REV_PROFILES_COUNT", profiles_count, True)

    def _patch_cache_vars(self):
        cache = self.ui_config["rev_component_bp"]

        self._patch_if_changed_varnish("ENABLE_CACHE", cache["enable_cache"])
        self._patch_if_changed_webserver("ENABLE_VARNISH", cache["enable_cache"])
        self._patch_if_changed_varnish("INCLUDE_USER_AGENT", self.cmd_opts["include_user_agent"])
        self._patch_if_changed_varnish("CACHE_PS_HTML", self.cmd_opts["cache_ps_html"])
        self._patch_if_changed_varnish("CACHE_IGNORE_AUTH", self.cmd_opts["cache_ignore_auth"])
        self._patch_if_changed_webserver("BYPASS_VARNISH_LOCATIONS", cache.get("cache_bypass_locations", []))

        # Check for caching rules mode (best or first)
        self._patch_if_changed_varnish("CACHING_RULES_MODE", cache.get("caching_rules_mode", "best"))

        if "caching_rules" in cache:
            bans = _compute_ban_urls_from_caching_rules(self.varnish_config_vars.get("CACHING_RULES", {}),
                                                        cache["caching_rules"])
            self._add_ban_urls(bans)
            self._patch_if_changed_varnish("CACHING_RULES", cache["caching_rules"])

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

        self._patch_if_changed_varnish("CUSTOM_VCL_ENABLED", custom_vcl_enabled)
        self._patch_if_changed_varnish("CUSTOM_VCL", custom_vcl)

        geoip_headers = cache.get("enable_vcl_geoip_headers", False)
        self._patch_if_changed_webserver("ENABLE_VARNISH_GEOIP_HEADERS", geoip_headers)
        self._patch_if_changed_varnish("ENABLE_GEOIP_HEADERS", geoip_headers)

        self._patch_if_changed_varnish("CLIENT_RESPONSE_TIMEOUT",
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
        log.LOGI("(BP-255) enable_origin_health_probe: %s" % enable_origin_health_probe)
        if enable_origin_health_probe:
            log.LOGI("(BP-255) config_health_probe:\t%s" % config_health_probe)
            health_probe = config_health_probe
            # health_probe["HTTP_REQUEST"] = [
            #     "%s %s HTTP/1.1" % (config_health_probe["method"], config_health_probe["url"]),
            # ] + ["%s: %s" % (header_pair[0], header_pair[1]) for header_pair in config_health_probe["headers"]]
            # health_probe["HTTP_STATUS"] = config_health_probe["expected_status"]
            # health_probe["PROBE_INTERVAL"] = config_health_probe["interval"]
            # health_probe["PROBE_TIMEOUT"] = config_health_probe["timeout"]

        self._patch_if_changed_varnish("ENABLE_ORIGIN_HEALTH_PROBE", enable_origin_health_probe)
        self._patch_if_changed_varnish("ORIGIN_HEALTH_PROBE", health_probe)
        # END (BP-255)

    def _patch_security_vars(self):
        security = self.ui_config["rev_component_bp"]

        if not security["enable_security"]:
            mode = "off"
        else:
            if security["web_app_firewall"] == "block_all":
                mode = "block"
            elif security["web_app_firewall"] == "detect":
                mode = "detect"
            elif security["web_app_firewall"] == "block":
                mode = "on"
            else:
                mode = "off"

        self._patch_if_changed_webserver("SECURITY_MODE", mode)
        self._patch_if_changed_webserver("BLOCK_CRAWLERS", security.get("block_crawlers", True))

        self._patch_if_changed_webserver("acl", security.get("acl", {
            "enabled": False,
            "action": "allow_except",
            "acl_rules": []
        }))

    def _get_proxied_and_optimized_domains(self, cdn_urls):
        """
        Check the version number and handle appropriately due to change in
        variable names.
        """
        proxied_domains = cdn_urls
        optimized_domains = []

        old_version = False
        if _compare_versions(self.ui_config.get("version", "0.0.0"), "1.0.5") < 0 or \
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
        else:  # 1.0.5 or newer
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

        _check_valid_domains(proxied_http_servers, "Proxied HTTP domain")
        _check_valid_domains(proxied_https_servers, "Proxied HTTPS domain")
        _check_valid_domains(optimized_http_servers, "Rewritten HTTP domain")
        _check_valid_domains(optimized_https_servers, "Rewritten HTTPS domain")

        return (
            (proxied_http_servers, proxied_https_servers),
            (optimized_http_servers, optimized_https_servers),
            enable_rewr
        )

    def _patch_misc_vars(self):

        misc = self.ui_config["rev_component_bp"]

        ((http_servers, https_servers), (http_servers_rewr, https_servers_rewr), enable_rewr) = \
            self._get_proxied_and_optimized_domains(_get_cdn_overlay_urls(misc))

        self._patch_if_changed_webserver("DOMAINS_TO_PROXY_HTTP", http_servers, True)
        self._patch_if_changed_webserver("DOMAINS_TO_PROXY_HTTPS", https_servers, True)
        self._patch_if_changed_webserver("DOMAINS_TO_OPTIMIZE_HTTP", http_servers_rewr, True)
        self._patch_if_changed_webserver("DOMAINS_TO_OPTIMIZE_HTTPS", https_servers_rewr, True)

        main_domain_name = self.webserver_config_vars["proxy"]["SERVER_NAME"]
        ows_domain, ows_server = _get_ows_domain_and_server(main_domain_name, self.ui_config)
        self._patch_if_changed_webserver("ORIGIN_SERVER_NAME", ows_domain)

        domain_wc_alias = self.ui_config.get("domain_wildcard_alias", "")
        domain_regex_alias = wildcard_to_regex(domain_wc_alias) if domain_wc_alias else ""
        self._patch_if_changed_webserver("SERVER_REGEX_ALIAS", domain_regex_alias)
        self._patch_if_changed_webserver("SERVER_ALIASES", self.ui_config.get("domain_aliases", []))

        self._patch_if_changed_webserver("CUSTOM_WEBSERVER_CODE_BEFORE", misc.get("bp_apache_fe_custom_config", ""))
        self._patch_if_changed_webserver("CUSTOM_WEBSERVER_CODE_AFTER", misc.get("bp_apache_custom_config", ""))

        self._patch_if_changed_webserver("ENABLE_HTTP", self.cmd_opts["http"])
        self._patch_if_changed_webserver("ENABLE_HTTPS", self.cmd_opts["https"])
        self._patch_if_changed_webserver("ENABLE_SPDY", self.cmd_opts["spdy"])
        self._patch_if_changed_webserver("ENABLE_HTTP2", misc.get("enable_http2", True))
        self._patch_if_changed_webserver("DOMAIN_SHARDS_COUNT", self.cmd_opts["shards_count"])

        self._patch_if_changed_webserver("ENABLE_JS_SUBSTITUTE", enable_rewr)
        self._patch_if_changed_webserver("ENABLE_HTML_SUBSTITUTE", enable_rewr and self.cmd_opts["html_subst"])

        self._patch_if_changed_webserver("DEBUG_MODE", self.cmd_opts["debug"])
        self._patch_if_changed_varnish("DEBUG_MODE", self.cmd_opts["debug"])

        self._patch_if_changed_webserver("PROXY_TIMEOUT",
                                            self.ui_config.get("proxy_timeout", self.cmd_opts["proxy_timeout"]))
        self._patch_if_changed_webserver("ORIGIN_IDLE_TIMEOUT", misc.get("origin_http_keepalive_ttl", 80))
        self._patch_if_changed_webserver("ORIGIN_REUSE_CONNS", misc.get("origin_http_keepalive_enabled", True))
        self._patch_if_changed_webserver("ENABLE_PROXY_BUFFERING", misc.get("enable_proxy_buffering", False))
        self._patch_if_changed_webserver("END_USER_RESPONSE_HEADERS", misc.get("end_user_response_headers", [])) # (BP-92) BP

        cos = _get_content_optimizers(self.ui_config)
        if cos:
            self._patch_if_changed_webserver("CONTENT_OPTIMIZERS_HTTP", [] if not self.cmd_opts["http"]
                                                else ["http://%s" % co for co in cos])
            self._patch_if_changed_webserver("CONTENT_OPTIMIZERS_HTTPS", [] if not self.cmd_opts["https"]
                                                else ["https://%s" % co for co in cos])
            self._patch_if_changed_varnish("CONTENT_OPTIMIZERS_HTTP", [] if not self.cmd_opts["http"]
                                              else cos)
            self._patch_if_changed_varnish("CONTENT_OPTIMIZERS_HTTPS", [] if not self.cmd_opts["https"]
                                              else cos)

        co_bypass_urls = misc.get("co_bypass_locations", [])
        self._patch_if_changed_webserver("BYPASS_CO_LOCATIONS", co_bypass_urls)
        self._patch_if_changed_varnish("BYPASS_CO_LOCATIONS", co_bypass_urls)

        http = "http" if self.cmd_opts["ows_http"] else "https"
        https = "https" if self.cmd_opts["ows_https"] else "http"

        _check_valid_domains([ows_server], "Origin server")

        self._patch_if_changed_webserver("ORIGIN_SERVERS_HTTP", [] if not self.cmd_opts["http"]
                                            else ["%s://%s" % (http, ows_server)])
        self._patch_if_changed_webserver("ORIGIN_SERVERS_HTTPS", [] if not self.cmd_opts["https"]
                                            else ["%s://%s" % (https, ows_server)])

        bp = misc
        misc = self.ui_config["rev_component_co"]
        domain_name = main_domain_name

        ows_domain, ows_server = _get_ows_domain_and_server(domain_name, self.ui_config)

        self._patch_if_changed_webserver("ORIGIN_SERVER_NAME", ows_domain)
        self._patch_if_changed_webserver("CUSTOM_WEBSERVER_CODE_AFTER", misc.get("co_apache_custom_config", ""))

        ((http_servers, https_servers), (http_servers_rewr, https_servers_rewr), enable_rewr) = \
            self._get_proxied_and_optimized_domains(_get_cdn_overlay_urls(bp))

        self._patch_if_changed_webserver("DOMAINS_TO_PROXY_HTTP", http_servers)
        self._patch_if_changed_webserver("DOMAINS_TO_PROXY_HTTPS", https_servers)
        self._patch_if_changed_webserver("DOMAINS_TO_OPTIMIZE_HTTP", http_servers_rewr)
        self._patch_if_changed_webserver("DOMAINS_TO_OPTIMIZE_HTTPS", https_servers_rewr)

        self._patch_if_changed_webserver("ENABLE_HTTP", self.cmd_opts["http"])
        self._patch_if_changed_webserver("ENABLE_HTTPS", self.cmd_opts["https"])
        self._patch_if_changed_webserver("DOMAIN_SHARDS_COUNT", self.cmd_opts["shards_count"])

        self._patch_if_changed_webserver("ENABLE_JS_SUBSTITUTE", enable_rewr)
        self._patch_if_changed_webserver("ENABLE_HTML_SUBSTITUTE", enable_rewr and self.cmd_opts["html_subst"])

        self._patch_if_changed_webserver("DEBUG_MODE", self.cmd_opts["debug"])

        self._patch_if_changed_webserver("PROXY_TIMEOUT",
                                            self.ui_config.get("proxy_timeout", self.cmd_opts["proxy_timeout"]))

        self._patch_if_changed_webserver("ORIGIN_IDLE_TIMEOUT", misc.get("origin_http_keepalive_ttl", 80))
        self._patch_if_changed_webserver("ORIGIN_REUSE_CONNS", misc.get("origin_http_keepalive_enabled", True))
        self._patch_if_changed_webserver("ENABLE_PROXY_BUFFERING", misc.get("enable_proxy_buffering", False))
        self._patch_if_changed_webserver("ENABLE_DECOMPRESSION", misc.get("enable_decompression", True))

        http = "http" if self.cmd_opts["ows_http"] else "https"
        https = "https" if self.cmd_opts["ows_https"] else "http"

        _check_valid_domains([ows_server], "Origin server")

        self._patch_if_changed_webserver("ORIGIN_SERVERS_HTTP", [] if not self.cmd_opts["http"]
                                            else ["%s://%s" % (http, ows_server)])
        self._patch_if_changed_webserver("ORIGIN_SERVERS_HTTPS", [] if not self.cmd_opts["https"]
                                            else ["%s://%s" % (https, ows_server)])
        self._patch_if_changed_webserver("ORIGIN_REQUEST_HEADERS", misc.get("origin_request_headers", [])) # (BP-92) CO

    def config_changed(self):
        return self._config_changed

    def must_ban_html(self):
        return self._must_ban_html

    def patch_config(self):
        self._patch_content_vars()
        self._patch_cache_vars()
        self._patch_security_vars()
        self._patch_misc_vars()


def fatal(msg):
    log.LOGE(msg)
    sys.exit(1)


def _(s):
    return s.replace(".", "_")


def _compatible_version(ver):
    try:
        [major, minor, _] = [int(x) for x in ver.split(".")]
        [good_major, good_minor, _] = [int(x) for x in _UI_CONFIG_VERSION.split(".")]

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


# def _get_server_role():
#     try:
#         child = subprocess.Popen("dpkg -l", shell=True, stdout=subprocess.PIPE)
#         (stdout, stderr) = child.communicate()
#         for line in stdout.split("\n"):
#             # if line.find("revsw-browser-proxy") >= 0:
#             #     return "bp"
#             # elif line.find("revsw-content-optimizer") >= 0:
#             #     return "co"
#             if line.find("revsw-libvarnish4api") >= 0:
#                 return "bp"
#             elif line.find("revsw-nginx-full") >= 0:
#                 return "co"
#     except OSError as e:
#         log.LOGE("Execution of 'dpkg -l' failed:", e)
#         raise
#     raise EnvironmentError("Neither 'revsw-varnish4' nor 'revsw-nginx-full' packages are installed; "
#                            "can't configure new site")


def _check_proto_and_hostname(arg):
    url_re = re.compile(
        r'^(https?://)?'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9_-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'$', re.IGNORECASE)
    if not url_re.search(arg):
        fatal("'%s' is not a valid protocol and hostname URL." % arg)


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


def _get_cdn_overlay_urls(proxy):
    return proxy["cdn_overlay_urls"] if proxy.get("cache_opt_choice") != "Rev CDN" else []


def _get_content_optimizers(ui_config):
    cos = sorted_non_empty(ui_config.get("co_cnames")) or sorted_non_empty(ui_config.get("co_list"))

    # First check that the COs are valid addresses/domains.
    _check_valid_domains(cos, "Content optimizer")
    return cos


def _get_domain_mapping(domain_name):
    mapping = {}
    try:
        with open("/opt/revsw-config/apache/site-mappings.json") as j:
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
        with open("/opt/revsw-config/apache/custom-sites/%s/proxy.json" % domain_name) as j:
            config_str = j.read()
    except IOError as e:  # file doesn't exist
        if e.errno != errno.ENOENT:
            raise

    # No custom config, generate from the generic site config and replace a magic string
    # with actual domain names
    if not config_str:
        with open("/opt/revsw-config/apache/generic-site/proxy.json") as j:
            config_str = re.sub(r"ows-generic-domain\.1234", ows_domain_name, j.read())
            config_str = re.sub(r"ows-generic-domain_1234", _(ows_domain_name), config_str)
            config_str = re.sub(r"ows-generic-server\.1234", ows_server, config_str)
            config_str = re.sub(r"ows-generic-server_1234", _(ows_server), config_str)
            config_str = re.sub(r"generic-domain\.1234", domain_name, config_str)
            config_str = re.sub(r"generic-domain_1234", _(domain_name), config_str)

    config = json.loads(config_str)

    cos = _get_content_optimizers(ui_config)
    if not cos:
        cos = mapping.get("optimizers")
    if cos:
        for cmd in config["commands"]:
            if "varnish_config_vars" in cmd:
                cmd["varnish_config_vars"]["CONTENT_OPTIMIZERS_HTTP"] = cos
                cmd["varnish_config_vars"]["CONTENT_OPTIMIZERS_HTTPS"] = cos
            if "config_vars" in cmd:
                cmd["config_vars"]["proxy"]["CONTENT_OPTIMIZERS_HTTP"] = ["http://%s" % co for co in cos]
                cmd["config_vars"]["proxy"]["CONTENT_OPTIMIZERS_HTTPS"] = ["https://%s" % co for co in cos]

    return config


def delete_domain(domain_name):
    log.LOGI("Deleting domain '%s'" % domain_name)

    configure_all({
        "version": API_VERSION,
        "commands": [
            {
                "type": "delete",
                "site_name": _(domain_name)
            }
        ]
    })
    
    # Let's see if we are a BP or a CO by looking at which package is installed

    # Ban the whole domain from Varnish
    VarnishAdmin().ban('obj.http.X-Rev-Host == "%s"' % domain_name)
    
    log.LOGI("Deleted domain '%s'" % domain_name)


def add_or_update_domain(domain_name, ui_config):
    site_name = _(domain_name)

    acfg = PlatformWebServer().config_class()(site_name)

    if not acfg.exists():
        log.LOGI("Adding domain '%s'" % domain_name)
        # Initial, default config
        config = _gen_initial_domain_config(domain_name, ui_config)
        configure_all(config)
        log.LOGI("Added domain '%s'" % domain_name)

    log.LOGI("Updating domain '%s'" % domain_name)

    webserver_config_vars = acfg.load_input_vars()
    # log.LOGI(u"Input JSON is: ", webserver_config_vars)

    varnish_config_vars = {}
    # noinspection PyBroadException
    try:
        varnish_config_vars = VarnishConfig(site_name).load_site_config()
    except:
        log.LOGE("Couldn't load Varnish config for '%s' - ignoring" % site_name)

    cfg_common = ConfigCommon(webserver_config_vars, varnish_config_vars, ui_config)
    cfg_common.patch_config()

    if cfg_common.config_changed():
        config = {
            "version": API_VERSION,
            "type": "config",
            "site_name": site_name,
            "config_vars": webserver_config_vars,
            "varnish_config_vars": varnish_config_vars
        }

        # Apply patched config
        configure_all({
            "version": API_VERSION,
            "commands": [config]
        })

        # Ban Varnish URLs that match changed caching rules
        if cfg_common.ban_urls or cfg_common.must_ban_html():
            vadm = VarnishAdmin()
            for url in cfg_common.ban_urls:
                log.LOGI("Banning URL '%s' on '%s'" % (url, domain_name))
                vadm.ban('obj.http.X-Rev-Host == "%s" && obj.http.X-Rev-Url ~ "%s"' % (domain_name, url))
            if cfg_common.must_ban_html():
                log.LOGI("Banning HTML content '%s'" % domain_name)
                vadm.ban('obj.http.X-Rev-Host == "%s" && obj.http.Content-Type == "text/html"' % domain_name)

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

    if "co_profiles" in vars_:
        co_profiles = vars_["co_profiles"]
        ver = co_profiles.setdefault("VERSION", 1)

        new_ver = new_vars_for_version["co_profiles"].get("VERSION", 1)
        if new_ver > _CO_PROFILES_CONFIG_VERSION:
            raise AttributeError("'co_profiles' structure version is %d, which is newer than what pc-apache-config.py "
                                 "supports (%d). Upgrade your server packages." %
                                 (new_ver, _CO_PROFILES_CONFIG_VERSION))

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
    """
    Upgrade Varnish site config vars up to the version of the structure in 'new_vars_for_version'
    """
    ver = vars_.setdefault("VERSION", 1)

    new_ver = new_vars_for_version.get("VERSION", 1)
    if new_ver > _VARNISH_CONFIG_VERSION:
        raise AttributeError("Varnish site structure version is %d, which is newer than what pc-apache-config.py "
                             "supports (%d). Upgrade your server packages." % (new_ver, _VARNISH_CONFIG_VERSION))

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

    if "URLS_REMOVE_COOKIES_REGEX" in vars_:
        del vars_["URLS_REMOVE_COOKIES_REGEX"]
    if "CACHE_MAX_TIME_SEC" in vars_:
        del vars_["CACHE_MAX_TIME_SEC"]

    vars_["VERSION"] = new_ver


def _upgrade_domain_config(domain_name):
    log.LOGI("Computing config upgrade for domain '%s'" % domain_name)

    site_name = _(domain_name)

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
    config["version"] = API_VERSION
    config["config_vars"] = new_webserver_config_vars
    config["varnish_config_vars"] = new_varnish_config_vars

    log.LOGI("Computed config upgrade for domain '%s'" % domain_name)
    return config


def upgrade_all_domains():
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
            "version": API_VERSION,
            "commands": cmds
        })
    except ConfigException as ce:
        fail_domains = ce.error_domains
        fail_msg = ce.message
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
                                     (ver, _UI_CONFIG_VERSION))

            # Interpret content
            domain_name = _ui_config["domain_name"]

            if _ui_config["operation"] in ("add", "update", "edit"):
                add_or_update_domain(domain_name, _ui_config)
            elif _ui_config["operation"] == "delete":
                delete_domain(domain_name)
            else:
                raise AttributeError("Invalid operation '%s'" % _ui_config["operation"])

    except Exception as e:
        log.LOGE(str(e))
        # raise
        sys.exit(-1)

# Main function
_main()
