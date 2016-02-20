process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var request = require("request");
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'httpbin_org.revsw.net',
  originServer = 'httpbin_org.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  cookie = '',
  rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;

describe('Proxy freshly domain control', function () {

  this.timeout(120000);

  before(function (done) {
    tools.beforeSetDomain(newDomainName, originServer)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfigId = res.id;
        domainConfig = res.config;

        var testJson = {
          "rev_component_bp": {
            "enable_cache": true,
            "block_crawlers": false
          },
          "rev_component_co": {
            "enable_rum": false,
            "enable_optimization": false
          }
        }

        for (var attributename in testJson) {
          for (var subattributename in testJson[attributename]) {
            domainConfig[attributename][subattributename].should.be.equal(testJson[attributename][subattributename]);
          }
        }

        return tools.afterSetDomain(domainConfigId, domainConfig);
      })
      .catch(function(err) { done(util.getError(err)) })
      .then(function() { done(); })
  });

  after(function (done) {
    console.log('[===] delete the domain config');
    api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check HTTP proxy timeout and receive 200 answer on 10sec delay', function (done) {
    tools.getHostRequest(testHTTPUrl, '/delay/10', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.text);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set proxy_timeout', function (done) {
    domainConfig.proxy_timeout = 5;
    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check HTTP proxy timeout and receive 504 answer on 10sec delay', function (done) {
    tools.getHostRequest(testHTTPUrl, '/delay/10', newDomainName, 504).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.text);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait 20sec', function (done) {
    util.mySleep(20000);
    done();
  });

  it('should check HTTP proxy timeout and receive 200 answer on 1sec delay', function (done) {
    tools.getHostRequest(testHTTPUrl, '/delay/1', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.text);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait 20sec', function (done) {
    util.mySleep(20000);
    done();
  });

  it('should check HTTP proxy read timeout and receive clear answer with complete = false', function (done) {
    tools.getHostRequest(testHTTPUrl, '/stream-delay/1000', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.text);
      //console.log(res.body);
      //console.log(res);
      res.res.complete.should.be.false;
      res.body.should.equal('');
      res.text.should.equal('');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait 20sec', function (done) {
    util.mySleep(20000);
    done();
  });

  it('should check HTTP GET request headers', function (done) {
    tools.getHostRequest(testHTTPUrl, '/cache/5', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['cache-control']);
      if (res.header['cache-control']) {
        res.header['cache-control'].should.equal('public, max-age=5');
      }
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.have.property(['x-rev-beresp-ttl']);
      if (res.header['x-rev-beresp-ttl']) {
        res.header['x-rev-beresp-ttl'].should.equal('5.000');
      }
      // quic test
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      // rum test
      res.text.should.not.match(rumBeaconString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check HTTPS GET request headers', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/cache/60', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['cache-control']);
      if (res.header['cache-control']) {
        res.header['cache-control'].should.equal('public, max-age=60');
      }
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.have.property(['x-rev-beresp-ttl']);
      if (res.header['x-rev-beresp-ttl']) {
        res.header['x-rev-beresp-ttl'].should.equal('60.000');
      }
      // quic test
      res.header.should.not.have.properties(['alternate-protocol', 'alt-svc']);
      // rum test
      res.text.should.not.match(rumBeaconString);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check HIT cache header and sleep 65 second', function (done) {
    tools.getHostRequest(testHTTPUrl, '/cache/5', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('HIT');
      }
      setTimeout(function () {
        done();
      }, 70000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check MISS cache header after timeout', function (done) {
    tools.getHostRequest(testHTTPUrl, '/cache/5', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }

      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check set header requests', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?Set-Cookie=k1%3Dv1&Cache-Control=public%2C%20max-age%3D30', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check dynamic requests', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?key=val', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.have.property(['x-rev-beresp-ttl']);
      if (res.header['x-rev-beresp-ttl']) {
        res.header['x-rev-beresp-ttl'].should.equal('0.000');
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check MISS cache for dynamic requests', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?key=val', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.have.property(['x-rev-beresp-ttl']);
      if (res.header['x-rev-beresp-ttl']) {
        res.header['x-rev-beresp-ttl'].should.equal('0.000');
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check POST request', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.postHostRequest(testHTTPUrl, '/post', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check that POST don\'t use cache', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.postHostRequest(testHTTPUrl, '/post', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check PATCH request', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.patchHostRequest(testHTTPUrl, '/patch', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check that PATCH don\'t use cache', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.patchHostRequest(testHTTPUrl, '/patch', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check PUT request', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.putHostRequest(testHTTPUrl, '/put', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check that PUT don\'t use cache', function (done) {
    var jsonBody = {form: {key: 'value'}};
    tools.putHostRequest(testHTTPUrl, '/put', jsonBody, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check DELETE request', function (done) {
    tools.delHostRequest(testHTTPUrl, '/delete', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check that DELETE don\'t use cache', function (done) {
    tools.delHostRequest(testHTTPUrl, '/delete', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header.should.not.have.property(['cache-control']);
      res.header.should.have.property(['x-rev-cache']);
      if (res.header['x-rev-cache']) {
        res.header['x-rev-cache'].should.equal('MISS');
      }
      res.header.should.not.have.properties(['x-rev-beresp-ttl', 'x-rev-beresp-grace']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get origin robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.be.equal('User-agent: *\nDisallow: /\n');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should change domain config and set block_crawlers to true', function (done) {
    domainConfig.rev_component_bp.block_crawlers = true;
    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should wait till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get system robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('User-agent: *\nDisallow: /\n');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
