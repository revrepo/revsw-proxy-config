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

describe('Basic tests - POST', function() {
  var url = 'http://testsjc20-bp01.revsw.net';
  var urls = 'https://testsjc20-bp01.revsw.net';
  var domain_cache = 'test-proxy-cache-config.revsw.net';
  var domain_dsa = 'test-proxy-dsa-config.revsw.net';
  var rmstale = '/cgi-bin/rmstale.cgi';

  it('Simple HTTP  POST test caching config', function(done) {
    request(url)
      .post('/cgi-bin/test.cgi')
      .set('Host', domain_cache)
      .send('review=PostTestInTheHouse')
      .expect(/PostTestInTheHouse/ && /POST/, done)
  });

  it('Simple HTTPS POST test caching config', function(done) {
    request(urls)
      .post('/cgi-bin/test.cgi')
      .set('Host', domain_cache)
      .send('review=PostTestInTheHouse')
      .expect(/PostTestInTheHouse/ && /POST/, done)
  });


  it('Simple HTTP  POST test dynamic config', function(done) {
    request(url)
      .post('/cgi-bin/test.cgi')
      .set('Host', domain_dsa)
      .send('review=PostTestInTheHouse')
      .expect(/PostTestInTheHouse/ && /POST/, done)
  });

  it('Simple HTTPS POST test dynamic config', function(done) {
    request(urls)
      .post('/cgi-bin/test.cgi')
      .set('Host', domain_dsa)
      .send('review=PostTestInTheHouse')
      .expect(/PostTestInTheHouse/ && /POST/, done)
  });

});
