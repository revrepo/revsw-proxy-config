#!/usr/bin/perl -wT
use strict;
use warnings FATAL => 'all';
use CGI qw(:standard);
use CGI::Carp qw(warningsToBrowser fatalsToBrowser);

my $cgi = CGI->new;
print $cgi->header(-type => "application/json", -charset => "utf-8");

print "{";
foreach my $key (sort(keys(%ENV))) {
print "\"$key\" : \"$ENV{$key}\", ";
}

my $datestring = localtime();
print "\"LOCAL_TIME\" : \"$datestring\"";
print "}";