process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var testDomain = 'wallarm-test.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https');

describe('Proxy Wallarm control', function () {

  this.timeout(500000);
  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_monitor", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      // console.log(res.statusCode);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_sqli", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      // console.log(res.statusCode);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_sqli?id=10 UNION SELECT 1,null,null--", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_xss", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_xss?id='or+1=1--a-<script>prompt(1)</script>", testDomain, 403).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  
  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_block", testDomain, 403).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

});
