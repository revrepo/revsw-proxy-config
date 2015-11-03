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



describe('Proxy cache bypass feature', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var api_url = 'https://TESTSJC20-API01.revsw.net';
  var api_checkstatus_url = '/v1/purge/';
  var api_user = 'purge_api_test@revsw.com';
  var api_pass = '123456789123456789';
  var domain_cache = 'test-proxy-cache-config.revsw.net';
  var domain_cache_two = 'test-proxy-cache-config-02.revsw.net';
  var domain_dsa = 'test-proxy-dsa-config.revsw.net';
  var domain_rma = 'test-proxy-rma-config.revsw.net';
  var test_object_js_1 = '/test_object_purge_api01.js';
  var test_object_js_2 = '/test_object_purge_api02.js';
  var test_object_css_1 = '/b.find.1.0.55.css';
  var test_object_jpg_1 = '/news-title.jpg';
  var bypass_test_object_jpg_1 = '/bypass/test-64k-file.jpg';
  var etagfgen = '/cgi-bin/etag.cgi';


  it('should not see X-Rev-Cache header in response for HTTP test object', function(done) {
    request(url)
      .get(bypass_test_object_jpg_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /jpeg/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
	if (('x-rev-cache' in res.header)) throw new Error("Found X-Rev-Cache header inserted by Varnish");
        done();
      });
  });

  it('should not see X-Rev-Cache header in response for HTTPS test object', function(done) {
    request(urls)
      .get(bypass_test_object_jpg_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /jpeg/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        if (('x-rev-cache' in res.header)) throw new Error("Found X-Rev-Cache header inserted by Varnish");
        done();
      });
  });

});
