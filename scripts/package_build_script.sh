#!/bin/bash -e

#
# This script builds Rev Proxy Configuration Management Debian package
#

if [ -z "$WORKSPACE" ]; then
        echo "ERROR: WORKSPACE env. variable is not set"
        exit 1
fi
if [ -z "$BUILD_NUMBER" ]; then
        echo "ERROR: BUILD_NUMBER env. variable is not set"
        exit 1
fi
if [ -z "$VERSION" ]; then
        VERSION=1.0.$BUILD_NUMBER
        echo "INFO: VERSION env variable is not set - setting it to $VERSION"
fi
PACKAGENAME=revsw-proxy-config
PACKAGEDIR=packages

if [ ! -d $PACKAGEDIR ]; then
        echo "INFO: Directory $PACKAGEDIR does not exist - creating it..."
        mkdir $PACKAGEDIR
        if [ $? -ne 0 ]; then
                echo "ERROR: Failed to create directory $PACKAGEDIR - aborting"
                exit 1
        fi
fi

# building:
make
# .

WORKDIR="package_build_dir"

sudo rm -rf $WORKDIR
mkdir $WORKDIR
cd $WORKDIR

if [ $? -ne 0 ]; then
  echo "FATAL: Failed to CD to directory $WORKDIR"
  exit 1
fi

FOLDERNAME=$PACKAGENAME'_'$VERSION
mkdir -p "$FOLDERNAME/DEBIAN"
touch $FOLDERNAME/DEBIAN/control

PackageName=$PACKAGENAME
PackageVersion=$VERSION
MaintainerName="Victor Brunko"
MaintainerEmail=vbrunko@revsw.com

echo "Package: $PackageName
Version: $PackageVersion
Architecture: amd64
Maintainer: $MaintainerName <$MaintainerEmail>
Installed-Size: 26
Section: unknown
Priority: extra
Depends: python-jinja2 (>= 2.7), python-jsonschema (>= 2.3), python-dnspython, libwebsockets3, libwebsockets-dev
Description: Rev Proxy Configuration Service
Preinst: preinst
Postinst: postinst
Homepage: www.revsw.com" >> $FOLDERNAME/DEBIAN/control

DST='opt/revsw-config'

mkdir -p $FOLDERNAME/$DST/bin
mkdir -p $FOLDERNAME/$DST/lib
mkdir -p $FOLDERNAME/$DST/policy
mkdir -p $FOLDERNAME/$DST/log
mkdir -p $FOLDERNAME/$DST/apache/generic-site
mkdir -p $FOLDERNAME/$DST/varnish/sites
mkdir -p $FOLDERNAME/$DST/templates/all/bp
mkdir -p $FOLDERNAME/etc/nginx/conf.d
mkdir -p $FOLDERNAME/usr/share/revsw-libapache2-mod-rev-js-substitute/rev-js

# copy packaging files to the structured tree:

# conf
cp $WORKSPACE/certs/conf-tools/*.pem $FOLDERNAME/$DST
cp -r $WORKSPACE/revsw-proxy-config/*.py $FOLDERNAME/$DST/bin
cp -r $WORKSPACE/revsw-proxy-config/*.sh $FOLDERNAME/$DST/bin
cp -r $WORKSPACE/revsw-proxy-config/revsw_apache_config $FOLDERNAME/$DST/bin
cp -r $WORKSPACE/revsw-proxy-config/revsw $FOLDERNAME/$DST/bin
cp -r $WORKSPACE/generic-site $FOLDERNAME/$DST/apache
cp -r $WORKSPACE/revsw-proxy-config/templates/all/bp/* $FOLDERNAME/$DST/varnish/
cp -r $WORKSPACE/revsw-proxy-config/templates/all/bp/* $FOLDERNAME/$DST/templates/all/bp

# pol
cp -r $WORKSPACE/revsw-policy-server/pcm/install/init.d $FOLDERNAME/etc/
cp $WORKSPACE/revsw-policy-server/pcm/install/revsw-pcm-config $FOLDERNAME/$DST/bin
cp $WORKSPACE/revsw-policy-server/pcm/install/revsw-pcm-purge $FOLDERNAME/$DST/bin
cp $WORKSPACE/revsw-policy-server/lib/librev_infra.so $FOLDERNAME/$DST/lib

# Nginx configuration
cp -r $WORKSPACE/revsw-proxy-config/configs/nginx/conf.d/000-revsw-proxy.conf $FOLDERNAME/etc/nginx/conf.d/

# js
cp -r $WORKSPACE/rev_js_substitute/js/*  $FOLDERNAME/usr/share/revsw-libapache2-mod-rev-js-substitute/rev-js

cp -r $WORKSPACE/DEBIAN $FOLDERNAME/ || 1

sudo chown -R root:root $FOLDERNAME || 1

dpkg -b $FOLDERNAME $WORKSPACE/$PACKAGEDIR/$FOLDERNAME.deb || 1

exit 0
