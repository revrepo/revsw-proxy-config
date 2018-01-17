process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config'););
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var testDomain = 'wallarm-test.revsw.net',
  testHTTPSUrl = config.get('test_proxy_https');

describe('Proxy Wallarm control', function () {

  this.timeout(500000);
  it('should make http request and return status 200', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_monitor", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should not block the location', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_sqli", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should block the location and return status code 403', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_sqli?id=10 UNION SELECT 1,null,null--", testDomain, 403).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should not block the location', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_xss", testDomain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should block the location and return status code 403', function (done) {
    tools.getHostRequest(testHTTPSUrl, "/wallarm_xss?id='or+1=1--a-<script>prompt(1)</script>", testDomain, 403).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should return status code 403', function (done) {
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
