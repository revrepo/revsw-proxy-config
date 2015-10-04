#!/bin/bash

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

foldername=$PACKAGENAME'_'$VERSION

mkdir -p $foldername/DEBIAN
touch $foldername/DEBIAN/control

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
Homepage: www.revsw.com" >> $foldername/DEBIAN/control

DST='opt/revsw-config'

mkdir -p $foldername/$DST/bin
mkdir -p $foldername/$DST/policy
mkdir -p $foldername/$DST/log
mkdir -p $foldername/$DST/apache/generic-site
mkdir -p $foldername/$DST/varnish/sites
mkdir -p $foldername/$DST/templates/all/bp
mkdir -p $foldername/etc

# copy packaging files to the structured tree:

# conf
cp $WORKSPACE/certs/conf-tools/*.pem $foldername/$DST
cp -r $WORKSPACE/revsw-proxy-config/*.py $foldername/$DST/bin
cp -r $WORKSPACE/revsw-proxy-config/*.sh $foldername/$DST/bin
cp -r $WORKSPACE/generic-site $foldername/$DST/apache
cp -r $WORKSPACE/revsw-proxy-config/templates/all/bp/* $foldername/$DST/varnish/
cp -r $WORKSPACE/revsw-proxy-config/templates/all/bp/* $foldername/$DST/templates/all/bp

# pol
cp -r $WORKSPACE/revsw-policy-server/pcm/install/init.d $foldername/etc/
cp $WORKSPACE/revsw-policy-server/pcm/install/revsw-pcm-config $foldername/$DST/bin
cp $WORKSPACE/revsw-policy-server/pcm/install/revsw-pcm-purge $foldername/$DST/bin
cp $WORKSPACE/revsw-policy-server/lib/librev_infra.so $foldername/$DST/bin

cp -r $WORKSPACE/DEBIAN $foldername/

sudo chown -R root:root $foldername

time dpkg -b $foldername  $WORKSPACE/$PACKAGEDIR/$foldername.deb
