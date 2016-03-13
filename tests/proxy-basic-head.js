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


describe('Basic tests - HEAD', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var domain_cache = 'test-proxy-cache-config.revsw.net';
  var domain_dsa = 'test-proxy-dsa-config.revsw.net';
  var test_object_js_1 = '/test_object_purge_api01.js';
  var rmstale = '/cgi-bin/rmstale.cgi';

  it('Simple HTTP  HEAD test object', function(done) { // remove redundant space
    request(url)
      .get(test_object_js_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /javascript/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Simple HTTPS HEAD test object', function(done) {
    request(urls)
      .head(test_object_js_1)
      .set('Host', domain_cache)
      .expect('Content-Type', /javascript/)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.should.have.status(200);
        done();
      });
  });


  it('Simple HTTP  HEAD test dynamic object', function(done) { // remove redundant space
    request(url)
      .head(test_object_js_1)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        // remove redundant line
        res.should.have.status(200);
        done();
      });
  });


  it('Simple HTTPS HEAD test dynamic object', function(done) {
    request(urls)
      .head(test_object_js_1)
      .set('Host', domain_dsa)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });
});
