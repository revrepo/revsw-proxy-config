#!/bin/bash
echo "Enter url, concurrency and requests"
echo "<Syntax: universini.com/ 10 50>"
URL=$1
CON=$2
REQ=$3

ab -k -c $CON -n $REQ $URL

exit 0

