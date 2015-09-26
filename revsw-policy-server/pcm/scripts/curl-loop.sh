#!/bin/bash
echo -n "Enter domain name to be tested: "
read u
echo -n "Enter number of times to run: "
read n
rm curl-out.txt
c=1
while [ $c -le $n ]
do
	curl -w "@curl-format.txt" -o /dev/null -s $u >> curl-out.txt
	((c++))
done
