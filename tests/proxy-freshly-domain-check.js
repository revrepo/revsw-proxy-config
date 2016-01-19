process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var async = require('async');
var https = require('https');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');

var apiLogin = config.get('qaUserWithAdminPerm'),
  apiPassword = config.get('qaUserWithAdminPermPassword'),
  originHostHeader = 'httpbin_org.revsw.net',
  originServer = 'httpbin_org.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  cookie = '',
  rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;

describe('Proxy freshly domain control', function () {

  this.timeout(120000);

  it('should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(function (err) { done(err); });
  });

  it('should create new configuration for domain ' + newDomainName, function (done) {
    var createDomainConfigJSON = {
      'domain_name': newDomainName,
      'account_id': AccountId,
      'origin_host_header': originHostHeader,
      'origin_server': originServer,
      'origin_server_location_id': testGroup,
      'tolerance': '0'
    };

    api.postDomainConfigs(JSON.stringify(createDomainConfigJSON), testAPIUrl, apiLogin,
      apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    }).catch(function (err) { done(err); });
  });

  it('should get domain config and check some defaults parameters', function (done) {
    api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfig = JSON.parse(res.text);

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

        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      }).catch(function (err) { done(err); });
  });

  it('should wait max 3 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 18, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(err); });
    tools.mySleep(2000);
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
      }, 65000);
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
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
    }).catch(function (err) { done(err); });
  });

  it('should get origin robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.not.be.equal('User-agent: *\nDisallow: /\n');
      done();
    }).catch(function (err) { done(err); });
  });

  it('should change domain config and set block_crawlers to true', function (done) {
    domainConfig.rev_component_bp.block_crawlers = true;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) { done(err); });
  });

  it('should wait max 3 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 18, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) { done(err); });
    tools.mySleep(2000);
  });

  it('should get system robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('User-agent: *\nDisallow: /\n');
      done();
    }).catch(function (err) { done(err); });
  });

  it('should delete the domain config', function (done) {
    api.deleteDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    }).catch(function (err) { done(err); });
  });

});
