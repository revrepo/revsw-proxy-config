process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var cds = require('./proxy-qa-libs/cds.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originServer = 'httpbin_org.revsw.net',
  testBPHTTPUrl = config.get('test_proxy_http') + ':80',
  testCOHTTPUrl = config.get('test_proxy_http') + ':18000',
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfigId = '',
  cdsConfig,
  testBPparam = 'BP_PARAM',
  testCOparam = 'CO_PARAM';

describe('Proxy lua support check', function () {

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

  it('should create new configuration for domain ' + newDomainName, function (done) {
    var createDomainConfigJSON = {
      'domain_name': newDomainName,
      'account_id': AccountId,
      'origin_host_header': originServer,
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

  it('should get domain config for recently created domain', function (done) {
    cds.getDomainConfigsById(domainConfigId)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        cdsConfig = JSON.parse(res.text);
        delete cdsConfig._id;
        delete cdsConfig.__v;
        delete cdsConfig.account_id;
        delete cdsConfig.cname;
        delete cdsConfig.created_at;
        delete cdsConfig.updated_at;
        delete cdsConfig.created_by;
        delete cdsConfig.deleted;
        delete cdsConfig.deleted_at;
        delete cdsConfig.domain_name;
        delete cdsConfig.origin_server_location_id;
        delete cdsConfig.last_published_domain_version;
        delete cdsConfig.published_domain_version;
        delete cdsConfig.serial_id;
        delete cdsConfig.tolerance;
        delete cdsConfig.proxy_config.cname;
        delete cdsConfig.proxy_config.domain_name;
        done();
      });
  });

  it('should update domain config with custom lua fields', function (done) {
    cdsConfig.bp_lua = [
      {
        location: '/lua',
        code: 'local test = ngx.var.arg_a\nngx.say("BP: ", test)',
        enable: true,
        approve: true
      }
    ];
    cdsConfig.co_lua = [
      {
        location: '/lua',
        code: 'local test = ngx.var.arg_a\nngx.say("CO: ", test)',
        enable: true,
        approve: true
      }
    ];
    cdsConfig.bp_lua_enable_all = true;
    cdsConfig.co_lua_enable_all = true;
    cdsConfig.updated_by = 'victor@revsw.com';
    cds.putDomainConfigsById(domainConfigId, cdsConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    });
  });

  it('should wait till the global and staging config statuses are "Published"', function (done) {
    tools.waitPublishStatus(domainConfigId).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.should.be.equal(true);
      done();
    });
  });

  it('should confirm, that BP lua code works for ' + newDomainName, function (done) {
    tools.getHostRequest(testBPHTTPUrl, '/lua?a=' + testBPparam, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.be.equal('BP: ' + testBPparam + '\n');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });

  it('should confirm, that CO lua code works for ' + newDomainName, function (done) {
    tools.getHostRequest(testCOHTTPUrl, '/lua?a=' + testCOparam, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.text.should.be.equal('CO: ' + testCOparam + '\n');
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
  });
});
