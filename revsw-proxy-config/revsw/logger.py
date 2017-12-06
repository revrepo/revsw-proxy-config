import syslog


class RevSysLogger:
    def __init__(self, verbose=True):
        self.verbose = verbose

    def _log_args(self, level, prefix, *args):
        msg = " ".join(map(str, args))
        for line in msg.splitlines():
            syslog.syslog(level, line)
            print prefix, line

    def LOGD(self, *args):
        if not self.verbose:
            return
        self._log_args(syslog.LOG_DEBUG, "DEBUG:", *args)

    def LOGI(self, *args):
        self._log_args(syslog.LOG_INFO, "INFO:", *args)

    def LOGE(self, *args):
        self._log_args(syslog.LOG_ERR, "ERROR:", *args)

    def LOGW(self, *args):
        self._log_args(syslog.LOG_WARNING, "WARNING:", *args)


class RevStdLogger:
    def __init__(self, verbose=True):
        self.verbose = verbose

    def _log_args(self, prefix, *args):
        msg = " ".join(map(str, args))
        for line in msg.splitlines():
            print prefix, line

    def LOGD(self, *args):
        if not self.verbose:
            return
        self._log_args("DEBUG:", *args)

    def LOGI(self, *args):
        self._log_args("INFO:", *args)

    def LOGE(self, *args):
        self._log_args("ERROR:", *args)

    def LOGW(self, *args):
        self._log_args("WARNING:", *args)
