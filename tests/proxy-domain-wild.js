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


// Testing domain wildcarding feature (JSON setting "domain_wildcard_alias": "*.test-proxy-wildcard-domain.revsw.net" )

describe('Proxy Domain Wildcard Function', function() {
  var urlHTTP = 'http://testsjc20-bp01.revsw.net',
   urlHTTPS = 'https://testsjc20-bp01.revsw.net',
   wildcardDomain1 = 'dom1.test-proxy-wildcard-domain.revsw.net',
   wildcardDomain2 = 'dom2.test-proxy-wildcard-domain.revsw.net',
   cacheObject = '/wildcard-test-cache.js';


  it('should get a test HTTP object from domain ' + wildcardDomain1, function(done) {
    request(urlHTTP)
      .get(cacheObject)
      .set('Host', wildcardDomain1)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });


  it('should get a cached test HTTP object from domain ' + wildcardDomain2, function(done) {
    request(urlHTTP)
      .get(cacheObject)
      .set('Host', wildcardDomain2)
      .expect('X-Rev-Cache', 'HIT')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });



  it('should get a test HTTPS object from domain ' + wildcardDomain1, function(done) {
    request(urlHTTPS)
      .get(cacheObject)
      .set('Host', wildcardDomain1)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });


  it('should get a cached test HTTPS object from domain ' + wildcardDomain2, function(done) {
    request(urlHTTPS)
      .get(cacheObject)
      .set('Host', wildcardDomain2)
      .expect('X-Rev-Cache', 'HIT')
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        res.should.have.status(200);
        done();
      });
  });

});



