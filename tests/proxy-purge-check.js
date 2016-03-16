process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var api = require('./proxy-qa-libs/api.js');
var util = require('./proxy-qa-libs/util.js');

var newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end');

describe('Proxy PURGE check ', function () {

  this.timeout(240000);

  it('should send bad purge request', function (done) {
    var jsonPurge = {
      "domainName": newDomainName + 'false',
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/**/*"
        }
      }]
    };

    api.postPurge(jsonPurge, 400)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        res.body.statusCode.should.be.equal(400);
        res.body.error.should.be.equal('Bad Request');
        res.body.message.should.be.equal('Domain not found');
        done();
      }).catch(function (err) { done(util.getError(err)); });
  });

});
