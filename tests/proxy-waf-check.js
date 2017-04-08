process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var testDomain = 'waf-test.revsw.net.revqa.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https');

describe('Proxy WAF control', function () {

  this.timeout(240000);
  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPUrl, '/?a=<>', testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.statusCode);
      //console.log(res.text);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/?a=<>', testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.statusCode);
      //console.log(res.header);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

    this.timeout(240000);
  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPUrl, '/test_waf?a=<>', testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.statusCode);
      //console.log(res.text);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should make http request', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/test_waf?a=<>', testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.statusCode);
      //console.log(res.header);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

});
