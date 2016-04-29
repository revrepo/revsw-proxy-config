import subprocess
from urlparse import urlparse
import dns.resolver
import jinja2
from jinja2.runtime import StrictUndefined
from jinja2.sandbox import ImmutableSandboxedEnvironment
import json
import jsonschema as jsch
import re
import os
from cStringIO import StringIO
import socket
from revsw.misc import dict_raise_on_duplicates, base64_string_gzip_to_file, select_file_path, run_cmd

# Defines config structure version
API_VERSION = 5

_log = None
_jinja2_globals = {}
_domain_name = ""

# Must be called by importing module !
def set_log(alog):
    global _log
    _log = alog


def _(s):
    return s.replace(".", "_")


# Flatten a list of items or lists to a set - Jinja2 filter
def flatten_to_set(lst, aset=None):
    if aset is None:
        aset = set()
    for k in lst:
        if hasattr(k, '__iter__'):
            flatten_to_set(k, aset)
        else:
            aset.add(k)
    return aset


# Split a URL into its protocol, hostname, port and path - Jinja2 filter
def parse_url(url):
    uri = urlparse(url, "http")
    if uri.port:
        port = uri.port
    elif uri.scheme == "http":
        port = 80
    elif uri.scheme == "https":
        port = 443
    else:
        raise AttributeError("Invalid URL scheme '%s'" % uri.scheme)
    return uri.scheme, uri.hostname, port, uri.path


# Convert a_b-c.ex.com into a___b__c_ex_com - Jinja2 filter
def underscore_url(url):
    return url.replace("_", "___").replace("-", "__").replace(".", "_")

# Return a list of all the IP addresses associated with a domain name - Jinja2 filter
def dns_query(hostname):
    try:
        answer = dns.resolver.query(hostname, "A")
        ips = []
        for data in answer:
            ips.append(str(data))
        return ips
    except:
        raise LookupError("Can't resolve hostname '%s'" % hostname)


# Convert a wildcard expression into a regular expression - Jinja2 filter
def wildcard_to_regex(expr):
    out = StringIO()
    in_brackets = False
    in_curlies = 0
    i = 0
    out.write('^')
    while i < len(expr):
        ch = expr[i]
        if ch == '\\':
            out.write(ch)
            if i + 1 < len(expr):
                out.write(expr[i + 1])
                i += 1
            else:
                raise SyntaxError("Illegal final backslash")
        elif in_brackets:
            if ch == ']':
                out.write(ch)
                in_brackets = False
            elif ch == '[':
                raise SyntaxError("Illegal [ inside bracketed list")
            elif ch == ',':
                pass  # it's a delimiter
            else:
                out.write(ch)
        elif ch == '*':
            if i + 1 < len(expr) and expr[i + 1] == '*':    # recursive globstar, **
                if i + 2 < len(expr) and expr[i + 2] == '/':
                    out.write("([^/]+/)*")
                    i += 2
                else:
                    out.write(".+")
                    i += 1
            else:
                out.write("(.+)")
        elif ch == '?':
            out.write(".")
        elif ch == '.' or ch == '^':
            out.write("\%s" % ch)
        elif ch == '[':
            out.write(ch)
            if i + 1 < len(expr) and expr[i + 1] == '!':
                out.write("^")
                i += 1
            in_brackets = True
        elif ch == ']':
            raise SyntaxError("Mismatched ]")
        elif ch == '{':
            out.write('((')
            in_curlies += 1
        elif ch == ',':
            if in_curlies:
                out.write(")|(")
            else:
                out.write(ch)
        elif ch == '}':
            if in_curlies == 0:
                raise SyntaxError("Mismatched }")
            out.write("))")
            in_curlies -= 1
        else:
            out.write(ch)
        i += 1

    if in_brackets:
        raise SyntaxError("Mismatched [")
    if in_curlies:
        raise SyntaxError("Mismatched {")

    out.write('$')
    return out.getvalue()


# Check if an expression is a valid IPv4 address - Jinja2 filter
def is_ipv4(expr):
    try:
        socket.inet_aton(expr)
        return True
    except socket.error:
        return False


# Convert a netmask in 255.255.255.0 format to bit count (e.g. 24) - Jinja2 filter
def netmask_bits(mask):
    try:
        # /xx representation
        return str(int(mask))
    except ValueError:
        # /xx.yy.zz.ww representation
        netmask = mask.split('.')
        binary_str = ''
        for octet in netmask:
            binary_str += bin(int(octet))[2:].zfill(8)
        return str(len(binary_str.rstrip('0')))


# Replace "foo" with "becustom_<site_name>_foo" - Jinja2 filter
def custom_backend_name(name, site, as_director=False):
    site_name = underscore_url(site["SERVER_NAME"])

    dyn_backends = set()
    for be in site["CUSTOM_VCL"]["backends"]:
        if be["dynamic"]:
            dyn_backends.add(be["name"])

    return "%scustom_%s_%s" % ("dir" if as_director and name in dyn_backends else "be", site_name, name)


# Replace "REV_BACKEND(foo)" occurrences with "becustom_<site_name>_foo" - Jinja2 filter
def process_custom_vcl(vcl, site):
    site_name = underscore_url(site["SERVER_NAME"])

    dyn_backends = set()
    for be in site["CUSTOM_VCL"]["backends"]:
        if be["dynamic"]:
            dyn_backends.add(be["name"])

    # Dynamic backends become rev_dns directors
    def sub_backend(m):
        if m.group(1) in dyn_backends:
            return r"dircustom_%s_%s.backend()" % (site_name, m.group(1))
        else:
            return r"becustom_%s_%s" % (site_name, m.group(1))

    return re.sub(r"REV_BACKEND\(([^)]+)\)", sub_backend, vcl)


# Extract Apache or Nginx-specific directives from 'code' or return an error comment if not found - Jinja2 filter
def extract_custom_webserver_code(code, which_webserver):
    '''
    We support two syntaxes:
     1. Legacy
     # Apache comment
     Apache statement
     Another apache statement
     # BEGIN NGINX CONFIG
     ## Nginx comment
     #Nginx statement
     #Another Nginx statement
     # END NGINX CONFIG

     2. New
     # BEGIN APACHE CONFIG
     # Apache comment
     Apache statement
     Another apache statement
     # END APACHE CONFIG
     # BEGIN NGINX CONFIG
     # Nginx comment
     Nginx statement
     Another Nginx statement
     # END NGINX CONFIG
    '''
    begin_re = re.compile(r"^\s*#\s*BEGIN\s+(APACHE|NGINX)\s+CONFIG\s*$")
    end_re = re.compile(r"^\s*#\s*END\s+(APACHE|NGINX)\s+CONFIG\s*$")

    in_ws = None
    cmds = {"APACHE": [], "NGINX": []}
    extra_cmds = []
    for line in code.split("\n"):
        if not line.strip():
            continue

        m = begin_re.match(line)
        if m:
            ws = m.group(1)
            if in_ws:
                raise SyntaxError("Found BEGIN CONFIG directive inside another block")
            in_ws = ws
        else:
            m = end_re.match(line)
            if m:
                ws = m.group(1)
                if in_ws != ws:
                    raise SyntaxError("Found END CONFIG directive outside block")
                in_ws = None
            elif in_ws:
                cmds[in_ws].append(line)
            else:   # outside any block
                extra_cmds.append(line)

    if extra_cmds:
        if cmds["APACHE"]:  # new style
            raise SyntaxError("Found config statements outside BEGIN/END CONFIG blocks")
        else:               # old style
            cmds["APACHE"] = extra_cmds
            nginx_cmds = []
            for cmd in cmds["NGINX"]:
                if not cmd.startswith("#"):
                    raise SyntaxError("Nginx custom config lines must start with #")
                nginx_cmds.append(cmd.replace("#", "", 1))
            cmds["NGINX"] = nginx_cmds

    def _commented_code(code):
        out = StringIO()
        for line in code.split("\n"):
            print >>out, "#>", line
        return out.getvalue()

    if not cmds[which_webserver]:
        return "# ERROR: There should be custom config code here, but the config doesn't contain %s directives:\n%s" % \
               (which_webserver, _commented_code(code))

    out = StringIO()
    for cmd in cmds[which_webserver]:
        print >>out, cmd
    return out.getvalue()


# Sets the value of a global Jinja2 variable and returns the value
# Usage: set local_var = global_var_set("MY_VAR_NAME", "Hello World!")
def global_var_set(name, value):
    _jinja2_globals[name] = value
    return value


# Gets the value of a global Jinja2 variable
# Usage: set local_var = global_var_get("MY_VAR_NAME")
def global_var_get(name):
    return _jinja2_globals.get(name)


# Return a list of all the nameservers used by the local machine
def dns_servers():
    try:
        resolver = dns.resolver.Resolver()
        return resolver.nameservers
    except:
        raise LookupError("Can't get the name servers of the local machine")


def sorted_non_empty(lst):
    if not lst:
        return []
    nonempty = []
    for el in lst:
        if el:
            nonempty.append(el)
    return sorted(nonempty)


def _generate_jinja_hierarchy(jinja_name, search_dirs, file_list, alt_name=None):
    # Must clone the list because we might insert paths in it
    search_dirs = list(search_dirs)

    jinja_file = select_file_path(None, jinja_name, search_dirs, _log)
    jinja_path = os.path.dirname(jinja_file)

    # Also search in the directory containing the current file
    if jinja_path not in search_dirs:
        search_dirs.insert(0, jinja_path)

    # Find includes and imports
    inc_re = re.compile(r"{%\s*include\s+\"([a-zA-Z0-9_./-]+)\"(\s+\w+)*\s*%}")
    imp_re = re.compile(r"{%\s*import\s+\"([a-zA-Z0-9_./-]+)\"(\s+\w+)*\s*%}")
    line_no = 1
    with open(jinja_file) as f:
        jinja = f.read()
        jinja_f = StringIO(jinja)

    for line in jinja_f:
        m = inc_re.search(line) or imp_re.search(line)
        if m:
            try:
                _generate_jinja_hierarchy(m.group(1), search_dirs, file_list)
            except OSError:
                _log.LOGE("In %s:%d :" % (jinja_file, line_no))
                raise
        line_no += 1

    # Save current file to hierarchy
    file_list[alt_name if alt_name else jinja_name] = jinja


def jinja_config_webserver_base_dir():
    return "/opt/revsw-config/apache"


def jinja_config_webserver_dir(site_name):
    return os.path.join(jinja_config_webserver_base_dir(), site_name)


def jinja_config_varnish_base_dir():
    return "/opt/revsw-config/varnish"


def _write_template_files(files, output_dir):
    run_cmd("mkdir -p %s" % output_dir, _log, silent=True)

    for fname, content in files.iteritems():
        dirname = os.path.join(output_dir, os.path.dirname(fname))
        basename = os.path.basename(fname)
        run_cmd("mkdir -p %s" % dirname, _log, silent=True)
        with open(os.path.join(dirname, basename), "w") as f:
            f.write(content)


def _generate_schema(schema_name, search_dirs):
    # Must clone the list because we might insert paths in it
    search_dirs = list(search_dirs)
    schema_file = select_file_path(None, "%s.vars.schema" % schema_name, search_dirs, _log)
    schema_path = os.path.dirname(schema_file)

    # Also search in the directory containing the current schema
    if schema_path not in search_dirs:
        search_dirs.insert(0, schema_path)

    out = StringIO()

    # Find includes
    inc_re = re.compile(r"{%\s*include\s+\"([a-zA-Z0-9_./-]+)\"\s*%}")
    line_no = 1
    with open(schema_file) as f:
        for line in f:
            m = inc_re.search(line)
            if m:
                try:
                    out.write(line[:m.start()])
                    out.write(_generate_schema(m.group(1), search_dirs))
                    out.write(line[m.end():])
                except OSError:
                    _log.LOGE("In %s:%d :" % (schema_file, line_no))
                    raise
            else:
                out.write(line)
            line_no += 1

    ret = json.dumps(json.loads(out.getvalue()), indent=2)
    out.close()
    return ret


_g_webserver_name = None


class PlatformWebServer:
    def __init__(self):
        global _g_webserver_name
        if not _g_webserver_name:
            for pkg, name in (("revsw-apache2", "APACHE"), ("revsw-nginx-full", "NGINX")):
                try:
                    run_cmd("dpkg-query -s %s" % pkg, _log, silent=True)
                    if _g_webserver_name:
                        raise RuntimeError("Both Nginx and Apache are installed; please check your configuration")
                    _g_webserver_name = name
                except OSError:
                    pass
        if not _g_webserver_name:
            raise RuntimeError("Neither Nginx nor Apache are installed; please check your configuration")
        self._name = _g_webserver_name

    def _is_nginx(self):
        return self._name == "NGINX"

    def name(self):
        return self._name

    def service_name(self):
        return "revsw-nginx"

    def etc_dir(self):
        return "/etc/nginx"

    def config_class(self):
        return NginxConfig

class ConfigException(Exception):
    def __init__(self, message, error_domains):
        super(ConfigException, self).__init__(message)
        self.error_domains = set(error_domains)


class ConfigTransaction:
    """
    Runs commands one by one and saves a rollback for each (if applicable).
    If there's an error, it executes the rollback commands in reverse order.
    """

    backup_file = "/var/cache/revsw-apache-old-config.tar"
    file_idx = 0

    def __init__(self):
        self.rollbacks = []
        self.webserver_reload = False
        self.varnish_reload_cmd = None

        self.curr_idx = ConfigTransaction.file_idx
        ConfigTransaction.file_idx += 1

        varnish_dir = "/etc/varnish"
        if not os.path.exists(varnish_dir):
            varnish_dir = ""

        etc_dir = PlatformWebServer().etc_dir()

        self.run(lambda: run_cmd("rm -Rf /tmp/revsw-apache-config.%d.tar && tar cf /tmp/revsw-apache-config.%d.tar /opt/revsw-config/apache /opt/revsw-config/varnish %s/sites-enabled %s/sites-available %s --exclude=%s" %
                                 (self.curr_idx, self.curr_idx, etc_dir, etc_dir, varnish_dir, ConfigTransaction.backup_file),
                                 _log, "Backing up existing config"),
                 lambda: run_cmd("rm -Rf /opt/revsw-config/apache /opt/revsw-config/varnish %s/sites-enabled %s/sites-available %s && tar -C / -xf /tmp/revsw-apache-config.%d.tar" %
                                 (etc_dir, etc_dir, varnish_dir, self.curr_idx), _log, "Restoring previous config"))

    def rollback(self):
        while self.rollbacks:
            self.rollbacks.pop()()

    def run(self, cmd_func, rollback_func=None):
        try:
            cmd_func()
            if rollback_func:
                self.rollbacks.append(rollback_func)
        except:
            _log.LOGE("Transaction failed, rolling back")
            self.rollback()
            raise

    def schedule_webserver_reload(self):
        self.webserver_reload = True

    def schedule_varnish_reload(self):
        self.varnish_reload_cmd = "reload"

    def finalize(self):
        if self.webserver_reload:
            reload_func = NginxConfig.reload_or_start
            self.run(reload_func)

            # In case the Varnish reload fails, reload Apache again after the old config has been restored
            self.rollbacks.insert(0, reload_func)

        if self.varnish_reload_cmd:
            if VarnishConfig.varnish_is_installed():
                v_reload_cmd = self.varnish_reload_cmd
                try:
                    run_cmd("service revsw-varnish4 status", _log, "Checking if Varnish is running", True)
                except OSError:
                    v_reload_cmd = "start"
                VarnishConfig(transaction=self).write_config_file()

                def reload_varnish():
                    # Can't use run_cmd because we need the stderr output to determine which site(s) have caused
                    # failures.
                    child = subprocess.Popen("service revsw-varnish4 %s" % v_reload_cmd, shell=True,
                                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    (stdout, stderr) = child.communicate()

                    _log.LOGI("%sing Varnish" % v_reload_cmd.capitalize())
                    if child.returncode != 0:
                        for line in stderr.split("\n"):
                            _log.LOGE(line)
                        raise ConfigException("Varnish %s failed" % v_reload_cmd,
                                              VarnishConfig.get_error_domains(stderr))

                self.run(reload_varnish)
            else:
                _log.LOGI("Varnish is not installed; not %sing it" % self.varnish_reload_cmd)

        # Finally, save the previous config for reference
        run_cmd("mv -f /tmp/revsw-apache-config.%d.tar %s" %
                (self.curr_idx, ConfigTransaction.backup_file), _log,
                "Saving previous config to '%s'" % ConfigTransaction.backup_file)


def _webserver_write_command(f):
    def f_wrap(*args):
        obj = args[0]
        if not obj.transaction:
            raise AssertionError("The method requires write access but the Apache config object is read-only")
        f(*args)
        obj.transaction.schedule_webserver_reload()
    return f_wrap


def _varnish_write_command(f):
    def f_wrap(*args):
        obj = args[0]
        if not obj.transaction:
            raise AssertionError("The method requires write access but the Varnish config object is read-only")
        f(*args)
        obj.transaction.schedule_varnish_reload()
    return f_wrap


def _get_hostname_short_and_full():
    hostname_full = socket.gethostname()
    hostname_short = hostname_full.split(".", 1)[0]
    return hostname_short, hostname_full


class WebServerConfig:
    def __init__(self, site_name, transaction=None):
        self.site_name = site_name
        self.transaction = transaction

    @staticmethod
    def gather_template_files(template_file_no_ext, search_dirs):
        files = {
            "main.vars.schema": _generate_schema(template_file_no_ext, search_dirs)
        }

        _generate_jinja_hierarchy("%s.jinja" % template_file_no_ext, search_dirs, files,
                                  alt_name="main.jinja")
        return files

    @_webserver_write_command
    def write_template_files(self, files):
        self.transaction.run(lambda: _write_template_files(files, jinja_config_webserver_dir(self.site_name)))

    @_webserver_write_command
    def _fixup_certs(self):
        def do_fixup():
            def fixup_file(fname):
                fdir = os.path.join(jinja_config_webserver_dir(self.site_name), "certs")
                fpath = os.path.join(fdir, fname)
                if not os.path.exists(fpath):
                    run_cmd("mkdir -p %s && ln -f -s %s %s" %
                            (fdir, os.path.join(jinja_config_webserver_base_dir(), "generic-site", "certs", fname), fpath),
                            _log, "Creating default '%s'" % fname)

            fixup_file("ca-bundle.crt")
            fixup_file("server.crt")
            fixup_file("server-chained.crt")
            fixup_file("server.key")

        self.transaction.run(do_fixup)

    @_webserver_write_command
    def write_certs(self, cert, key, ca_bundle):
        def write_certs():
            certs_dir = os.path.join(jinja_config_webserver_dir(self.site_name), "certs")

            run_cmd("rm -Rf %s" % certs_dir, _log,
                    "Removing directory '%s' if it exists" % certs_dir)

            run_cmd("mkdir -p %s" % certs_dir, _log,
                    "Creating directory '%s" % certs_dir)

            _log.LOGI("Creating certificate files")
            base64_string_gzip_to_file(cert, "%s/server.crt" % certs_dir)
            base64_string_gzip_to_file(key, "%s/server.key" % certs_dir)
            base64_string_gzip_to_file(ca_bundle, "%s/ca-bundle.crt" % certs_dir)

            run_cmd("cat %s/server.crt %s/ca-bundle.crt > %s/server-chained.crt" % (certs_dir, certs_dir, certs_dir),
                    _log, "Creating server-chained.crt")
            run_cmd("chmod 0400 %s/server.key %s/server-chained.crt" % (certs_dir, certs_dir),
                    _log, "Fixing permissions")

        self.transaction.run(write_certs)

    def _template_file_no_ext(self):
        return os.path.join(jinja_config_webserver_dir(self.site_name), "main")

    def exists(self):
        return \
            os.path.exists("%s.json" % self._template_file_no_ext()) and \
            os.path.exists("%s.jinja" % self._template_file_no_ext()) and \
            os.path.exists("%s.vars.schema" % self._template_file_no_ext())

    def load_input_vars(self):
        with open("%s.json" % self._template_file_no_ext()) as f:
            return json.load(f)

    @staticmethod
    def _site_name_from_config_file(path):
        m = re.match(r"(/etc/(apache2|nginx)/sites-(available|enabled)/)?([\w-]+)\.conf", path)
        if not m:
            raise AssertionError("Invalid web server config file path '%s'" % path)
        return m.group(4)

class NginxConfig(WebServerConfig):
    @_webserver_write_command
    def disable_all_sites(self):
        self.transaction.run(lambda: run_cmd("rm -f /etc/nginx/sites-enabled/*", _log, "Disabling all sites"))
        #self.transaction.run(lambda: run_cmd("a2ensite 000-catch-all || true", _log, "Enabling catch-all error site"))

    @_webserver_write_command
    def remove_site(self):
        self.transaction.run(lambda: run_cmd("rm -f /etc/nginx/sites-enabled/%s.conf" % self.site_name, _log,
                                             "Disabling site '%s' if it exists" % self.site_name))
        self.transaction.run(lambda: run_cmd("rm -f /etc/nginx/sites-available/%s.conf" % self.site_name, _log,
                                             "Removing site '%s' if it exists" % self.site_name))
        self.transaction.run(lambda: run_cmd("rm -Rf %s" % jinja_config_webserver_dir(self.site_name), _log,
                                             "Removing site '%s' templates, if they exist" % self.site_name))

    @_webserver_write_command
    def configure_site(self, input_vars):
        def do_write():
            search_dirs = [jinja_config_webserver_dir(self.site_name)]
            template_file_no_ext = self._template_file_no_ext()

            _log.LOGD("Loading template %s" % template_file_no_ext)
            with open("%s.jinja" % template_file_no_ext) as f:
                template_str = f.read()

            _log.LOGD("Loading vars schema %s" % template_file_no_ext)
            with open("%s.vars.schema" % template_file_no_ext) as f:
                schema = json.load(f, object_pairs_hook=dict_raise_on_duplicates)

            _log.LOGD("Validating input vars from JSON")
            jsch.validate(input_vars, schema, format_checker=jsch.FormatChecker())


            env = ImmutableSandboxedEnvironment(
                line_statement_prefix=None,
                trim_blocks=True,
                lstrip_blocks=True,
                loader=jinja2.FileSystemLoader(search_dirs),
                undefined=StrictUndefined
            )

            (hostname_short, hostname_full) = _get_hostname_short_and_full()

            env.filters["flatten_to_set"] = flatten_to_set
            env.filters["parse_url"] = parse_url
            env.filters["dns_query"] = dns_query
            env.filters["underscore_url"] = underscore_url
            env.filters["is_ipv4"] = is_ipv4
            env.filters["wildcard_to_regex"] = wildcard_to_regex
            env.filters["extract_custom_webserver_code"] = extract_custom_webserver_code
            env.filters["netmask_bits"] = netmask_bits
            env.globals["global_var_get"] = global_var_get
            env.globals["global_var_set"] = global_var_set
            env.globals["GLOBAL_SITE_NAME"] = self.site_name
            env.globals["HOSTNAME_FULL"] = hostname_full
            env.globals["HOSTNAME_SHORT"] = hostname_short
            env.globals["DNS_SERVERS"] = dns_servers()

            env.globals["bypass_location_root"] = False

            template = env.from_string(template_str)
            cfg = template.render(input_vars)

            cfg = cfg.replace('\r', '\n')
            cfg = cfg.replace('\n\n', '\n')
            cfg = cfg.replace('\n\n', '\n')

            conf_file_name = "/etc/nginx/sites-available/%s.conf" % self.site_name

            with open(conf_file_name + ".tmp", "w") as f:
                f.write(cfg)

            # re-formatting Nginx config file:
            run_cmd("cat %(INPUT)s.tmp | /opt/revsw-config/bin/conf_files_formatter.sh > %(OUTPUT)s && mv %(INPUT)s.tmp /tmp/" % \
                    {"INPUT": conf_file_name, "OUTPUT": conf_file_name}, _log, "re-formatting %s file" % conf_file_name)
            # .

            _log.LOGD("Generated Nginx config file")

            # Make sure the site has at least the default certs
            self._fixup_certs()

            run_cmd("cd /etc/nginx/sites-enabled && ln -sf /etc/nginx/sites-available/%s.conf" % self.site_name,
                    _log, "Enabling site '%s' if necessary" % self.site_name)

            _log.LOGD("Saving input vars")
            with open("%s.json" % template_file_no_ext, "w") as f:
                json.dump(input_vars, f, indent=2)

        self.transaction.run(do_write)

    @staticmethod
    def get_error_domains(stderr):
        err_domains = set()
        line_domain_re = re.compile(r"Syntax error on line (\d+) of ([^:]+):")
        server_name_re = re.compile("^\s*ServerName\s+((?!-)[A-Z\d-]{1,63}(?<!-)(\.(?!-)[A-Z\d-]{1,63}(?<!-))*)\s*$",
                                    re.IGNORECASE)

        for l in stderr.split("\n"):
            m = line_domain_re.search(l)
            if m:
                # Find domain name by looking at the ServerName directive
                with open(m.group(2)) as f:
                    for line in f:
                        m = server_name_re.match(line)
                        if m:
                            err_domains.add(m.group(1))
                            break
        return err_domains

    @staticmethod
    def get_all_active_domains():
        domains = []
        base_dir = "/opt/revsw-config/apache/"
        paths = os.listdir(base_dir)
        for name in paths:
            if name.endswith("generic-site") or name.endswith("co-certs"):
                continue
            main_file = base_dir + name + "/main.json"
            json_main = open(main_file).read()
            main_config = json.loads(json_main)
            domains.append(main_config['bp']['SERVER_NAME'])
        return domains

    @staticmethod
    def reload_or_start():
        reload_cmd = "reload"
        try:
            run_cmd("service revsw-nginx status", _log, "Checking if Nginx is running", True)
        except OSError:
            reload_cmd = "start"

        # Is our config valid ?
        # Can't use run_cmd because we need the stderr output to determine which site(s) have caused
        # failures.
        _log.LOGI("Checking Nginx config")
        child = subprocess.Popen("service revsw-nginx configtest", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        (stdout, stderr) = child.communicate()

        if child.returncode != 0:
            for line in stderr.split("\n"):
                _log.LOGE(line)
            raise ConfigException("Nginx config check failed",
                                  NginxConfig.get_error_domains(stderr))

        run_cmd("service revsw-nginx %s" % reload_cmd, _log, "%sing Nginx" % reload_cmd.capitalize(), True)


class VarnishConfig:
    def __init__(self, site_name=None, transaction=None):
        self.site_name = site_name
        self.transaction = transaction
        self.search_path = []

    @staticmethod
    def varnish_is_installed():
        try:
            run_cmd("which varnishd", _log, silent=True)
        except OSError:
            return False
        return True

    def _lazy_load_template(self, search_path=None):
        if not search_path:
            search_path = [jinja_config_varnish_base_dir()]

        if self.search_path == search_path:
            return

        (hostname_short, hostname_full) = _get_hostname_short_and_full()

        self.env = ImmutableSandboxedEnvironment(
            line_statement_prefix=None,
            trim_blocks=True,
            lstrip_blocks=True,
            loader=jinja2.FileSystemLoader(search_path),
            undefined=StrictUndefined
        )
        self.env.filters["flatten_to_set"] = flatten_to_set
        self.env.filters["parse_url"] = parse_url
        self.env.filters["dns_query"] = dns_query
        self.env.filters["underscore_url"] = underscore_url
        self.env.filters["wildcard_to_regex"] = wildcard_to_regex
        self.env.filters["custom_backend_name"] = custom_backend_name
        self.env.filters["process_custom_vcl"] = process_custom_vcl
        self.env.filters["netmask_bits"] = netmask_bits
        self.env.globals["global_var_get"] = global_var_get
        self.env.globals["global_var_set"] = global_var_set
        self.env.globals["HOSTNAME_FULL"] = hostname_full
        self.env.globals["HOSTNAME_SHORT"] = hostname_short
        self.varn_template = self.env.get_template("varnish.jinja")
        _log.LOGD("Loaded Varnish template:", self.varn_template.filename)

        _log.LOGD("Loading vars schema")
        self.input_vars_schema = json.loads(_generate_schema("varnish", search_path))

        self.search_path = search_path

    def gather_template_files(self, search_path=None):
        self._lazy_load_template(search_path)
        files = {
            "varnish.jinja": self.env.loader.get_source(self.env, "varnish.jinja")[0],
            "varnish.vars.schema": json.dumps(self.input_vars_schema, indent=2)
        }
        return files

    @_varnish_write_command
    def write_template_files(self, files):
        self.transaction.run(lambda: _write_template_files(files, jinja_config_varnish_base_dir()))

    @_varnish_write_command
    def write_config_file(self, search_path=None):
        """
        Read all JSON config files in /etc/varnish/sites, merge them into a large JSON and
        regenerate the Varnish VCL from a template, then tell Varnish to reload the config.
        """
        def do_write():
            sites = []

            _log.LOGI("Loading input vars from JSON")
            fnames = sorted(["/opt/revsw-config/varnish/sites/%s.json" % _(dom) for dom in
                             NginxConfig.get_all_active_domains()])
            _log.LOGI("  -> files: ", fnames)

            for fname in fnames:
                with open(fname) as f:
                    site = json.load(f, object_pairs_hook=dict_raise_on_duplicates)
                    sites.append(site)

            input_vars = {"sites": sites}
            #_log.LOGD(json.dumps(input_vars, indent=2))

            self._lazy_load_template(search_path)
            jsch.validate(input_vars, self.input_vars_schema, format_checker=jsch.FormatChecker())
            cfg = self.varn_template.render(input_vars)

            #_log.LOGI("Generated VCL:", cfg)

            cfg = cfg.replace('\r', '\n')
            cfg = cfg.replace('\n\n', '\n')
            cfg = cfg.replace('\n\n', '\n')

            conf_file_name = "/etc/varnish/revsw.vcl"

            with open(conf_file_name + ".tmp", "w") as f:
                f.write(cfg)

            # re-formatting Varnish config file:
            run_cmd("cat %(INPUT)s.tmp | /opt/revsw-config/bin/conf_files_formatter.sh > %(OUTPUT)s && mv %(INPUT)s.tmp /tmp/" % \
                    {"INPUT": conf_file_name, "OUTPUT": conf_file_name}, _log, "re-formatting %s file" % conf_file_name)
            # .

        self.transaction.run(do_write)

    def load_site_config(self):
        with open(self.site_config_path()) as f:
            site = json.load(f, object_pairs_hook=dict_raise_on_duplicates)
        return site

    def site_config_path(self):
        if not self.site_name:
            raise AssertionError("'site_config_path' requires the site name but the object is global")
        return "/opt/revsw-config/varnish/sites/%s.json" % self.site_name

    def remove_site(self):
        self.transaction.run(lambda: run_cmd("rm -f %s" % self.site_config_path(), _log, "Removing Varnish config"))

    @_varnish_write_command
    def config_site(self, config):
        def do_add():
            cfg_dir = os.path.dirname(self.site_config_path())
            if not os.path.exists(cfg_dir):
                run_cmd("mkdir -p %s" % cfg_dir, _log, "Creating Varnish config dir")
            with open(self.site_config_path(), "w") as f:
                json.dump(config, f, indent=2)

        self.transaction.run(do_add)

    @staticmethod
    def _extract_domain_locations_from_vcl():
        domain_locations = []
        with open("/etc/varnish/revsw.vcl", "rt") as f:
            begin_re = re.compile(r"^\s*# BEGIN SITE\s+'(.+)'$")
            end_re = re.compile(r"^\s*# END SITE\s+'(.+)'$")

            curr_site = None
            curr_begin_line = 0
            line_no = 1
            for l in f:
                m = begin_re.match(l)
                if m:
                    if curr_site:
                        raise SyntaxError("Found 'BEGIN SITE' inside another 'BEGIN SITE' at line %d" % line_no)
                    curr_site = m.group(1)
                    curr_begin_line = line_no
                else:
                    m = end_re.match(l)
                    if m:
                        if not curr_site:
                            raise SyntaxError("Found 'END SITE' without matching 'BEGIN SITE' at line %d" % line_no)
                        domain_locations.append({"start": curr_begin_line, "end": line_no, "domain": curr_site})
                        curr_site = None
                line_no += 1
        return domain_locations

    @staticmethod
    def _find_domain_for_vcl_line(domain_locations, line_no):
        left = 0
        right = len(domain_locations)
        while left < right:
            idx = left + (right - left) / 2
            dom = domain_locations[idx]
            if dom["start"] <= line_no:
                if line_no <= dom["end"]:
                    return dom["domain"]
                else:
                    left = idx + 1
            else:
                right = idx
        return None

    @staticmethod
    def get_error_domains(stderr):
        err_domains = set()
        domain_locations = VarnishConfig._extract_domain_locations_from_vcl()
        line_col_re = re.compile(r"^\('input' Line (\d+) Pos (\d+)\)")
        for l in stderr.split("\n"):
            m = line_col_re.match(l)
            if m:
                domain = VarnishConfig._find_domain_for_vcl_line(domain_locations, int(m.group(1)))
                if domain:
                    err_domains.add(domain)
        return err_domains

def _check_and_get_attr(command, attr):
    val = command.get(attr, None)
    if not val:
        raise AttributeError("'%s' not specified; ignoring config" % attr)
    return val


def configure_all(config):
    if "version" not in config:
        raise AttributeError("No version info in configuration")
    if config["version"] != API_VERSION:
        raise AttributeError("Incompatible version %d in configuration; expected %d" %
                             (config["version"], API_VERSION))

    transaction = ConfigTransaction()

    for command in config["commands"]:
        action = _check_and_get_attr(command, "type")
        if not action:
            raise AttributeError("Action not specified; ignoring")

        if action == "flush" or action == "varnish_template" or action == "mlogc_template":
            site = "*"
        else:
            site = _check_and_get_attr(command, "site_name")
            if not site:
                raise AttributeError("Site not specified; ignoring")

        acfg = NginxConfig(site, transaction)
        vcfg = VarnishConfig(site, transaction)

        _log.LOGI("Got request for site '%s', action '%s'" % (site, action))

        if action == "flush":
            _log.LOGD("Removing all sites")
            acfg.disable_all_sites()

            # If site == '*', remove_site() will remove all sites
            vcfg.remove_site()

        elif action == "varnish_template":
            _log.LOGD("Writing Varnish template")
            vcfg.write_template_files(_check_and_get_attr(command, "templates"))

        elif action == "delete":
            _domain_name = _check_and_get_attr(command, "domain_name")
            transaction.run(lambda: run_cmd("rm -f /opt/revsw-config/policy/ui-config-%s.json" % _domain_name, _log,
                                            "Removing policy '%s' if it exists" % _domain_name))
            acfg.remove_site()
            vcfg.remove_site()
            _log.LOGD("Removing site '%s'" % _domain_name)

        elif action == "batch":
            _log.LOGD("Batch configuring site '%s'" % site)
            templates = command.get("templates")

            if templates:
                if not "nginx" in templates:
                    raise AttributeError("Config templates don't presented")
                real_templates = templates["nginx"]
                _log.LOGD("Writing Jinja templates")
                acfg.write_template_files(real_templates)

            cfg_vars = _check_and_get_attr(command, "config_vars")
            acfg.configure_site(cfg_vars)

            varnish_config_vars = command.get("varnish_config_vars")
            if varnish_config_vars:
                vcfg.config_site(varnish_config_vars)
                transaction.varnish_reload_cmd = None
            transaction.webserver_reload = False

        elif action == "config":
            _log.LOGD("Configuring site '%s'" % site)

            templates = command.get("templates")

            if templates:
                if not "nginx" in templates:
                    raise AttributeError("Config templates don't presented")
                real_templates = templates["nginx"]
                _log.LOGD("Writing Jinja templates")
                acfg.write_template_files(real_templates)

            cfg_vars = _check_and_get_attr(command, "config_vars")
            acfg.configure_site(cfg_vars)

            varnish_changed_vars = config["varnish_changed"]
            varnish_config_vars = command.get("varnish_config_vars")
            if varnish_changed_vars:
                if varnish_config_vars:
                    vcfg.config_site(varnish_config_vars)
                else:   # Varnish not needed for site, remove if present
                    vcfg.remove_site()
            else:
                if varnish_config_vars:
                    vcfg.config_site(varnish_config_vars)
                    transaction.varnish_reload_cmd = None
                    _log.LOGD("No changes in Varnish configuration")

            config_changed_vars = config["config_changed"]
            if config_changed_vars:
                transaction.webserver_reload = True
            else:
                transaction.webserver_reload = False
            _log.LOGD("Config changed: ", transaction.webserver_reload)

        elif action == "certs":
            _log.LOGD("Configuring site '%s' certificates" % site)
            certs = _check_and_get_attr(command, "certs")
            acfg.write_certs(certs["crt"], certs["key"], certs["ca-bundle"])

        else:
            raise AttributeError("Invalid action '%s'" % action)

    # Reload the configs and save the old config
    _log.LOGD("Webserver reload status: '%s'" % transaction.webserver_reload)
    _log.LOGD("Varnish reload status: '%s'" % transaction.varnish_reload_cmd)
    transaction.finalize()
