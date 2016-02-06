/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 *
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var should = require('should-http');
var config = require('config');
var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originHostHeader = 'testsjc20-website01.revsw.net',
  originServer = 'testsjc20-website01.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  object_1 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/1.jpg',
  object_2 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/2.jpg',
  object_3 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/3.jpg',
  object_4 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/4.jpg',
  object_5 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/5.jpg';


describe('HTML Third Party Links', function() {
  this.timeout(60000);

  it('should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      AccountId = res.body.companyId[0];
      done();
    }).catch(function (err) { done(util.getError(err)); });
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
    }).catch(function (err) { done(util.getError(err)); });
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
      }).catch(function (err) { done(util.getError(err)); });
  });

  it('should set cdn_overlay_urls', function (done) {
    domainConfig.rev_component_bp.cdn_overlay_urls = ["test-proxy-dsa-config.revsw.net"];
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

  it('should get by HTTP 1 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPUrl, object_1, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS 1 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPSUrl, object_1, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP 2 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPUrl, object_2, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS 2 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPSUrl, object_2, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP 3 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPUrl, object_3, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS 3 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPSUrl, object_3, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP 4 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPUrl, object_4, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS 4 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPSUrl, object_4, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP 5 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPUrl, object_5, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS 5 jpeg file from overlay url', function (done) {
    tools.getHostRequest(testHTTPSUrl, object_5, newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['x-rev-beresp-ttl'].should.equal('0.000');
      res.header['cache-control'].should.equal('max-age=0, public');
      res.header['content-type'].should.equal('image/jpeg');
      done();
    }).catch(function (err) { done(util.getError(err)); });
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
    }).catch(function (err) { done(util.getError(err)); });
  });

});
