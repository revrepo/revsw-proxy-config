#!/bin/bash

# Yet fixed version
VERSION='1.0.1'
TODAYS_PACKAGE='revsw-config-'$VERSION
TMP=/tmp/$(date +%F)
DST='opt/revsw-config'
ETC='etc'
USRLIB='usr/lib'

# make tmp dirs for packaging:
rm -rf $TMP
mkdir -p $TMP/$DST/bin
mkdir -p $TMP/$DST/policy
mkdir -p $TMP/$DST/log
mkdir -p $TMP/$DST/apache
mkdir -p $TMP/$DST/varnish/sites
mkdir -p $TMP/$DST/templates
mkdir -p $TMP/$ETC/
mkdir -p $TMP/$USRLIB/
# .

# build policy and purge server
cd revsw-policy-server/
make
cd ../
# .

# copy packaging files to the structured tree:
cp certs/conf-tools/*.pem $TMP/$DST

cp -r revsw-proxy-config/* $TMP/$DST/bin

cp -r revsw-policy-server/pcm/install/init.d $TMP/etc/
cp revsw-policy-server/pcm/install/revsw-pcm-config $TMP/$DST/bin
cp revsw-policy-server/pcm/install/revsw-pcm-purge $TMP/$DST/bin
cp revsw-policy-server/lib/librev_infra.so $TMP/$USRLIB/

cp -r DEBIAN $TMP
# .

# build:
dpkg-deb --build $TMP
mv $TMP.deb $TMP/$TODAYS_PACKAGE.deb
echo
echo
echo "New package is here:"$TMP/$TODAYS_PACKAGE.deb
echo
echo
# .
