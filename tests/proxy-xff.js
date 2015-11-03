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
//var Sync = require('sync');

var express = require('express');
var fs = require('fs');
var https = require('https');

describe('X-Forwarded-For Tests', function() {
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






  //
  // X-Forwarded-For
  //


  it('X-Forwarded-for for single host BP and CO - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_cache)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP and CO - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_cache)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for for single host BP - bypass - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_dsa)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP - bypass - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_dsa)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for for single host BP - RMA - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_rma)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP - RMA - HTTP', function(done) {
    request(url)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_rma)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });

  it('X-Forwarded-for for single host BP and CO - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_cache)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP and CO - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_cache)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for for single host BP - bypass - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_dsa)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP - bypass - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_dsa)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for for single host BP - RMA - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_rma)
      .set('X-Forwarded-For', '1.2.3.4')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("1.2.3.4");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });


  it('X-Forwarded-for to include proxy BP - RMA - HTTPS', function(done) {
    request(urls)
      .get('/cgi-bin/envtest.cgi')
      .set('Host', domain_rma)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8, 3.4.5.6')
      .end(function(err, res) {
        var response_json = JSON.stringify(res.text);
        var i = response_json.search("5.6.7.8");
        if (i > 1) {
          throw new Error("X-Forwarded-For Broken");
        }
        res.should.have.status(200);
        done();
      });

  });

});
