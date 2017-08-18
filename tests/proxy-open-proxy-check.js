process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');
var sh = require('execSync');

var testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end');

function send_quic(request){
  return JSON.parse(sh.exec("echo '" + request + "' | ./proxy-qa-cgi-bin/test_tool 2>/dev/null").stdout);
}

describe('Proxy test on open HTTP/QUIC proxy', function () {

  this.timeout(500000);

  xit('should make request on 443 port by quic protocol and receive status 503', function (done) {
    try {
      var httpGet = '{ "Endpoint": "'+testHTTPSUrl+':443", "Headers": { "Host": ["'+newDomainName+'"] } }';
      var resp = send_quic(httpGet);
    } catch (err) {
      throw "Error: " + err;
    }

    resp.Status.should.be.equal(503);
    done();
  });

  it('should make request on 80 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPUrl, '/', newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 443 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/', newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 18000 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPUrl+":18000", '/', newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should make request on 19000 port and receive status 503', function (done) {
    tools.getHostRequest(testHTTPSUrl+":19000", '/', newDomainName, 503).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
