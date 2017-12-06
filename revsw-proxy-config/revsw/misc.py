from StringIO import StringIO
import base64
import gzip
import os.path
import subprocess

def dict_raise_on_duplicates(ordered_pairs):
    """
    Reject duplicate keys.
    """
    d = {}
    for k, v in ordered_pairs:
        if k in d:
            raise ValueError("Duplicate key: %r" % k)
        else:
            d[k] = v
    return d


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



def select_file_path(fname, alt_fname, paths_to_search, logger):
    """
    Selects either fname (if defined), alt_fname (if it starts with /)
    or searches for alt_fname in paths_to_search and selects the first match.
    """
    if fname:
        logger.LOGD("Using explicit file path '%s'" % fname)
        return fname
    elif alt_fname[0] == '/':
        return alt_fname
    for p in paths_to_search:
        fp = "%s/%s" % (p, alt_fname)
        if os.path.exists(fp):
            logger.LOGD("Using detected file path '%s'" % fp)
            return fp
    raise OSError("Can't find '%s' in search path" % alt_fname)


def file_to_gzip_base64_string(path):
    """
    Returns a BASE64 representation of the gzipped contents of file whose path is 'path'.
    """
    with open(path, "rb") as f:
        gz_buf = StringIO()
        gz = gzip.GzipFile(mode="wb", fileobj=gz_buf)
        gz.write(f.read())
        gz.close()
        return base64.encodestring(gz_buf.getvalue())


def base64_string_gzip_to_file(data, path):
    """
    Decodes the BASE64 encoded data, then unzips it into a file whose path is 'path'.
    """
    with open(path, "wb") as f:
        gz_buf = StringIO(base64.decodestring(data))
        gz = gzip.GzipFile(mode="rb", fileobj=gz_buf)
        f.write(gz.read())
        gz.close()

