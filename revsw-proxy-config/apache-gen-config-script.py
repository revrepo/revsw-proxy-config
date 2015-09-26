#!/usr/bin/env python
import argparse
import os
import re
import sys
import socket
from cStringIO import StringIO
import json
import shlex

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "common"))
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "../../common/python")))

from revsw_apache_config import sorted_non_empty

RUM_BEACON_URL = "http://rum-02-prod-sjc.revsw.net/service"

help_str = r"""
This script reads a configuration from the standard input and generates a configuration shell script
called 'configure.sh', as well as a few other configuration files that will be used by the generated script.

The format of the input is described below. Please note that a command can span multiple lines if each line, except
the last, ends with a backslash (\).

bps <IP address/hostname> [<IP address/hostname> ...]
domain <domain name> [addr <IP address> ] [http] [https] \
  [certs-dir <certificates directory> ] \
  [optimizer-cnames <hostname> [<hostname> ...] ] \
  [optimizers <IP address/hostname> [<IP address/hostname> ...] ] \
  [disable-optimization] \
  [enable-js-substitute] \
  [enable-html-substitute] \
  [static-content-servers <URL> [<URL> ...] ] \
  [ows <IP address/hostname> ] [ows-http-only | ows-https-only] \
  [ows-domain <domain name>] \
  [shards-count <number> ] \
  [bp-template <Jinja file> ] \
  [co-template <Jinja file> ] \
  [profile-selection-template <Jinja file> ] [profile-selection-disabled] \
  [no-varnish] \
  [caching-rules-file <JSON file>] \
  [varnish-ignore-cookies-url-regex [+] <URL regex> [<URL regex> ...] ]
[domain ...]
...
[bp ...]
...

The 'bps' section specifies one or more Browser Proxy instances. Each server address must be reachable from this
computer (preferably on the same LAN, or a public address). All BPs will be configured identically.

Each 'domain' line specifies one domain served by the BP(s).

<domain name> is the name of the domain, e.g. www.example.com.

'addr' is optional. If it is present, the BP will only accept connections for <domain> on that IP address. Therefore,
the IP address must be assigned to one of the network interfaces on the BP machine. If 'addr' is omitted, the BP will
accept connections for <domain> on all its assigned addresses.

'http' and 'https' are optional, but at least one must be present. If 'http' is specified, HTTP is enabled for
<domain name>, so e.g. http://www.example.com will work. If 'https' is present, HTTPS is enabled, so e.g.
https://www.example.com will work. Both of them can be present as well - in that case, both HTTP and HTTPS are enabled.

'certs-dir' is optional. If it is present, <certificates directory> must specify a directory containing the SSL
certificates for <domain name> (server.crt, server.key and server.ca-bundle). These files will be sent to the BP and all
COs in 'optimizers' if 'https' is present. If omitted, certificates are not configured. Please make sure that server.key
does not have a passphrase, otherwise the web server won't be able to start.

'optimizer-cnames' is optional. If present, it specifies a list of host names of Content Optimizers (COs) that will be
used to optimize the content. Each BP will maintain connections to all these COs and it will balance the load between
them. If 'optimizer-cnames' is not present, the list of COs is defined by 'optimizers'.

'optimizers' is optional. If present, it specifies a list of addresses of Content Optimizers (COs) that will be
configured to optimize the content. Whether the COs in the list are used by BPs or not depends on the presence of
'optimizer-cnames': if it is present, 'optimizers' must contain the addresses of active AND backup COs, which will
all be configured, but the ones that are actively used will be selected through DNS resolution (each CNAME will map
to a single CO in 'optimizers' at any time). If 'optimizer-cnames' is not present, all the COs in 'optimizers' will
be used by the BPs directly (for backward compatibility).

'disable-optimization' is optional. If present, PageSpeed is used by the CO only for address translation,
disabling all optimizing filters and static link sharding.

'enable-js-substitute' is optional. If present, the JS link rewriting module will be enabled, causing all links that
are generated dynamically through JS to be rewritten to pass through the BP first.

'enable-html-substitute' is optional. If present, the JS link rewriting module will be enabled, causing all links that
are present in HTML content coming from third party sites to be rewritten to pass through the BP first.

'static-content-servers' is optional. If present, it specifies a list of servers from which the BP
will request static content . If the server URL specifies HTTP, the resources will be retrieved over HTTP by Varnish,
unless 'no-varnish' is also present, otherwise they will be retrieved by the client-facing BP virtual host.
If the server URL specifies HTTPS, the resources will be retrieved by the client-facing virtual host.

'ows' is optional. If present, it defines the server used by each CO as an origin. If omitted, the COs will get content
from <domain name>, which means the DNS used by each CO must resolve <domain name> to the real origin server.
By default, each CO will use HTTP to get data from the origin if the client connection to the BP is also HTTP. It will
use HTTPS if the client connection to the BP is HTTPS. You can change this behavior by specifying 'ows-http-only'
or 'ows-https-only', which will instruct the COs to load data from the origin using only HTTP or HTTPS, regardless of
the protocol used by the client.

[ows-domain] is optional. If present, it defines the domain name used for HTTP requests to <ows> (the Host: header).
If absent, <ows> is used as the domain name.

'shards-count' is optional. If present, the CO will distribute resource URLs from <domain> over multiple "shards",
with domain names from 's0.<domain>' to 's<n-1>.<domain>', where 'n' is the number of shards. So, for example, if
<domain> is 'ex.com' and 'shards-count' is 3, the resources will be evenly distributed between 'ex.com', 's0.ex.com',
's1.ex.com' and 's2.ex.com'. If 'shards-count' is absent, sharding is disabled.

'bp-template' is optional. If present, it specifies a Jinja template file (full file name, with .jinja extension).
that defines the web server configuration of the BP for <domain name>. If omitted, the default template will be used.

'co-template' is optional. If present, it specifies a Jinja template file that defines the web server configuration of
every CO for <domain name>. If omitted, the default template will be used. Please note that the template is applied
to all COs in the 'optimizers' list.

'profile-selection-template' is optional. If present, it specifies a Jinja template file that defines the
optimization profile selection algorithm for <domain name>. If omitted, the default algorithm will be used.

'profile-selection-disabled' is optional. It present, <profile-selection-template> is ignored and the COs will
listen on ports 80 and 443 for HTTP/HTTPS.

'no-varnish' is optional. If present, Varnish caching support is disabled.

'varnish-ignore-cookies-url-regex' is optional. If absent, Varnish will be configured to discard cookies for URLs
that match images, scripts and CSS.
If present, it is followed by a list of regular expressions. The list is optionally preceded by the '+' sign.
The '+' sign instructs the script to ADD the expressions that follow to the builtin list (images, JS, CSS).
If '+' is not present, the expressions in the list will REPLACE the builtin ones.
The regular expressions will make Varnish ignore cookies for all URLs that match at least one of the expressions.
Please note that Varnish never caches a URL if cookies are present in the request or response headers. Since most
modern web sites use cookies, nothing would be cached if Varnish were configured with an empty expression list.

'caching-rules-file' is optional. If present, it refers to a JSON file containing the caching rules for 'domain'.

It is possible to specify multiple 'domain' entries pe BP instance. It is also possible to configure multiple BP
instances from the same script.

NOTE: You must run the generated script in order to actually configure the BP and CO instances.
"""

_bps = {}
_cos = {}
_domains = []
_config_addrs = []
_line_no = 0

_http_profiles_base = 18000
_http_profiles_base_max = 18999

_https_profiles_base = 19000
_https_profiles_base_max = 19999

_ignore_cookies_default = [
    r"\.(jpg|jpeg|png|gif|webp|js|css|woff)(\?.*)?$"
]

_BP_CONFIG_VERSION = 23
_CO_CONFIG_VERSION = 14
_CO_PROFILES_CONFIG_VERSION = 2
_VARNISH_CONFIG_VERSION = 15


# noinspection PyClassHasNoInit
class States:
    NONE = 0
    SERVER = 1
    DOMAIN = 2
    ADDR = 3
    OPTIMIZERS = 4
    BP_TEMPLATE = 5
    CO_TEMPLATE = 6
    PROFILE_TEMPLATE = 7
    HTTP = 8
    HTTPS = 9
    CERTS = 10
    PROFILES_DISABLED = 12
    OWS = 13
    IGNORE_COOKIES = 14
    NO_VARNISH = 15
    OWS_HTTP_ONLY = 16
    OWS_HTTPS_ONLY = 17
    STATIC_CONTENT_SERVERS = 18
    SHARDS_COUNT = 19
    DISABLE_OPTIMIZATION = 20
    OWS_DOMAIN = 21
    OPTIMIZER_CNAMES = 22
    CACHING_RULES_FILE = 23
    ENABLE_JS_SUBST = 24
    ENABLE_HTML_SUBST = 25


def fail(msg):
    global _line_no
    print >> sys.stderr, "Line %d: %s" % (_line_no, msg)
    sys.exit(1)


def is_ip_addr(arg):
    try:
        socket.inet_pton(socket.AF_INET, arg)
    except socket.error:
        try:
            socket.inet_pton(socket.AF_INET6, arg)
        except socket.error:
            return False
    return True


def is_hostname(arg):
    if len(arg) > 255:
        return False
    if arg[-1] == ".":
        arg = arg[:-1]  # strip exactly one dot from the right, if present
    allowed = re.compile("(?!-)[A-Z\d-]{1,63}(?<!-)$", re.IGNORECASE)
    return all(allowed.match(x) for x in arg.split("."))


def check_ip_addr(arg):
    if not is_ip_addr(arg):
        fail("'%s' is not a valid IP address." % arg)


def check_positive_int(arg):
    try:
        if int(arg) < 0:
            raise ArithmeticError("negative int")
    except ArithmeticError:
        fail("'%s' is not a positive integer value." % arg)


def check_hostname(arg):
    if not is_hostname(arg):
        fail("'%s' is not a valid hostname." % arg)


def check_ip_or_hostname(arg):
    if not is_ip_addr(arg) and not is_hostname(arg):
        fail("'%s' is not a valid IP address or hostname." % arg)


def check_url(arg):
    url_re = re.compile(
        r'^(https?://)'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'invalid|'  # 'invalid' special hostname...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)?$', re.IGNORECASE)
    if not url_re.search(arg):
        fail("'%s' is not a valid URL." % arg)


def check_file_exists(arg):
    if not os.path.exists(arg):
        fail("File '%s' doesn't exist." % arg)


def parse_line(line):
    args_ = shlex.split(line)
    state = States.NONE
    used_states = set()

    global _line_no
    global _config_addrs
    global _bps
    global _cos
    global _domains

    # noinspection PyClassHasNoInit
    class Nl:
        needs_param = False
        new_state = States.NONE

    domain = {
        "bps": set(),
        "bp_cos": set(),
        "configured_cos": set(),
        "static_servers_http": set(),
        "static_servers_https": set(),
        "ignore_cookies": [],
    }

    def check_unused_and_set(arg_, astate):
        if Nl.needs_param:
            fail("'%s' found instead of expected parameter." % arg_)
        if astate in used_states:
            fail("'%s' can only be specified once per line." % arg_)
        Nl.new_state = astate
        Nl.needs_param = True

    def check_unused_and_set_domain(arg_, astate):
        if States.DOMAIN not in used_states:
            fail("'%s' can only be specified in a 'domain' section." % arg_)
        check_unused_and_set(arg_, astate)

    def check_single_and_set(key, arg_, option):
        if key in domain:
            fail("A single '%s' is allowed." % option)
        domain[key] = arg_

    for arg in args_:
        if arg == "bps":
            if state != States.NONE:
                fail("'bps' must be at the beginning of the line.")
            check_unused_and_set(arg, States.SERVER)
            _config_addrs = []
        elif arg == "domain":
            if state != States.NONE:
                fail("'domain' must be at the beginning of the line.")
            check_unused_and_set(arg, States.DOMAIN)
        elif arg == "addr":
            check_unused_and_set_domain(arg, States.ADDR)
        elif arg == "optimizers":
            check_unused_and_set_domain(arg, States.OPTIMIZERS)
        elif arg == "optimizer-cnames":
            check_unused_and_set_domain(arg, States.OPTIMIZER_CNAMES)
        elif arg == "ows":
            check_unused_and_set_domain(arg, States.OWS)
        elif arg == "ows-domain":
            check_unused_and_set_domain(arg, States.OWS_DOMAIN)
        elif arg == "http":
            check_unused_and_set_domain(arg, States.HTTP)
            domain["http"] = True
            Nl.needs_param = False
        elif arg == "https":
            check_unused_and_set_domain(arg, States.HTTPS)
            domain["https"] = True
            Nl.needs_param = False
        elif arg == "no-varnish":
            check_unused_and_set_domain(arg, States.NO_VARNISH)
            domain["use_varnish"] = False
            Nl.needs_param = False
        elif arg == "certs-dir":
            check_unused_and_set_domain(arg, States.CERTS)
        elif arg == "bp-template":
            check_unused_and_set_domain(arg, States.BP_TEMPLATE)
        elif arg == "co-template":
            check_unused_and_set_domain(arg, States.CO_TEMPLATE)
        elif arg == "profile-selection-template":
            check_unused_and_set_domain(arg, States.PROFILE_TEMPLATE)
        elif arg == "caching-rules-file":
            check_unused_and_set_domain(arg, States.CACHING_RULES_FILE)
        elif arg == "profile-selection-disabled":
            check_unused_and_set_domain(arg, States.PROFILES_DISABLED)
            domain["profiles_disabled"] = True
            Nl.needs_param = False
        elif arg == "ows-http-only":
            if States.OWS_HTTPS_ONLY in used_states:
                fail("Can't use 'ows-http-only' and 'ows-https-only' at the same time.")
            check_unused_and_set_domain(arg, States.OWS_HTTP_ONLY)
            domain["ows_https"] = False
            Nl.needs_param = False
        elif arg == "ows-https-only":
            if States.OWS_HTTP_ONLY in used_states:
                fail("Can't use 'ows-http-only' and 'ows-https-only' at the same time.")
            check_unused_and_set_domain(arg, States.OWS_HTTPS_ONLY)
            domain["ows_http"] = False
            Nl.needs_param = False
        elif arg == "varnish-ignore-cookies-url-regex":
            check_unused_and_set_domain(arg, States.IGNORE_COOKIES)
        elif arg == "static-content-servers":
            check_unused_and_set_domain(arg, States.STATIC_CONTENT_SERVERS)
        elif arg == "shards-count":
            check_unused_and_set_domain(arg, States.SHARDS_COUNT)
        elif arg == "disable-optimization":
            check_unused_and_set_domain(arg, States.DISABLE_OPTIMIZATION)
            domain["enable_opt"] = False
            Nl.needs_param = False
        elif arg == "enable-js-substitute":
            check_unused_and_set_domain(arg, States.ENABLE_JS_SUBST)
            domain["enable_js_subst"] = True
            Nl.needs_param = False
        elif arg == "enable-html-substitute":
            check_unused_and_set_domain(arg, States.ENABLE_HTML_SUBST)
            domain["enable_html_subst"] = True
            Nl.needs_param = False
        else:  # main state processing
            if state == States.SERVER:
                check_ip_or_hostname(arg)
                _config_addrs.append(arg)
            elif state == States.DOMAIN:
                check_hostname(arg)
                check_single_and_set("name", arg, "domain")
            elif state == States.OPTIMIZERS:
                check_ip_or_hostname(arg)
                domain["configured_cos"].add(arg)
            elif state == States.OPTIMIZER_CNAMES:
                check_hostname(arg)
                domain["bp_cos"].add(arg)
            elif state == States.STATIC_CONTENT_SERVERS:
                check_url(arg)
                if arg.startswith("https://"):
                    domain["static_servers_https"].add(arg.replace("https://", ""))
                else:
                    domain["static_servers_http"].add(arg.replace("http://", ""))
            elif state == States.IGNORE_COOKIES:
                if arg == "+":
                    if domain["ignore_cookies"]:
                        fail("'+' is only allowed as the first parameter for 'varnish-ignore-cookies-url-regex'")
                    domain["ignore_cookies"].extend(_ignore_cookies_default)
                else:
                    domain["ignore_cookies"].append(arg)

            elif state == States.OWS:
                check_ip_or_hostname(arg)
                check_single_and_set("ows", arg, "ows")
            elif state == States.OWS_DOMAIN:
                check_hostname(arg)
                check_single_and_set("ows_domain", arg, "ows-domain")
            elif state == States.ADDR:
                check_ip_addr(arg)
                check_single_and_set("addr", arg, "addr")
            elif state == States.CERTS:
                # Certificate directory and specific files under it must all exist
                check_file_exists(os.path.join(arg, "server.crt"))
                check_file_exists(os.path.join(arg, "server.key"))
                check_file_exists(os.path.join(arg, "ca-bundle.crt"))
                check_single_and_set("certs", arg, "certs-dir")
            elif state == States.BP_TEMPLATE:
                check_file_exists(arg)
                check_single_and_set("bp_template", arg, "bp-template")
            elif state == States.CO_TEMPLATE:
                check_file_exists(arg)
                check_single_and_set("co_template", arg, "co-template")
            elif state == States.PROFILE_TEMPLATE:
                check_file_exists(arg)
                check_single_and_set("profile_template", arg, "profile-selection-template")
            elif state == States.CACHING_RULES_FILE:
                check_file_exists(arg)
                check_single_and_set("caching_rules_file", arg, "caching-rules-file")
            elif state == States.SHARDS_COUNT:
                check_positive_int(arg)
                check_single_and_set("shards_count", int(arg), "shards-count")
            else:
                fail("Unexpected parameter '%s'" % arg)

            # All states requiring parameters require one or more.
            # Don't fail if one was already found.
            Nl.needs_param = False

        if Nl.new_state:
            state = Nl.new_state
            used_states.add(Nl.new_state)
            Nl.new_state = States.NONE

    if Nl.needs_param:
        fail("Missing parameter at end of line.")

    # This is a 'bp' line. Initialize list of domains and bail out.
    if States.SERVER in used_states:
        for addr in _config_addrs:
            _bps[addr] = []
        return

    # This is a 'domain' line.
    if not _config_addrs:
        fail("No 'server' section was specified.")

    if States.OPTIMIZER_CNAMES not in used_states:
        domain["bp_cos"] = domain["configured_cos"]

    # Default values for options not set above
    domain.setdefault("http", False)
    domain.setdefault("https", False)
    domain.setdefault("certs", None)
    domain.setdefault("addr", None)
    domain.setdefault("bp_template", None)
    domain.setdefault("co_template", None)
    domain.setdefault("profile_template", None)
    domain.setdefault("caching_rules_file", None)
    domain.setdefault("profiles_disabled", None)
    domain.setdefault("ows", domain["name"])
    domain.setdefault("ows_domain", domain["ows"])
    domain.setdefault("use_varnish", True)
    domain.setdefault("ows_http", True)
    domain.setdefault("ows_https", True)
    domain.setdefault("shards_count", 0)
    domain.setdefault("enable_opt", True)
    domain.setdefault("enable_js_subst", False)
    domain.setdefault("enable_html_subst", False)
    if not domain["ignore_cookies"]:
        domain["ignore_cookies"].extend(_ignore_cookies_default)

    if States.DOMAIN in used_states:
        _domains.append(domain)
        for addr in _config_addrs:
            _bps[addr].append(domain)
            domain["bps"].add(addr)

        # Domain config must also be applied to all COs that reference it
        for co_addr in domain["configured_cos"]:
            co_domains = _cos.setdefault(co_addr, [])
            for co_dom in co_domains:
                if co_dom["name"] == domain["name"]:
                    fail("Domain '%s' already specified for optimizer '%s'." % (domain["name"], co_addr))
            co_domains.append(domain)
    else:
        fail("No 'domain' keyword was found.")


def _(s):
    return s.replace(".", "_")


def template_basename(templ):
    return re.sub("\.jinja$", "", templ)


def vars_schema_name(templ):
    return "%s.vars.schema" % template_basename(templ)


def apache_vars_name(prefix, domain):
    return "%s-apache-%s.json" % (prefix, _(domain["name"]))


def varnish_vars_name(domain):
    return "bp-varnish-%s.json" % _(domain["name"])


def fixup_domain(domain):
    create_bp_templ = False
    create_co_templ = False

    if not domain["bp_template"]:
        domain["bp_template"] = "bp-%s.jinja" % _(domain["name"])
        create_bp_templ = True
    if not domain["co_template"]:
        domain["co_template"] = "co-%s.jinja" % _(domain["name"])
        create_co_templ = True

    if domain["profiles_disabled"]:
        domain["profile_template"] = "co/standard_profiles/no_customer_profiles.jinja"
        domain["profiles_count"] = 1  # hardcoded from no customer profiles

        domain["base_http_port"] = 80
        domain["base_https_port"] = 443
    else:
        if not domain["profile_template"]:
            domain["profile_template"] = "co/standard_profiles/default_customer_profiles.jinja"
            domain["profiles_count"] = 1  # hardcoded from default customer profiles
        else:
            domain["profiles_count"] = parse_profile_template_get_count(domain["profile_template"])

        domain["base_http_port"] = get_next_http_profiles_base(domain["profiles_count"])
        domain["base_https_port"] = get_next_https_profiles_base(domain["profiles_count"])

    profile_basename = template_basename(domain["profile_template"])

    if domain["caching_rules_file"]:
        with open(domain["caching_rules_file"]) as f:
            domain["caching_rules"] = json.load(f)
    else:
        # Implement the old URLS_REMOVE_COOKIES_REGEX rules
        caching_rules = []
        for ign_cookie in domain["ignore_cookies"]:
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
        domain["caching_rules"] = caching_rules

    if create_bp_templ:
        vars_templ = vars_schema_name(domain["bp_template"])

        with open(domain["bp_template"], "w") as f:
            f.write("""
{%% import "%s" as co_profiles_mod %%}
{%% import "bp/bp.jinja" as bp_mod %%}

{%% call(before) bp_mod.setup(bp, co_profiles_mod, co_profiles) %%}
{%% endcall %%}
""" % domain["profile_template"])

        with open(vars_templ, "w") as f:
            f.write("""
{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "Main web server config",
    "type": "object",
    "properties": {
        "bp": {%% include "bp/bp" %%},
        "co_profiles": {%% include "%s" %%}
    },
    "required": ["bp", "co_profiles"],
    "additionalProperties": false
}
""" % profile_basename)

    if create_co_templ:
        vars_templ = vars_schema_name(domain["co_template"])

        with open(domain["co_template"], "w") as f:
            f.write("""
{%% import "%s" as co_profiles_mod %%}
{%% import "co/co.jinja" as co_mod %%}

{%% call(before, is_https) co_mod.setup(co, co_profiles_mod, co_profiles) %%}
{%% endcall %%}
""" % domain["profile_template"])

        with open(vars_templ, "w") as f:
            f.write("""
{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "Main web server config",
    "type": "object",
    "properties": {
        "co": {%% include "co/co" %%},
        "co_profiles": {%% include "%s" %%}
    },
    "required": ["co", "co_profiles"],
    "additionalProperties": false
}
""" % profile_basename)


def parse_profile_template_get_count(fname):
    # Get number of profiles by parsing profile template
    max_ = 0
    profile_re = re.compile(r"^[^#]*RevProfilesAddSelectionRule\s+(\d+)")
    for line in open(fname, "r"):
        m = profile_re.search(line)
        if not m:
            continue
        idx = int(m.group(1))
        if idx > max:
            max_ = idx
    return max_ + 1


def get_next_http_profiles_base(count):
    global _http_profiles_base
    ret = _http_profiles_base
    if _http_profiles_base + count > _http_profiles_base_max:
        fail("Too many HTTP optimization profiles.")
    # Use the same ports for all domains
    # _http_profiles_base += count
    return ret


def get_next_https_profiles_base(count):
    global _https_profiles_base
    ret = _https_profiles_base
    if _https_profiles_base + count > _https_profiles_base_max:
        fail("Too many HTTPS optimization profiles.")
    # Use the same ports for all domains
    # _https_profiles_base += count
    return ret


def get_co_profiles():
    return {
        "VERSION": _CO_PROFILES_CONFIG_VERSION,
        "REV_OPTIMIZATION_LEVEL": "custom",
        "REV_CUSTOM_IMG_LEVEL": "medium",
        "REV_CUSTOM_JS_LEVEL": "medium",
        "REV_CUSTOM_CSS_LEVEL": "medium"
    }


def generate_bp_domain_json(domain):
    # At least one is always True
    http = "http" if domain["ows_http"] else "https"
    https = "https" if domain["ows_https"] else "http"

    bp = {
        "VERSION": _BP_CONFIG_VERSION,
        "ssl": {},
        "acl": {
            "enabled": False,
            "action": "allow_except",
            "acl_rules": []
        },
        "ENABLE_HTTP": domain["http"],
        "ENABLE_HTTPS": domain["https"],
        "ENABLE_VARNISH": domain["use_varnish"],
        "SERVER_NAME": domain["name"],
        "SERVER_ALIASES": [],
        "SERVER_REGEX_ALIAS": "",
        "ORIGIN_SERVER_NAME": domain["ows_domain"],
        "CONTENT_OPTIMIZERS_HTTP": [] if not domain["http"] else
        ["http://%s" % co for co in sorted_non_empty(domain["bp_cos"])],
        "CONTENT_OPTIMIZERS_HTTPS": [] if not domain["https"] else
        ["https://%s" % co for co in sorted_non_empty(domain["bp_cos"])],
        "DOMAINS_TO_PROXY_HTTP": sorted_non_empty(domain["static_servers_http"]),
        "DOMAINS_TO_PROXY_HTTPS": sorted_non_empty(domain["static_servers_https"]),
        "DOMAINS_TO_OPTIMIZE_HTTP": sorted_non_empty(domain["static_servers_http"]),
        "DOMAINS_TO_OPTIMIZE_HTTPS": sorted_non_empty(domain["static_servers_https"]),
        "REV_PROFILES_COUNT": domain["profiles_count"],
        "REV_PROFILES_BASE_PORT_HTTP": domain["base_http_port"],
        "REV_PROFILES_BASE_PORT_HTTPS": domain["base_https_port"],
        "SECURITY_MODE": "off",
        "DOMAIN_SHARDS_COUNT": domain["shards_count"],
        "CUSTOM_WEBSERVER_CODE_BEFORE": "",
        "CUSTOM_WEBSERVER_CODE_AFTER": "",
        "BLOCK_CRAWLERS": True,
        "ENABLE_PROXY_BUFFERING": False,
        "ENABLE_JS_SUBSTITUTE": domain["enable_js_subst"],
        "ENABLE_HTML_SUBSTITUTE": domain["enable_html_subst"],
        "DEBUG_MODE": False,
        "BYPASS_VARNISH_LOCATIONS": [],
        "ENABLE_SPDY": True,
        "PROXY_TIMEOUT": 5,
        "BYPASS_CO_LOCATIONS": [],
        "ORIGIN_SERVERS_HTTP": [] if not domain["http"] else ["%s://%s" % (http, domain["ows"])],
        "ORIGIN_SERVERS_HTTPS": [] if not domain["https"] else ["%s://%s" % (https, domain["ows"])],
        "ORIGIN_IDLE_TIMEOUT": 80,
        "ORIGIN_REUSE_CONNS": True,
        "ENABLE_VARNISH_GEOIP_HEADERS": False,
        "END_USER_RESPONSE_HEADERS": [] # (BP-92)
    }

    f = StringIO()
    json.dump({"bp": bp, "co_profiles": get_co_profiles()}, f, indent=2)
    return f.getvalue()


def generate_bp_varnish_domain_json(domain):
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

    site = {
        "VERSION": _VARNISH_CONFIG_VERSION,
        "SERVER_NAME": domain["name"],
        "ENABLE_CACHE": True,
        "INCLUDE_USER_AGENT": False,
        "CONTENT_OPTIMIZERS_HTTP": [] if not domain["http"] else sorted_non_empty(domain["bp_cos"]),
        "CONTENT_OPTIMIZERS_HTTPS": [] if not domain["https"] else sorted_non_empty(domain["bp_cos"]),
        "DOMAINS_TO_PROXY_HTTP": sorted_non_empty(domain["static_servers_http"]),
        "CACHING_RULES_MODE": "best",
        "CACHING_RULES": domain["caching_rules"],
        "DEBUG_MODE": False,
        "CACHE_PS_HTML": False,
        "CACHE_IGNORE_AUTH": False,
        "BYPASS_CO_LOCATIONS": [],
        "CUSTOM_VCL_ENABLED": False,
        "CUSTOM_VCL": custom_vcl,
        "ENABLE_GEOIP_HEADERS": False,
        "CLIENT_RESPONSE_TIMEOUT": 600,
        "ENABLE_ORIGIN_HEALTH_PROBE": False,
        "ORIGIN_HEALTH_PROBE": {
            "HTTP_REQUEST": "",
            "HTTP_STATUS": 0,
            "PROBE_INTERVAL": 0,
            "PROBE_TIMEOUT": 0
        }
    }

    f = StringIO()
    json.dump(site, f, indent=2)
    return f.getvalue()


def generate_co_domain_json(domain):
    # At least one is always True
    http = "http" if domain["ows_http"] else "https"
    https = "https" if domain["ows_https"] else "http"

    co = {
        "VERSION": _CO_CONFIG_VERSION,
        "ssl": {},
        "ENABLE_HTTP": domain["http"],
        "ENABLE_HTTPS": domain["https"],
        "SERVER_NAME": domain["name"],
        "ORIGIN_SERVER_NAME": domain["ows_domain"],
        "ORIGIN_SERVERS_HTTP": [] if not domain["http"] else ["%s://%s" % (http, domain["ows"])],
        "ORIGIN_SERVERS_HTTPS": [] if not domain["https"] else ["%s://%s" % (https, domain["ows"])],
        "DOMAINS_TO_PROXY_HTTP": sorted_non_empty(domain["static_servers_http"]),
        "DOMAINS_TO_PROXY_HTTPS": sorted_non_empty(domain["static_servers_https"]),
        "DOMAINS_TO_OPTIMIZE_HTTP": sorted_non_empty(domain["static_servers_http"]),
        "DOMAINS_TO_OPTIMIZE_HTTPS": sorted_non_empty(domain["static_servers_https"]),
        "REV_PROFILES_COUNT": domain["profiles_count"],
        "REV_PROFILES_BASE_PORT_HTTP": domain["base_http_port"],
        "LISTEN_REV_PROFILES_BASE_PORT_HTTP": False,  # domain["base_http_port"] != 80,
        "REV_PROFILES_BASE_PORT_HTTPS": domain["base_https_port"],
        "LISTEN_REV_PROFILES_BASE_PORT_HTTPS": False,  # domain["base_https_port"] != 443
        "REV_RUM_BEACON_URL": RUM_BEACON_URL,
        "DOMAIN_SHARDS_COUNT": domain["shards_count"],
        "ENABLE_OPTIMIZATION": domain["enable_opt"],
        "CUSTOM_WEBSERVER_CODE_AFTER": "",
        "ENABLE_JS_SUBSTITUTE": domain["enable_js_subst"],
        "ENABLE_HTML_SUBSTITUTE": domain["enable_html_subst"],
        "PROXY_TIMEOUT": 5,
        "ENABLE_PROXY_BUFFERING": False,
        "DEBUG_MODE": False,
        "ORIGIN_IDLE_TIMEOUT": 80,
        "ORIGIN_REUSE_CONNS": True,
        "ORIGIN_REQUEST_HEADERS": [] # (BP-92)
    }

    f = StringIO()
    json.dump({"co": co, "co_profiles": get_co_profiles()}, f, indent=2)
    return f.getvalue()


def generate_bp(domain):
    # print >>sys.stderr, "BP Domain:", domain

    cfg_name = _(domain["name"])
    basename_templ = template_basename(domain["bp_template"])

    json_fname = apache_vars_name("bp", domain)
    varn_fname = varnish_vars_name(domain)

    j = generate_bp_domain_json(domain)
    with open(json_fname, "w") as f:
        f.write(j)

    j = generate_bp_varnish_domain_json(domain)
    with open(varn_fname, "w") as f:
        f.write(j)

    print_configure_sh("""
DOMAIN_NAME=%s
CFG_NAME=%s
""" % (domain["name"], cfg_name))

    if domain["certs"]:
        print_configure_sh("""
echo "    -> configuring $DOMAIN_NAME certificates"
apache-config.py certs $CFG_NAME %s || EXIT=$?
""" % domain["certs"])

    print_configure_sh("""
echo "    -> configuring site $DOMAIN_NAME"
apache-config.py config -V %s $CFG_NAME $THIS_DIR/%s $THIS_DIR/%s || EXIT=$?
""" % (varn_fname, basename_templ, json_fname))


def generate_co(domain):
    # print >>sys.stderr, "CO Domain:", domain

    cfg_name = _(domain["name"])
    basename_templ = re.sub("\.jinja$", "", domain["co_template"])

    json_fname = apache_vars_name("co", domain)

    j = generate_co_domain_json(domain)
    with open(json_fname, "w") as f:
        f.write(j)

    print_configure_sh("""
DOMAIN_NAME=%s
CFG_NAME=%s
""" % (domain["name"], cfg_name))

    if domain["certs"]:
        print_configure_sh("""
echo "    -> configuring $DOMAIN_NAME certificates"
apache-config.py certs $CFG_NAME %s || EXIT=$?
""" % domain["certs"])

    print_configure_sh("""
echo "    -> configuring site $DOMAIN_NAME"
apache-config.py config $CFG_NAME $THIS_DIR/%s $THIS_DIR/%s || EXIT=$?
""" % (basename_templ, json_fname))


def _get_ui_config_command_opts(domain):
    opts = StringIO()

    if not domain["ows_http"]:
        opts.write("ows-https-only ")
    if not domain["ows_https"]:
        opts.write("ows-http-only ")
    if not domain["http"]:
        opts.write("https-only ")
    if not domain["https"]:
        opts.write("http-only ")
    if domain["shards_count"]:
        opts.write("shards-count=%d " % domain["shards_count"])
    if args.no_bp:
        opts.write("no-bp ")
    if args.no_co:
        opts.write("no-co ")
    if domain["enable_js_subst"]:
        opts.write("enable-js-substitute ")
    if domain["enable_html_subst"]:
        opts.write("enable-html-substitute ")
    # if domain["include_user_agent"]:
    # opts.write("include_user_agent ")
    #if domain["cache_ps_html"]:
    #    opts.write("cache_ps_html ")
    #if domain["debug"]:
    #    opts.write("debug ")

    return opts.getvalue()


def generate_bp_ui_config_json(domain):
    static_servers = \
        ["http://%s" % srv for srv in sorted_non_empty(domain["static_servers_http"])] + \
        ["https://%s" % srv for srv in sorted_non_empty(domain["static_servers_https"])]

    return {
        "bp_apache_custom_config": "",
        "bp_apache_fe_custom_config": "",
        "block_crawlers": True,
        "enable_cache": domain["use_varnish"],
        "cache_bypass_locations": [],
        "cache_opt_choice": "Extend CDN",
        "cdn_overlay_urls": static_servers,
        "caching_rules": domain["caching_rules"],
        "enable_security": False,
        "web_app_firewall": "off",
        "ssl_certificates": "rev_certs",
        "certificate_urls": [],
        "acl": {
            "enabled": False,
            "action": "allow_except",
            "acl_rules": []
        },
        "rev_custom_json": {},
        "end_user_response_headers": []
    }


def generate_co_ui_config_json(domain):
    return {
        "co_apache_custom_config": "",
        "enable_rum": True,
        "rum_beacon_url": RUM_BEACON_URL,
        "enable_optimization": domain["enable_opt"],
        "mode": "custom",
        "img_choice": "medium",
        "js_choice": "medium",
        "css_choice": "medium",
        "rev_custom_json": {}
    }


def generate_ui_config_json(domain):
    ui_config = {
        "version": "1.0.5",
        "domain_name": domain["name"],
        "origin_domain": domain["ows"],
        "operation": "config",
        "origin_server": domain["ows_domain"],
        "config_command_options": _get_ui_config_command_opts(domain),
        "rev_component_co": generate_co_ui_config_json(domain),
        "rev_traffic_mgr": {
            "tier": "SILVER",
            "page_views": "40M",
            "transfer_size": "160 TB",
            "overage": 30,
            "apdex_threshold_ms": 2000
        },
        "rev_component_bp": generate_bp_ui_config_json(domain),
        "3rd_party_rewrite": {
            "enable_3rd_party_rewrite": domain["enable_js_subst"],
            "3rd_party_urls": "",
            "enable_3rd_party_runtime_rewrite": domain["enable_js_subst"],
            "3rd_party_runtime_domains": "",
            "enable_3rd_party_root_rewrite": False,
            "3rd_party_root_rewrite_domains": ""
        },
        "bp_list": list(domain["bps"]),
        "co_list": list(domain["configured_cos"]),
        "co_cnames": list(domain["configured_cos"]),
        "rev_custom_json": {}
    }

    return ui_config


def generate_ui_configs():
    global _domains

    for domain in _domains:
        cfg = generate_ui_config_json(domain)
        with open("ui-config-%s.json" % domain["name"], "wt") as f:
            json.dump(cfg, f, indent=2)


def print_configure_sh(txt):
    print txt


def generate_config_sh():
    global _bps
    global _cos

    # Generate the config script
    sys.stdout = open("configure.sh", "w")

    print_configure_sh("""#!/bin/bash
    EXIT=0
    THIS_DIR=`readlink -f .`
    """)

    if not args.no_bp:
        for addr, domains in _bps.iteritems():
            print_configure_sh("""
    BP=%s
    echo "Configuring BP '$BP'"
    apache-config.py start -I $THIS_DIR $BP || EXIT=$?
    """ % addr)
            if args.upload_varnish_mlogc:
                print_configure_sh("""
    echo "    -> uploading Varnish config template"
    apache-config.py varnish-template || EXIT=$?
    echo "    -> uploading Mlogc config template"
    apache-config.py mlogc-template || EXIT=$?
    """)
            if args.flush:
                print_configure_sh("""
    echo "    -> removing all sites on server"
    apache-config.py flush-sites || EXIT=$?
    """)
            for domain in domains:
                generate_bp(domain)
            if not args.no_send:
                print_configure_sh("""
    echo "    -> sending configuration"
    apache-config.py send || EXIT=$?
    """)
            if args.copy_to:
                print_configure_sh("""
    echo "    -> copying configuration to '%s'"
    apache-config.py copy %s || EXIT=$?
    """ % (args.copy_to, args.copy_to))

    if not args.no_co:
        for addr, domains in _cos.iteritems():
            print_configure_sh("""
    CO=%s
    echo "Configuring CO '$CO'"
    apache-config.py start -I $THIS_DIR $CO || EXIT=$?""" % addr)
            if args.flush:
                print_configure_sh("""echo "    -> removing all sites on server"
    apache-config.py flush-sites || EXIT=$?
    """)
            for domain in domains:
                generate_co(domain)
            if not args.no_send:
                print_configure_sh("""
    echo "    -> sending configuration"
    apache-config.py send || EXIT=$?
    """)
            if args.copy_to:
                print_configure_sh("""
    echo "    -> copying configuration to '%s'"
    apache-config.py copy %s || EXIT=$?
    """ % (args.copy_to, args.copy_to))

    print_configure_sh("exit $EXIT")


def main():
    global _line_no
    global _domains

    # Parse input file
    _line_no = 1
    full_line = ""
    for line in sys.stdin:
        if full_line:
            full_line += " " + line.strip()
        else:
            full_line = line.strip()
        # Line can be broken into multiple lines by ending it with \
        if not line.endswith('\\'):
            if full_line and not full_line.startswith("#"):
                parse_line(full_line)
            full_line = ""
        _line_no += 1

    # Debug output
    # pp = pprint.PrettyPrinter(stream=sys.stderr)
    # print "Services:"
    #pp.pprint(servers)

    for domain in _domains:
        fixup_domain(domain)

    if args.ui_config:
        generate_ui_configs()
    else:
        generate_config_sh()


# ##################################################################################
# MAIN
# ##################################################################################

parser = argparse.ArgumentParser(description="Generate configuration and/or configure web server and Varnish.",
                                 formatter_class=argparse.ArgumentDefaultsHelpFormatter)
parser.add_argument("--manual", help="Display the usage manual",
                    action="store_true")
parser.add_argument("--no-bp", help="Don't generate BP configuration commands",
                    action="store_true")
parser.add_argument("--no-co", help="Don't generate CO configuration commands",
                    action="store_true")
parser.add_argument("--no-flush", help="Don't generate flush commands (obsolete, unused)",
                    action="store_true")
parser.add_argument("--flush", help="Flush existing sites before configuring",
                    action="store_true")
parser.add_argument("--upload-varnish-mlogc", help="Also upload Varnish and Mlogc templates to server",
                    action="store_true")
parser.add_argument("--no-send", help="Don't send configuration",
                    action="store_true")
parser.add_argument("--copy-to", help="Copy generated configuration to file name")
parser.add_argument("--ui-config", help="Generate 'ui-config-<domain>.json' instead of 'configure.sh'",
                    action="store_true")
args = parser.parse_args()

if args.manual:
    print help_str
    sys.exit(0)

main()
