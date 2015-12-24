#!/bin/bash -e

export PATH=`pwd`/..:$PATH

COs="localhost"

# For Ubuntu package creation
OUT_DIR=../../generic-site

mkdir -p $OUT_DIR

cat <<EOF |
bps proxy_config-generic.1234
domain generic-domain.1234 \
	ows ows-generic-server.1234 \
	ows-domain ows-generic-domain.1234 \
	optimizers $COs \
	http https
EOF
apache-gen-config-script.py --no-flush --no-send --no-co --copy-to $OUT_DIR/proxy_config.json

chmod +x configure.sh
./configure.sh

exit 0
