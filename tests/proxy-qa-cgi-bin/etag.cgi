#!/usr/bin/perl
#
# REV SOFTWARE CONFIDENTIAL
#
# [2013] - [2015] Rev Software, Inc.
# All Rights Reserved.
#
# NOTICE:  All information contained herein is, and remains
# the property of Rev Software, Inc. and its suppliers,
# if any.  The intellectual and technical concepts contained
# herein are proprietary to Rev Software, Inc.
# and its suppliers and may be covered by U.S. and Foreign Patents,
# patents in process, and are protected by trade secret or copyright law.
# Dissemination of this information or reproduction of this material
# is strictly forbidden unless prior written permission is obtained
# from Rev Software, Inc.
#
# This is QA code which runs as a cgi-bin.  It is used in connection with the Proxy QA
#
# CGI script to access text area using &read_input
#

print "Content-type: text/html


<head>
	<title>generate etag</title>
</head>
<body>
";

system("openssl rand -base64 320 > ../etag/item.dat 2> /dev/null");
system("cat ../etag/item.dat");
print "oooooooooooooooooooooo<br>\n";

print "<br>\noooooooooooooooooooooo<br>\n";
print "<br>";
print "</body>";				# Main body of program ends here
