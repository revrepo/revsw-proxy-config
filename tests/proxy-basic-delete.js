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

var should = require('should-http');
var request = require('supertest');
var agent = require("supertest-as-promised");
//var Sync = require('sync');

var express = require('express');
var fs = require('fs');
var https = require('https');
//var clientCertificateAuth = require('client-certificate-auth');

describe('Basic tests - DELETE', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var api_url = 'https://TESTSJC20-API01.revsw.net';
  var api_checkstatus_url = '/checkStatus';
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
  var rum_page_test = '/rum-test.html';
  var third_party_test = '/parse.html';
  var third_party_object_1 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/1.jpg';
  var third_party_object_2 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/2.jpg';
  var third_party_object_3 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/3.jpg';
  var third_party_object_4 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/4.jpg';
  var third_party_object_5 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/5.jpg';
  var ssl_ciphers_test = ["DHE-RSA-AES128-SHA256", "DHE-RSA-AES256-SHA256", "DHE-RSA-AES128-GCM-SHA256", "DHE-RSA-AES256-GCM-SHA384", "ECDHE-RSA-AES128-SHA256", "ECDHE-RSA-AES256-SHA384", "ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-RSA-AES256-GCM-SHA384", "RC4-SHA", "DES-CBC3-SHA", "RC4-SHA", "DES-CBC3-SHA", "DHE-RSA-AES128-SHA", "DHE-RSA-AES256-SHA", "DHE-RSA-CAMELLIA128-SHA", "DHE-RSA-CAMELLIA256-SHA", "DHE-RSA-SEED-SHA", "ECDHE-RSA-RC4-SHA", "ECDHE-RSA-DES-CBC3-SHA", "ECDHE-RSA-AES128-SHA", "ECDHE-RSA-AES256-SHA"]
  var ssl_ciphers_test_one = 'DHE-RSA-AES128-SHA256';
  var etagobject = '/etag/item.dat';
  var etagfgen = '/cgi-bin/etag.cgi';
  var expirehead = '/test-cache.js';
  var mkstgale = '/cgi-bin/mkstale.cgi';
  var rmstale = '/cgi-bin/rmstale.cgi';
  var stalefile = '/stale/stalecontent.js';


  // Removed to operate with new API gateway
  // "version": 1,

  var JSON1 = {
    "domainName": "test-proxy-cache-config.revsw.net",
    "purges": [{
      "url": {
        "is_wildcard": true,
        "expression": "/**/*"
      }
    }]
  }
  var JSON2 = {
    "domainName": "test-proxy-cache-config-02.revsw.net",
    "purges": [{
      "url": {
        "is_wildcard": true,
        "expression": "/**/*"
      }
    }]
  }
  var JSON3 = {
    "domainName": "test-proxy-cache-config.revsw.net",
    "purges": [{
      "url": {
        "is_wildcard": true,
        "expression": "/test_object_purge_api02.js"
      }
    }]
  }
  var JSON4 = {
    "domainName": "test-proxy-cache-config.revsw.net",
    "purges": [{
      "url": {
        "is_wildcard": true,
        "expression": "/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/*"
      }
    }]
  }

  it('Simple HTTP  DELETE test caching config', function(done) {
    request(url)
      .delete('/cgi-bin/test.cgi')
      .set('Host', domain_cache)
      .send('review=DeleteTestInTheHouse')
      .expect(/DeleteTestInTheHouse/ && /DELETE/, done)
  });

  it('Simple HTTPS DELETE test caching config', function(done) {
    request(urls)
      .delete('/cgi-bin/test.cgi')
      .set('Host', domain_cache)
      .send('review=DeleteTestInTheHouse')
      .expect(/DeleteTestInTheHouse/ && /DELETE/, done)
  });


  it('Simple HTTP  DELETE test dynamic config', function(done) {
    request(url)
      .delete('/cgi-bin/test.cgi')
      .set('Host', domain_dsa)
      .send('review=DeleteTestInTheHouse')
      .expect(/DeleteTestInTheHouse/ && /DELETE/, done)
  });

  it('Simple HTTPS DELETE test dynamic config', function(done) {
    request(urls)
      .delete('/cgi-bin/test.cgi')
      .set('Host', domain_dsa)
      .send('review=DeleteTestInTheHouse')
      .expect(/DeleteTestInTheHouse/ && /DELETE/, done)
  });
});
