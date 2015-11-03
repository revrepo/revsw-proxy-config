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
 */

var should = require('should-http');
var request = require('supertest');
var agent = require("supertest-as-promised");
//var Sync = require('sync');

var express = require('express');
var fs = require('fs');
var https = require('https');
//var clientCertificateAuth = require('client-certificate-auth');




describe('Basic tests', function() {
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
  var domain_acl = 'test-proxy-acl-deny-except.revsw.net';
  var domain_foo = 'www.foo.com';
  var domain_bar = 'bar.foo.com';
  var domain_boo = 'boo.apple.com';
  var domain_fish = 'cat.fish.co.uk';
  var domain_lift = 'lift.space.co.hk';
  var domain_group = 'qa-domain-group.revsw.net';
  var domain_sdf1 = 'sdf1.robotech.com';
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
  var etagobject = '/etag/item.dat';
  var etagfgen = '/cgi-bin/etag.cgi';
  var expirehead = '/test-cache.js';
  var mkstgale = '/cgi-bin/mkstale.cgi';
  var rmstale = '/cgi-bin/rmstale.cgi';
  var stalefile = '/stale/stalecontent.js';
  var aclapiurl = '/v1/domains/55a2c050a9d291d85d831317/details';

  //  Version was removed as the new API code did not support version
  //    "version": 1,

  it('Test for the base domain_group - sdf1.robotech.com', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_sdf1).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - lift.space.co.hk', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_lift).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - qa-domain-group.revsw.net', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_group).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - www.foo.com', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_foo).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - boo.apple.com', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_boo).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - cat.fish.co.uk', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_fish).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_group - bar.foo.com', function(done) {
    this.timeout(600000);
    request(url).get(test_object_js_1).set('Host', domain_bar).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });



// END
});








function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}
