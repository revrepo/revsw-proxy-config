/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 *
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var request = require('supertest');
var agent = require("supertest-as-promised");

var express = require('express');
var fs = require('fs');
var https = require('https');


describe('Proxy config command option "ows-http-only"', function() {
    var url = 'http://testsjc20-bp01.revsw.net';
    var testDomain = 'qa-api-test-proxy-options-command1.revsw.net' // skipped ;
    var urls = 'https://testsjc20-bp01.revsw.net';
  // next vars are never used right here
    var api_url = 'https://TESTSJC20-API01.revsw.net';
    var api_user = 'purge_api_test@revsw.com';
    var api_pass = '123456789123456789';
    var apiDomainURL = '/v1/domains/56188c7e144de0433c4e68f8';
    var apiDomainDetailsURL = '/v1/domains/56188c7e144de0433c4e68f8/details';
    var domainJson;
    var domainJsonDetails;
    var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com';
    var qaUserWithAdminPermPassword = 'password1';

  it('should hit the origin on HTTP port for client HTTP request for domain ' + testDomain, function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', testDomain)
      .expect(200)
      .expect('X-Rev-Cache', 'MISS')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

	var i = res.text.search('SERVER_PORT = 80'); // should keep identity level
        if (i < 1) {
          throw new Error("The origin does not receive the request on port 80");
        }

        done();
      });
  });

  it('should hit the origin on HTTP port for client HTTPS request for domain ' + testDomain, function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', testDomain)
      .expect(200)
      .expect('X-Rev-Cache', 'MISS')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        var i = res.text.search('SERVER_PORT = 80');
        if (i < 1) {
          throw new Error("The origin does not receive the request on port 80");
        }

        done();
      });
  });

});
