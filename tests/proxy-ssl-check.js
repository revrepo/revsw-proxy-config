process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var testHost = config.get('test_proxy_host'),
  step1domain = "delete-test-API-QA-name-ssl-checker-step-1.revsw.net",
  step2domain = "delete-test-API-QA-name-ssl-checker-step-2.revsw.net",
  step3domain = "delete-test-API-QA-name-ssl-checker-step-3.revsw.net";

tools.debugMode(false);

describe('ssl test', function () {

  this.timeout(240000);


  it('should check step1 domain', function (done) {
    tools.getTLSHostRequest(testHost, step1domain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var certificate = res.getPeerCertificate();
      var cipher = res.getCipher();
      certificate.subject.O.should.equal('Internet Widgits Pty Ltd');
      cipher.name.should.equal('ECDHE-RSA-AES128-SHA');
      console.log(certificate.subject.O);
      //console.log(certificate);
      //console.log(cipher);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should check step2 domain', function (done) {
    tools.getTLSHostRequest(testHost, step2domain).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var certificate = res.getPeerCertificate();
      var cipher = res.getCipher();
      certificate.subject.O.should.equal('Rev Software, Inc.');
      cipher.name.should.equal('ECDHE-RSA-AES256-SHA');
      //console.log(certificate);
      //console.log(cipher);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


  it('should check step3 domain', function (done) {
    tools.getTLSHostRequest(testHost, step3domain, 'AES128-SHA').then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var certificate = res.getPeerCertificate();
      var cipher = res.getCipher();
      certificate.subject.O.should.equal('Rev Software, Inc.');
      cipher.name.should.equal('AES128-SHA');
      //console.log(certificate);
      //console.log(cipher);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });


});

