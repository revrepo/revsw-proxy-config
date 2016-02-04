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




describe('Proxy domain_aliases tests', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var domain_foo = 'www.foo.com';
  var domain_bar = 'bar.foo.com';
  var domain_boo = 'boo.apple.com';
  var domain_fish = 'cat.fish.co.uk';
  var domain_lift = 'lift.space.co.hk';
  var domain_aliases = 'qa-domain-group.revsw.net';
  var domain_sdf1 = 'sdf1.robotech.com';
  var test_object_js_1 = '/test_object_purge_api01.js';
  var rmstale = '/cgi-bin/rmstale.cgi';

  //  Version was removed as the new API code did not support version
  //    "version": 1,
  this.timeout(600000);

  it('Test for the base domain_aliases - sdf1.robotech.com', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_sdf1).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - lift.space.co.hk', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_lift).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - qa-domain-group.revsw.net', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_aliases).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - www.foo.com', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_foo).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - boo.apple.com', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_boo).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - cat.fish.co.uk', function(done) {
    request(url).get(test_object_js_1).set('Host', domain_fish).expect('Content-Type', /javascript/).end(function(err, res) {
      res.should.have.status(200);
      done();
    });
  });

  it('Test for the base domain_aliases - bar.foo.com', function(done) {
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
