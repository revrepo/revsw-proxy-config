process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

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
  requestID = '',
  cacheAge = '',
  totalTime = '',
  rumBeaconString = /<script\ src='\/rev\-diablo\/js\/boomerang\-rev\.min\.js'><\/script><script>BOOMR\.init\(\{RT:\{cookie:'REV\-RT'\,\ strict_referrer:\ false\}\,\ beacon_url:\ 'https:\/\/testsjc20\-rum01\.revsw\.net\/service'\}\);\ BOOMR\.addVar\('user_ip'\,\ '.*?'\);<\/script>/m;

describe('Proxy cache check ', function () {

  this.timeout(60000);

  it('should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    });
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
    });
  });

  it('should get domain config', function (done) {
    api.getDomainConfigsById(domainConfigId, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        domainConfig = responseJson;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should send purge request', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/**/*"
        }
      }]
    };

    api.postPurge(jsonPurge, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(200);
        responseJson.message.should.be.equal('The purge request has been successfully queued');
        responseJson.request_id.should.be.type('string');
        requestID = responseJson.request_id;
        done();
      });
  });

  it('should send purge status request', function (done) {
    api.getPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(200);
        responseJson.message.should.be.equal('Success');
        done();
      });
  });

  it('should send false purge request', function (done) {
    var jsonPurge = {
      "domainName": newDomainName + 'false',
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/**/*"
        }
      }]
    };

    api.postPurge(jsonPurge, testAPIUrl, apiLogin, apiPassword, 400)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        res.body.statusCode.should.be.equal(400);
        res.body.error.should.be.equal('Bad Request');
        res.body.message.should.be.equal('Domain not found');
        done();
      });
  });

  it('should get by HTTP object for cache and resive MISS and max-age of 360000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?Cache-Control=public%2C%20max-age%3D360000', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['cache-control'].should.equal('public, max-age=360000');
      done();
    });
  });

  it('should get by HTTPS object for cache and resive MISS and max-age of 36000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/response-headers?Cache-Control=public%2C%20max-age%3D36000', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['cache-control'].should.equal('public, max-age=36000');
      done();
    });
  });

  it('should get by HTTP object for cache and resive MISS and max-age of 290304000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?Cache-Control=public%2C%20max-age%3D290304000', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['cache-control'].should.equal('public, max-age=290304000');
      done();
    });
  });

  it('should get by HTTPS object for cache and resive MISS and max-age of 29030400', function (done) {
    tools.getHostRequest(testHTTPUrl, '/response-headers?Cache-Control=public%2C%20max-age%3D29030400', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['cache-control'].should.equal('public, max-age=29030400');
      done();
    });
  });

  it('should get by HTTP static css file and resive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    });
  });

  it('should get by HTTPS static css file and resive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    });
  });

  it('should get by HTTP static js file and resive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    });
  });

  it('should get by HTTPS static js file and resive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    });
  });

  it('should get by HTTP static js file and resive MISS and max-age of 7200', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=7200');
      done();
    });
  });

  it('should get by HTTPS static js file and resive HIT and max-age of 7200', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=7200');
      done();
    });
  });

  it('should get by HTTP origin robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.not.be.equal('User-agent: *\nDisallow: /\n');
      done();
    });
  });

  it('should get by HTTPS origin robots.txt', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.not.be.equal('User-agent: *\nDisallow: /\n');
      done();
    });
  });

  it('should change domain config and set block_crawlers to true', function (done) {
    domainConfig.rev_component_bp.block_crawlers = true;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should get by HTTP system robots.txt', function (done) {
    tools.getHostRequest(testHTTPUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.be.equal('User-agent: *\nDisallow: /\n');
      done();
    });
  });

  it('should get by HTTPS system robots.txt', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/robots.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.be.equal('User-agent: *\nDisallow: /\n');
      done();
    });
  });

  it('should change domain config and set enable_rum to true', function (done) {
    domainConfig.rev_component_co.enable_rum = true;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should find RUM code after HTTP request', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.match(rumBeaconString);
      done();
    });
  });

  it('should find RUM code after HTTPS request', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.match(rumBeaconString);
      done();
    });
  });

  it('should change domain config and set enable_rum to false', function (done) {
    domainConfig.rev_component_co.enable_rum = false;
    api.putDomainConfigsById(domainConfigId, '?options=publish', domainConfig,
      testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should not find RUM code after HTTP request', function (done) {
    tools.getHostRequest(testHTTPUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.not.match(rumBeaconString);
      done();
    });
  });

  it('should not find RUM code after HTTPS request', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/html', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      res.text.should.not.match(rumBeaconString);
      done();
    });
  });

  it('should get by HTTP static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is not 0', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.not.equal('0');
      done();
      cacheAge = res.header.age;
      tools.mySleep(1000);
    });
  });

  it('should get by HTTP static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is 0', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.equal('0');
      res.header.age.should.match(function(n) { return n > cacheAge; });
      cacheAge = res.header.age;
      done();
      tools.mySleep(1000);
    });
  });

  it('should get by HTTPS static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is 0', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.equal('0');
      res.header.age.should.match(function(n) { return n > cacheAge; });
      done();
      //tools.mySleep(1000);
    });
  });

  it('should get by HTTP static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      res.header.should.not.have.property(['x-rev-obj-ttl']);
      cacheAge = ccheader[1];
      totalTime = res.header['x-rev-cache-total-time'];
      done();
      tools.mySleep(1000);
    });
  });

  it('should get by HTTP static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');

      var tt = res.header['x-rev-cache-total-time'];
      parseInt(totalTime).should.be.above(parseInt(tt));

      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var revobj = res.header['x-rev-obj-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      parseInt(cacheAge).should.be.above(parseInt(revobj[0]));
      cacheAge = revobj[0];
      done();

      tools.mySleep(1000);
    });
  });

  it('should get by HTTPS static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');

      var tt = res.header['x-rev-cache-total-time'];
      parseInt(totalTime).should.be.above(parseInt(tt));

      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var revobj = res.header['x-rev-obj-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      parseInt(cacheAge).should.be.above(parseInt(revobj[0]));
      done();
    });
  });

  it('should get by HTTP static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=7200');
      res.header.should.not.have.property(['x-rev-cache-hits']);
      res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
    });
  });

  it('should get by HTTP static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=7200');
      res.header['x-rev-cache-hits'].should.equal('1');
      res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
    });
  });

  it('should get by HTTPS static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=7200');
      res.header['x-rev-cache-hits'].should.equal('2');
      res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
      //tools.mySleep(1000);
    });
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
    });
  });

});
