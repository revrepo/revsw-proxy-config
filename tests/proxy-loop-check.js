process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'testsjc20-bp01.revsw.net',
  originServer = 'testsjc20-bp01.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = 'testsjc20-bp01.revsw.net',
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '';

tools.debugMode(false);

describe('Proxy loop detect checker', function () {

  this.timeout(240000);

  it('should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.account_id;
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should remove domain if was earlier created', function (done) {
    api.getDomainConfigs().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var response_json = JSON.parse(res.text);
      for (var attributename in response_json) {
        if (response_json[attributename].domain_name == newDomainName) {
          domainConfigId = response_json[attributename].id;
        }
      }
      if (domainConfigId) {
        api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          var responseJson = JSON.parse(res.text);
          //console.log(response_json);
          responseJson.statusCode.should.be.equal(202);
          responseJson.message.should.be.equal('The domain has been scheduled for removal');
        }).catch(function (err) {
          done(util.getError(err));
        });
        util.mySleep(20000);
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
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

    api.postDomainConfigs(createDomainConfigJSON).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      domainConfigId = res.body.object_id;
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should get domain config', function (done) {
    api.getDomainConfigsById(domainConfigId)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        domainConfig = responseJson;
        delete domainConfig.cname;
        delete domainConfig.domain_name;
        done();
      }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should disable enable_cache', function (done) {
    domainConfig.rev_component_bp.enable_cache = false;
    //console.log(domainConfig);
    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should wait till the global and staging config statuses are "Published" (after create)', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should send request on 80 port and receive status 508', function (done) {
    tools.getHostRequest(testHTTPUrl, '/', newDomainName, 508).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('A BP redirection loop was detected on \'TESTSJC20-BP01\'. Please review the server configuration.');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should send request on 443 port and receive status 508', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/', newDomainName, 508).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('A BP redirection loop was detected on \'TESTSJC20-BP01\'. Please review the server configuration.');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should send request on 18000 port and receive status 508', function (done) {
    tools.getHostRequest(testHTTPUrl+":18000", '/', newDomainName, 508).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('A BP redirection loop was detected on \'TESTSJC20-BP01\'. Please review the server configuration.');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should send request on 19000 port and receive status 508', function (done) {
    tools.getHostRequest(testHTTPSUrl+":19000", '/', newDomainName, 508).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.text);
      res.text.should.be.equal('A BP redirection loop was detected on \'TESTSJC20-BP01\'. Please review the server configuration.');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should delete the domain config', function (done) {
    api.deleteDomainConfigsById(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      var responseJson = JSON.parse(res.text);
      //console.log(response_json);
      responseJson.statusCode.should.be.equal(202);
      responseJson.message.should.be.equal('The domain has been scheduled for removal');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

});
