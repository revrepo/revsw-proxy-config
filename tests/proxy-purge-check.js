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
  requestID = '';

describe('Proxy PURGE check ', function () {

  this.timeout(60000);

  it('should return AccountId', function (done) {
    api.getUsersMyself(testAPIUrl, apiLogin, apiPassword).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(done);
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
    }).catch(done);
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
      }).catch(done);
  });

  it('should wait max 2 minutes till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId, testAPIUrl, apiLogin, apiPassword, 12, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTPS static css file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTPS static js file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTPS static jpg file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send PURGE request and clear all cache', function (done) {
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send PURGE request for jpg or jpeg files without wildcard', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": false,
          "expression": "\.(jpg|jpeg)$"
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send PURGE request for css file files without wildcard', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": false,
          "expression": "\.css$"
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send PURGE request with url regexp without wildcard', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": false,
          "expression": "static"
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send PURGE request for css and js with wildcard', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/sta**s$"
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should send fail PURGE request for css and js with wildcard', function (done) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/sat**s$"
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
      }).catch(done);
  });

  it('should wait max 30 seconds till the PURGE process statuses are "Success"', function (done) {
    tools.waitPurgeStatus(requestID, testAPIUrl, apiLogin, apiPassword, 3, 10000).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(done);
  });

  it('should get by HTTP static css file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static js file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
  });

  it('should get by HTTP static jpg file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(done);
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
      }).catch(done);
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
    }).catch(done);
  });

});
