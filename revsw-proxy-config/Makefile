all:
	(cd generic-site; ./generate-generic-config.sh)

install:
	(cd generic-site; ./generate-generic-config.sh)
	cp ../certs/conf-tools/*.pem /opt/revsw-config
	cp -r *.py /opt/revsw-config/bin
	cp -r *.sh /opt/revsw-config/bin
	cp -r revsw_apache_config/ /opt/revsw-config/bin
	cp -r templates/all/bp/* /opt/revsw-config/varnish/
	cp -r templates/all/bp/* /opt/revsw-config/templates/all/bp