#!/bin/bash
echo -n "Please pass the url you want to measure: "
read url
URL="$url"
time wget -nv -p -H --delete-after $URL
