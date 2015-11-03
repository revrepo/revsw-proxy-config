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

# This is QA code which runs as a cgi-bin.  It is used in connection with the Proxy QA
#
# CGI script to access text area using &read_input
#

print "Content-type: text/html


<head>
<title>Test of HTTP $ENV{'REQUEST_METHOD'}</title>
</head>
<body>
";
print "oooooooooooooooooooooo<br>\n";

%incoming = &read_input;	# Read information into associated
				# array %incoming.
$your_text = $incoming{'review'}; # Fetch the text from the array.
print $your_text;		# Print the text.
print "<br>\noooooooooooooooooooooo<br>\n";
print "<br>";


print "</body>";	# Main body of program ends here



sub read_input {
  local ($buffer, @pairs, $pair, $name, $value, %FORM);
  # Read in text
  print "REQUEST_METHOD $ENV{'REQUEST_METHOD'}<br>\n";
  $ENV{'REQUEST_METHOD'} =~ tr/a-z/A-Z/;
  read(STDIN, $buffer, $ENV{'CONTENT_LENGTH'});
  @pairs = split(/&/, $buffer);
  foreach $pair (@pairs) {
    ($name, $value) = split(/=/, $pair);
    $value =~ tr/+/ /;
    $value =~ s/%(..)/pack("C", hex($1))/eg;
    $FORM{$name} = $value;
  }
  %FORM;
}

