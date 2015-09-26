#!/bin/bash

### BEGIN INIT INFO
# Provides:          apache-config-listener
# Required-Start:    $remote_fs $syslog $network
# Required-Stop:     $remote_fs $syslog $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: PCM install script
# Description:       Install pcmc and pcms in /etc/init.d and start process 
### END INIT INFO

# INSTALL CONFIG PROCESS
PCMC_BIN_FILE="pcmc"
PCMC_RC_FILE="init.d/pcmc"
REV_OPT_REVSW_CONFIG_BIN=/opt/revsw-config/bin/

if [ -s $PCMC_BIN_FILE ]; then
    sudo cp $PCMC_BIN_FILE $REV_OPT_REVSW_CONFIG_BIN
else {
    echo "could not find $PCMC_BIN_FILE"
    exit
}
fi

echo "copied $PCMC_BIN_FILE to $REV_OPT_REVSW_CONFIG_BIN"

# COPY RC SCRIPT
if [ -s $PCMC_RC_FILE ]; then
    sudo cp pcmc /etc/init.d/
else {
    echo "could not find $PCMC_RC_FILE"
    exit
}
fi

echo "copied $PCMC_RC_FILE under /etc/init.d"

sudo update-rc.d -f pcmc remove
sudo chmod +x /etc/init.d/pcmc
sudo update-rc.d pcmc defaults 

# INSTALL STATS PROCESS
PCMS_BIN_FILE="pcms"
PCMS_RC_FILE="init.d/pcms"

if [ -s $PCMS_BIN_FILE ]; then
    sudo cp $PCMS_BIN_FILE $REV_OPT_REVSW_CONFIG_BIN
else {
    echo "could not find file $PCMS_BIN_FILE"
    exit
}
fi

echo "copied $PCMS_BIN_FILE to $REV_OPT_REVSW_CONFIG_BIN"

# COPY RC SCRIPT
if [ -s $PCMS_RC_FILE ]; then
    sudo cp pcms /etc/init.d/
else {
    echo "could not find $PCMS_RC_FILE"
    exit
}
fi

echo "copied $PCMS_RC_FILE under /etc/init.d"

sudo update-rc.d -f pcms remove
sudo chmod +x /etc/init.d/pcms
sudo update-rc.d pcms defaults

# INSTALL PURGE PROCESS
PCMS_BIN_FILE="pcmp"
PCMS_RC_FILE="init.d/pcmp"

if [ -s $PCMS_BIN_FILE ]; then
    sudo cp $PCMS_BIN_FILE $REV_OPT_REVSW_CONFIG_BIN
else {
    echo "could not find file $PCMS_BIN_FILE"
    exit
}
fi

echo "copied $PCMS_BIN_FILE to $REV_OPT_REVSW_CONFIG_BIN"

# COPY RC SCRIPT
if [ -s $PCMS_RC_FILE ]; then
    sudo cp pcmp /etc/init.d/
else {
    echo "could not find $PCMS_RC_FILE"
    exit
}
fi

echo "copied $PCMS_RC_FILE under /etc/init.d"

sudo update-rc.d -f pcmp remove
sudo chmod +x /etc/init.d/pcmp
sudo update-rc.d pcmp defaults

