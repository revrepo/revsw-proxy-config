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
  header_cookies = '/header-cookies',
  cookie_url = '/cookies';

describe('Proxy cookies cache control', function () {

  this.timeout(120000);
  var expected = [];

  function get_expected(expected, test_desc, test_url) {
    for (var attr in expected) {
      (function (attr) {
        it(expected[attr]['description']+test_desc, function (done) {
          tools.getSetRequest(test_url, expected[attr]['url'], expected[attr]['set']).then(function (res, rej) {
            if (rej) {
              throw rej;
            }

            //console.log(res.header);
            //console.log(res.header['set-cookie']);
            //console.log(res.text);
            //console.log(expected[attr]['url']);
            for (var key in expected[attr]) {
              if (expected[attr][key] != '') {
                if (key == 'header') {
                  for (var header in expected[attr][key]) {
                    res.header[header].should.eql(expected[attr][key][header]);
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

  before(function (done) {
    tools.beforeSetDomain(newDomainName, originServer)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        domainConfigId = res.id;
        domainConfig = res.config;
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
                "new_ttl": 10,
                "override_no_cc": true,
                "query_string_list_is_keep": false,
                "query_string_keep_or_remove_list": []
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

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v1; k2=v2']},
      "header": {"x-rev-cache": 'MISS', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v1; k2=v2']},
      "header": {"x-rev-cache": 'HIT', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v1; k2=v1']},
      "header": {"x-rev-cache": 'HIT', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v2; k2=v1']},
      "header": {"x-rev-cache": 'HIT', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v2; k2=v2']},
      "header": {"x-rev-cache": 'HIT', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT",
      "url": header_cookies,
      "set": {"Host": newDomainName, "Cookie": ['k1=v3; k2=v3']},
      "header": {"x-rev-cache": 'HIT', "set-cookie": ['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    }
  ];

  get_expected(expected, " (HTTP) "+header_cookies, testHTTPUrl);

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    }
  ];

  get_expected(expected, " (HTTP) "+cookie_url, testHTTPUrl);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it('should change cookies options, set override, list_is_keep and keep_or_ignore_list', function (done) {
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
          "new_ttl": 10,
          "override_no_cc": true,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": []
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": true,
          "ignore_all": false,
          "list_is_keep": true,
          "keep_or_ignore_list": ["k1"],
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
    }).catch(function (err) {
      done(util.getError(err));
    });
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

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT  / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT  / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive MISS / k1=v2; k2=v1",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v2; k2=v1']},
      "text": ['k1=v2; k2=v1']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT  / k1=v2; k2=v1",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v2; k2=v1']},
      "text": ['k1=v2; k2=v1']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive MISS / k1=v3; k2=v3",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v3; k2=v3']},
      "text": ['k1=v3; k2=v3']
    }
  ];

  get_expected(expected, " (HTTPS) "+header_cookies, testHTTPSUrl);

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT  / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive MISS / k1=v2; k2=v1",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v2"', '"k2": "v1"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT  / k1=v2; k2=v1",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v2"', '"k2": "v1"']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive MISS / k1=v3; k2=v3",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v3"', '"k2": "v3"']
    }
  ];

  get_expected(expected, " (HTTPS) "+cookie_url, testHTTPSUrl);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it('should change cookies options, set ignore_all', function (done) {
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
          "new_ttl": 10,
          "override_no_cc": true,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": []
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": true,
          "ignore_all": true,
          "list_is_keep": true,
          "keep_or_ignore_list": ["k1"],
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
    }).catch(function (err) {
      done(util.getError(err));
    });
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

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    }
  ];

  get_expected(expected, " (HTTP) "+header_cookies, testHTTPUrl);

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    }
  ];

  get_expected(expected, " (HTTP) "+cookie_url, testHTTPUrl);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it('should change cookies options, set default list_is_keep and keep_or_ignore_list', function (done) {
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
          "new_ttl": 10,
          "override_no_cc": true,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": []
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": true,
          "ignore_all": true,
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
    }).catch(function (err) {
      done(util.getError(err));
    });
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

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT / k1=v1; k2=v2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1; k2=v2']},
      "text": ['k1=v1; k2=v2']
    }
  ];

  get_expected(expected, " (HTTPS) "+header_cookies, testHTTPSUrl);

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive HIT / k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"', '"k2": "v2"']
    }
  ];

  get_expected(expected, " (HTTPS) "+cookie_url, testHTTPSUrl);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  it('should change cookies options, set default ignore_all and set remove_ignored_from_request', function (done) {
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
          "new_ttl": 10,
          "override_no_cc": true,
          "query_string_list_is_keep": false,
          "query_string_keep_or_remove_list": []
        },
        "browser_caching": {
          "override_edge": false,
          "new_ttl": 0,
          "force_revalidate": false
        },
        "cookies": {
          "override": true,
          "ignore_all": false,
          "list_is_keep": true,
          "keep_or_ignore_list": ["k1"],
          "remove_ignored_from_request": true,
          "remove_ignored_from_response": false
        }
      }
    ];

    api.putDomainConfigsById(domainConfigId, domainConfig).then(function (res, rej) {
      if (rej) {
        throw rej;
      }
      done();
    }).catch(function (err) {
      done(util.getError(err));
    });
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

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2 and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v1;']},
      "text": ['k1=v1;']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT  / k1=v1; and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1;']},
      "text": ['k1=v1;']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT  / k1=v1; and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v1;']},
      "text": ['k1=v1;']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive MISS / k1=v2; and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v2;']},
      "text": ['k1=v2;']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT  / k1=v2; and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT', "set-cookie":['k1=v2;']},
      "text": ['k1=v2;']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive MISS / k1=v3; and remove k2",
      "url": header_cookies,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'MISS', "set-cookie":['k1=v3;']},
      "text": ['k1=v3;']
    }
  ];

  get_expected(expected, " (HTTP) "+header_cookies, testHTTPUrl);

  expected = [
    {
      "description": "should send request with cookies k1=v1; k2=v2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v1"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v2 and receive HIT",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"']
    },
    {
      "description": "should send request with cookies k1=v1; k2=v1 and receive HIT  / k1=v1; and remove k2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v1; k2=v1'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v1"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v1 and receive MISS / k1=v2; and remove k2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v1'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v2"']
    },
    {
      "description": "should send request with cookies k1=v2; k2=v2 and receive HIT  / k1=v2; and remove k2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v2; k2=v2'] },
      "header": {"x-rev-cache": 'HIT'},
      "text": ['"k1": "v2"']
    },
    {
      "description": "should send request with cookies k1=v3; k2=v3 and receive MISS / k1=v3; and remove k2",
      "url": cookie_url,
      "set": { "Host": newDomainName, "Cookie": ['k1=v3; k2=v3'] },
      "header": {"x-rev-cache": 'MISS'},
      "text": ['"k1": "v3"']
    }
  ];

  get_expected(expected, " (HTTP) "+cookie_url, testHTTPUrl);

});
