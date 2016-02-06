/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var originHostHeader = 'test-proxy-cache-config.revsw.net',
  originServer = 'test-proxy-cache-config.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  page = '/parse.html',
  object_1 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/1.jpg',
  object_2 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/2.jpg',
  object_3 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/3.jpg',
  object_4 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/4.jpg',
  object_5 = '/rev-third-party-http/test-proxy-dsa-config.revsw.net/images-rw/5.jpg';


describe('Proxy check cdn_overlay_urls', function() {
  this.timeout(120000);

  var expected = [
    {
      "description": "should check overlay urls in html page",
      "url": page,
      "header": [],
      "text": [object_1, object_2, object_3, object_4, object_5]
    },
    {
      "description": "should check overlay url for 1 jpeg",
      "url": object_1,
      "header": {'content-length': '110174', 'x-rev-cache': 'MISS', 'x-rev-beresp-ttl':'0.000', 'cache-control':'max-age=0, public', 'content-type':'image/jpeg'},
      "text": []
    },
    {
      "description": "should check overlay url for 2 jpeg",
      "url": object_2,
      "header": {'content-length': '60989', 'x-rev-cache': 'MISS', 'x-rev-beresp-ttl':'0.000', 'cache-control':'max-age=0, public', 'content-type':'image/jpeg'},
      "text": []
    },
    {
      "description": "should check overlay url for 3 jpeg",
      "url": object_3,
      "header": {'content-length': '127000', 'x-rev-cache': 'MISS', 'x-rev-beresp-ttl':'0.000', 'cache-control':'max-age=0, public', 'content-type':'image/jpeg'},
      "text": []
    },
    {
      "description": "should check overlay url for 4 jpeg",
      "url": object_4,
      "header": {'content-length': '136746', 'x-rev-cache': 'MISS', 'x-rev-beresp-ttl':'0.000', 'cache-control':'max-age=0, public', 'content-type':'image/jpeg'},
      "text": []
    },
    {
      "description": "should check overlay url for 5 jpeg",
      "url": object_5,
      "header": {'content-length': '141080', 'x-rev-cache': 'MISS', 'x-rev-beresp-ttl':'0.000', 'cache-control':'max-age=0, public', 'content-type':'image/jpeg'},
      "text": []
    }
  ];

  function get_expected(test_desc, test_url) {
    for (var attr in expected) {
      (function (attr) {
        it(expected[attr]['description']+test_desc, function (done) {
          tools.getHostRequest(test_url, expected[attr]['url'], newDomainName).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            //console.log(res.header);
            //console.log(expected[attr]['url']);

            for (var key in expected[attr]) {
              if (expected[attr][key] != '') {
                if (key == 'header') {
                  for (var header in expected[attr][key]) {
                    res.header[header].should.equal(expected[attr][key][header]);
                  }
                }
                if (key == 'text') {
                  for (var text in expected[attr][key]) {
                    res.text.should.containEql(expected[attr][key][text]);
                  }
                }
              }
            }
            done();
          }).catch(function (err) {
            done(util.getError(err));
          });
        });
      })(attr);
    }
  }

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

  get_expected(" (HTTP)", testHTTPUrl);
  get_expected(" (HTTPS)", testHTTPSUrl);

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
