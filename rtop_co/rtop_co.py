# FIle for monkey patching  ngxtop lib for reading other log file
import os

import ngxtop.ngxtop
import ngxtop.config_parser
import logging

import sys

from docopt import docopt
from ngxtop.utils import error_exit


NGINX_LOG_CO = "/var/log/nginx/revsw_nginx_access_json_co.log"


def detect_log_config(arguments):
    """
    Detect access log config (path and format) of nginx. Offer user to select if multiple access logs are detected.
    :return: path and format of detected / selected access log
    """
    config = arguments['--config']
    if config is None:
        config = ngxtop.ngxtop.detect_config_path()
    if not os.path.exists(config):
        error_exit('Nginx config file not found: %s' % config)

    with open(config) as f:
        config_str = f.read()

    access_logs = {NGINX_LOG_CO: "logstash_json_co"}
    print(access_logs)
    if not access_logs:
        error_exit('Access log file is not provided and ngxtop cannot detect it from your config file (%s).' % config)

    log_formats = dict(ngxtop.config_parser.get_log_formats(config_str))
    if len(access_logs) == 1:
        log_path, format_name = access_logs.items()[0]
        if format_name == 'combined':
            return log_path, ngxtop.config_parser.LOG_FORMAT_COMBINED
        if format_name not in log_formats:
            error_exit('Incorrect format name set in config for access log file "%s"' % log_path)
        return log_path, log_formats[format_name]

    # multiple access logs configured, offer to select one
    print('Multiple access logs detected in configuration:')
    log_path = NGINX_LOG_CO
    format_name = "logstash_json_co"
    if format_name not in log_formats:
        error_exit('Incorrect format name set in config for access log file "%s"' % log_path)
    return log_path, log_formats[format_name]


def process(arguments):
    access_log = arguments['--access-log']
    log_format = arguments['--log-format']
    if access_log is None and not sys.stdin.isatty():
        # assume logs can be fetched directly from stdin when piped
        access_log = 'stdin'
    if access_log is None:
        access_log, log_format = detect_log_config(arguments)

    logging.info('access_log: %s', access_log)
    logging.info('log_format: %s', log_format)
    if access_log != 'stdin' and not os.path.exists(access_log):
        error_exit('access log file "%s" does not exist' % access_log)

    if arguments['info']:
        print('nginx configuration file:\n ', ngxtop.config_parser.detect_config_path())
        print('access log file:\n ', access_log)
        print('access log format:\n ', log_format)
        print('available variables:\n ', ', '.join(sorted(ngxtop.config_parser.extract_variables(log_format))))
        return

    source = ngxtop.ngxtop.build_source(access_log, arguments)
    pattern = ngxtop.ngxtop.build_pattern(log_format)
    processor = ngxtop.ngxtop.build_processor(arguments)
    ngxtop.ngxtop.setup_reporter(processor, arguments)
    ngxtop.ngxtop.process_log(source, pattern, processor, arguments)


def main():
    args = docopt(ngxtop.ngxtop.__doc__, version='xstat 0.1')

    log_level = logging.WARNING
    if args['--verbose']:
        log_level = logging.INFO
    if args['--debug']:
        log_level = logging.DEBUG
    logging.basicConfig(level=log_level, format='%(levelname)s: %(message)s')
    logging.debug('arguments:\n%s', args)

    try:
        process(args)
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == '__main__':
    main()
