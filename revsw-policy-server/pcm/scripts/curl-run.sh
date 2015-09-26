#!/bin/bash
echo -n "Please pass the url you want to measure: "
read url
URL="$url"
curl -w "@curl-format.txt" -o /dev/null -s $URL
