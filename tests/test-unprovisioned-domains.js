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
var config = require('config');
var https = require('https');


describe('Test with not existing domain name', function() {
  var url = config.get('test_proxy_http');
  var urls = config.get('test_proxy_https');
  var notExistingDomain = config.get('not_existing_domain');

  it('should return 503 status code for HTTP request for domain ' + notExistingDomain, function(done) {
    request(url)
      .get('/')
      .set('Host', notExistingDomain)
      .expect(503)
      .end(function(err, res) {
        if (err) {
          console.log(err);
          throw err;
        }
        done();
    });
  });

  it('should return 503 status code for HTTPS request for doamin ' + notExistingDomain, function(done) {
    request(urls)
      .get('/')
      .set('Host', notExistingDomain)
      .expect(503)
      .end(function(err, res) {
        if (err) {
          console.log(err);
          throw err;
        }
        done();
    });
  });

  it('should return 503 status code for CO HTTP request for domain ' + notExistingDomain, function(done) {
    request(url + ':18000')
      .get('/')
      .set('Host', notExistingDomain)
      .expect(503)
      .end(function(err, res) {
        if (err) {
          console.log(err);
          throw err;
        }
        res.error.text.should.be.equal('No such site. Check the URL spelling.');
        done();
    });
  });

  it('should return 503 status code for CO HTTPS request for domain ' + notExistingDomain, function(done) {
    request(urls + ':19000')
      .get('/')
      .set('Host', notExistingDomain)
      .expect(503)
      .end(function(err, res) {
        if (err) {
          console.log(err);
          throw err;
        }
        res.error.text.should.be.equal('No such site. Check the URL spelling.');
        done();
    });
  });

});
