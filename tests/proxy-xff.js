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
  var domain_cache = 'test-proxy-cache-config.revsw.net';
  var domain_dsa = 'test-proxy-dsa-config.revsw.net';
  var domain_rma = 'test-proxy-rma-config.revsw.net';
  var rmstale = '/cgi-bin/rmstale.cgi';

  //
  // X-Forwarded-For
  //
  // redundant comment, below we can see clearly

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
