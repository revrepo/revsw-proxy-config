
import ngxtop.ngxtop
import ngxtop.config_parser

from mock import MagicMock


ngxtop.config_parser.choose_one = MagicMock(return_value='/var/logs/nginx/revsw_nginx_access_json_co.log')


if __name__ == '__main__':

    ngxtop.ngxtop.main()