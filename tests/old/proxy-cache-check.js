process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = require('config');
var should = require('should-http');
var async = require('async');
var https = require('https');

var api = require('./proxy-qa-libs/api.js');
var tools = require('./proxy-qa-libs/tools.js');
var util = require('./proxy-qa-libs/util.js');

var originServer = 'httpbin_org.revsw.net',
  testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domainConfig = '',
  domainConfigId = '',
  requestID = '',
  cacheAge = '',
  totalTime = '';

tools.debugMode(true);

describe('Proxy cache check ', function () {

  this.timeout(240000);

  before(function (done) {
    tools.beforeSetDomain(newDomainName, originServer)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfigId = res.id;
        domainConfig = res.config;
      })
      .catch(function(err) { done(util.getError(err)) })
      .then(function() { done(); })
  });

  after(function (done) {
    console.log('    ✓ delete the domain config');
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

  it("update config", function (done) {
    domainConfig.rev_component_bp.caching_rules =
      [
        {
          "version": 1,
          "url": {
            "is_wildcard": true,
            "value": "/st**css"
          },
          "edge_caching": {
            "override_origin": true,
            "new_ttl": 120,
            "override_no_cc": false
          },
          "browser_caching": {
            "override_edge": false,
            "new_ttl": 0,
            "force_revalidate": false
          },
          "cookies": {
            "override": false,
            "ignore_all": false,
            "list_is_keep": false,
            "keep_or_ignore_list": [],
            "remove_ignored_from_request": false,
            "remove_ignored_from_response": false
          }
        }
      ];
    tools.afterSetDomain(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
    }).catch(function (err) {
      done(util.getError(err));
    }).then(function() { done(); });
  });

  it('should check url parameter with wildcard and edge_caching', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=120');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should add browser_caching rules for css files and cookies for txt', function (done) {
    domainConfig.rev_component_bp.caching_rules =
    [
      {
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "/st**css"
        },
        "edge_caching": {
          "override_origin": true,
          "new_ttl": 120,
          "override_no_cc": false
        },
        "browser_caching": {
          "override_edge": true,
          "new_ttl": 240,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      },{
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "/st**txt"
        },
        "edge_caching": {
          "override_origin": false,
          "new_ttl": 0,
          "override_no_cc": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      }
    ];
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

  it('should check request to css file', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=240');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check repeated request to css file', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=240');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });


  it('should check request to txt file', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/stale/stalecontent.txt', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //res.header['x-rev-cache'].should.equal('HIT');
      //res.header['content-type'].should.equal('text/css');
      //res.header['cache-control'].should.equal('public, max-age=240');
      //res.header['x-rev-beresp-ttl'].should.equal('120.000');
      //res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check repeated request to css file', function (done) {
    var setValues = {
      'Host': newDomainName,
      'Cookie': ['myApp-token=12345679']
    };
    tools.getSetRequest(testHTTPUrl, '/static/stale/stalecontent.txt', setValues).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.text);
      //res.header['x-rev-cache'].should.equal('HIT');
      //res.header['content-type'].should.equal('text/css');
      //res.header['cache-control'].should.equal('public, max-age=240');
      //res.header['x-rev-beresp-ttl'].should.equal('120.000');
      //res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should set rules for cookies checking', function (done) {
    domainConfig.rev_component_bp.caching_rules =
    [
      {
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "**"
        },
        "edge_caching": {
          "override_origin": true,
          "new_ttl": 120,
          "override_no_cc": false
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      }
    ];
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

  it('should check GET request to url and receiving cookies', function (done) {
    var setValues = {
      'Host': newDomainName,
      'Cookie': ['myApp-token=12345679']
    };

    tools.getSetRequest(testHTTPUrl, '/cookies', setValues).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      json_text = JSON.parse(res.text);
      json_text.cookies['myApp-token'].should.be.equal(json_text.cookies['myApp-token']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should check repeated GET request to url and receiving cookies', function (done) {
    var setValues = {
      'Host': newDomainName,
      'Cookie': ['myApp-token=12345679']
    };
    tools.getSetRequest(testHTTPUrl, '/cookies', setValues).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      res.header['x-rev-cache'].should.equal('MISS');
      json_text = JSON.parse(res.text);
      json_text.cookies['myApp-token'].should.be.equal(json_text.cookies['myApp-token']);
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should set js and css cache settings', function (done) {
    domainConfig.rev_component_bp.caching_rules =
    [
      {
        "version": 1,
        "url": {
          "is_wildcard": false,
          "value": "\\.(js|css)(\\?.*)?$"
        },
        "edge_caching": {
          "override_origin": true,
          "new_ttl": 720000,
          "override_no_cc": true
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      }
    ];
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


  it('should get by HTTP static css file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=720000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS static css file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=720000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static js file and receive MISS and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('public, max-age=720000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS static js file and receive HIT and max-age of 720000', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('public, max-age=720000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static jpg file and receive MISS and max-age of 7200', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
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
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is not 0', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('public, max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.not.equal('0');
      done();
      cacheAge = res.header.age;
      util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is 0', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('public, max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.equal('0');
      res.header.age.should.match(function(n) { return n > cacheAge; });
      cacheAge = res.header.age;
      done();
      util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS static js file and check cache age and that X-Rev-Cache-BE-1st-Byte-Time is 0', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.js', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/x-javascript');
      res.header['cache-control'].should.equal('public, max-age=720000');
      res.header['x-rev-be-1st-byte-time'].should.equal('0');
      res.header.age.should.match(function(n) { return n > cacheAge; });
      done();
      //util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=720000');
      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      res.header.should.not.have.property(['x-rev-obj-ttl']);
      cacheAge = ccheader[1];
      totalTime = res.header['x-rev-cache-total-time'];
      done();
      util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=720000');

      var tt = res.header['x-rev-cache-total-time'];
      parseInt(totalTime).should.be.above(parseInt(tt));

      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var revobj = res.header['x-rev-obj-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      parseInt(cacheAge).should.be.above(parseInt(revobj[0]));
      cacheAge = revobj[0];
      done();

      util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS static css file and check X-Rev-beresp-ttl, X-Rev-object-ttl and X-Rev-Cache-Total-Time', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.css', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('text/css');
      res.header['cache-control'].should.equal('public, max-age=720000');

      var tt = res.header['x-rev-cache-total-time'];
      parseInt(totalTime).should.be.above(parseInt(tt));

      var beresp = res.header['x-rev-beresp-ttl'].split(".");
      var revobj = res.header['x-rev-obj-ttl'].split(".");
      var ccheader = res.header['cache-control'].split("=");
      beresp[0].should.equal(ccheader[1]);
      parseInt(cacheAge).should.be.above(parseInt(revobj[0]));
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header.should.not.have.property(['x-rev-cache-hits']);
      //res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header['x-rev-cache-hits'].should.equal('1');
      //res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS static jpeg file and check X-Rev-Cache-Hits, X-Rev-Beresp-Grace', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/file2.jpg', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('image/jpeg');
      res.header['cache-control'].should.equal('max-age=720000');
      res.header['x-rev-cache-hits'].should.equal('2');
      //res.header['x-rev-beresp-grace'].should.not.equal('0.000');
      done();
      //util.mySleep(1000);
    }).catch(function (err) { done(util.getError(err)); });
  });

    it('should get by HTTP and generate object for cache and check ETag', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var firstetag = res.header.etag;
      tools.getHostRequest(testHTTPUrl, '/static/cgi-bin/etag.cgi', newDomainName).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        util.mySleep(3000);

        tools.getHostRequest(testHTTPUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          firstetag.should.be.equal(res.header.etag);
          //console.log(res.header);
          done();
        }).catch(function (err) { done(util.getError(err)); });
      }).catch(function (err) { done(util.getError(err)); });
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS and generate object for cache and check ETag', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var firstetag = res.header.etag;
      tools.getHostRequest(testHTTPSUrl, '/static/cgi-bin/etag.cgi', newDomainName).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        util.mySleep(3000);

        tools.getHostRequest(testHTTPSUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          firstetag.should.be.equal(res.header.etag);
          //console.log(res.header);
          done();
        }).catch(function (err) { done(util.getError(err)); });
      }).catch(function (err) { done(util.getError(err)); });
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTP and generate object for cache and check ETag consistency checking', function (done) {
    tools.getHostRequest(testHTTPUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var firstetag = res.header.etag;
      tools.getHostRequest(testHTTPUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        firstetag.should.be.equal(res.header.etag);
        //console.log(res.header);
        done();
      }).catch(function (err) { done(util.getError(err)); });
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should get by HTTPS and generate object for cache and check ETag consistency checking', function (done) {
    tools.getHostRequest(testHTTPSUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      var firstetag = res.header.etag;
      tools.getHostRequest(testHTTPSUrl, '/static/etag/item.dat', newDomainName).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        firstetag.should.be.equal(res.header.etag);
        //console.log(res.header);
        done();
      }).catch(function (err) { done(util.getError(err)); });
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should set query_string_list_is_keep to false and remove list', function (done) {
    domainConfig.rev_component_bp.caching_rules =
    [
      {
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "/get**"
        },
        "edge_caching": {
          "override_origin": true,
          "new_ttl": 120,
          "override_no_cc": true,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": ["hello", "rev"]
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      }
    ];
    //console.log(domainConfig);
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

  it('should send first GET request with some query string parameters and remove all except the option foo', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=bar&hello=world&rev=software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?foo=bar');
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?foo=bar');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send first GET request with some query string parameters and remove all except the option foo and receive cache HIT', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=bar&hello=new-world&rev=new-software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?foo=bar');
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?foo=bar');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send first GET request with changed some query string parameters and remove all except the option foo and receive cache MISS', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=new-bar&hello=new-world&rev=new-software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?foo=new-bar');
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?foo=new-bar');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should set query_string_list_is_keep to true and remove list', function (done) {
    domainConfig.rev_component_bp.caching_rules =
    [
      {
        "version": 1,
        "url": {
          "is_wildcard": true,
          "value": "/get**"
        },
        "edge_caching": {
          "override_origin": true,
          "new_ttl": 120,
          "override_no_cc": true,
          "query_string_list_is_keep": true,
          "query_string_keep_or_remove_list": ["hello", "rev"]
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": false,
          "ignore_all": false,
          "list_is_keep": false,
          "keep_or_ignore_list": [],
          "remove_ignored_from_request": false,
          "remove_ignored_from_response": false
        }
      }
    ];
    //console.log(domainConfig);
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

  it('should send first GET request with some query string parameters and remove foo option', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=bar&hello=world&rev=software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?hello=world&rev=software');
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?hello=world&rev=software');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send first GET request with some query string parameters and remove foo option and receive cache HIT', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=new-bar&hello=world&rev=software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?hello=world&rev=software');
      res.header['x-rev-cache'].should.equal('HIT');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?hello=world&rev=software');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

  it('should send first GET request with changed some query string parameters and remove foo option and receive cache MISS', function (done) {
    tools.getHostRequest(testHTTPUrl, '/get?foo=new-bar&hello=new-world&rev=software', newDomainName).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      //console.log(res.header);
      //console.log(res.body);
      var responseJson = JSON.parse(res.text);
      responseJson.url.should.equal('http://httpbin_org.revsw.net/get?hello=new-world&rev=software');
      res.header['x-rev-cache'].should.equal('MISS');
      res.header['content-type'].should.equal('application/json');
      res.header['x-rev-url'].should.equal('/get?hello=new-world&rev=software');
      res.header['x-rev-beresp-ttl'].should.equal('120.000');
      res.header['x-rev-beresp-grace'].should.equal('0.000');
      done();
    }).catch(function (err) { done(util.getError(err)); });
  });

});
