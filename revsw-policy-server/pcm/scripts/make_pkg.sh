# IMP: this may need changes based on where the files are located. 
# please make changes before using this script.
mkdir server
cp /home/sidde/enzo_dev/eng/enzo/install/packages_server.tar server
cp /home/sidde/enzo_dev/eng/enzo/install/revsw-pkgs-common.inc server
cp /home/sidde/enzo_dev/eng/enzo/install/upgrade-revsw-server-packages.sh server
cp /home/sidde/enzo_dev/eng/enzo/install/revsw-check-latest-pkg.py server
cp /home/sidde/enzo_dev/eng/enzo/install/co-install.sh server
cp /home/sidde/enzo_dev/eng/enzo/install/bp-install.sh server
mkdir config
cp /home/sidde/enzo_dev/eng/enzo/install/packages_config.tar config
cp /home/sidde/enzo_dev/eng/enzo/install/revsw-pkgs-common.inc config
cp /home/sidde/enzo_dev/eng/enzo/install/upgrade-revsw-config-packages.sh config
cp /home/sidde/enzo_dev/eng/enzo/install/revsw-check-latest-pkg.py config
cp /home/sidde/enzo_dev/eng/enzo/install/config-client-install.sh config
cp /home/sidde/enzo_dev/eng/enzo/install/config-server-install.sh config
cd server
tar cvzf RevSw_DataPath_server_pkg_$1.tgz *
cd ../config
tar cvzf RevSw_DataPath_config_pkg_$1.tgz *
cd ../
