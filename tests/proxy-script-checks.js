var
  should = require('should-http'),
  async = require('async'),
  https = require('https'),
  config = require('config'),
  fs = require("fs"),
  Promise = require('bluebird'),
  api = require('./proxy-qa-libs/api.js'),
  tools = require('./proxy-qa-libs/tools.js'),
  util = require('./proxy-qa-libs/util.js'),
  parallel = require('mocha.parallel');
// better require each module with var

var testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  testAPIUrl = config.get('testAPIUrl'),
  testGroup = config.get('test_group'),
  AccountId = '',
  domains = [],
  sctiptsFolder = './scripts/',
  domainConfig = '',
  domainConfigId = '';
// put test vars inside describe block

api.debugMode(false);
tools.debugMode(false);

var development = false;
//console.log(jsonContent);

// merge move to utils ?
var merge = function () {
  var destination = {},
    sources = [].slice.call(arguments, 0);
  sources.forEach(function (source) {
    var prop;
    for (prop in source) {
      if (prop in destination && Array.isArray(destination[prop])) {
        // Concat Arrays
        //destination[prop] = destination[prop].concat(source[prop]);
        destination[prop] = source[prop];
      } else if (prop in destination && typeof destination[prop] === "object") {
        // Merge Objects
        destination[prop] = merge(destination[prop], source[prop]);

      } else {
        // Set new values
        destination[prop] = source[prop];

      }
    }
  });
  return destination;
};

var checking = function (host, url, domain, values, set) {
  //console.log(host, url, domain, values);
  return new Promise(function (response, reject) {
    if (!set || set === '') {
      var setValues = {
        'Host': domain
      };
      setValues = merge(setValues, set);
      tools.getSetRequest(host, url, setValues)
        .then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          if (development == true) {
            console.log(res.header);
          }
          for (var key in values) {
            if (values[key] != '') {
              if (key == 'header') {
                for (var header in values[key]) {
                  if (development == true) {
                    console.log(res.header[header] + " <=> " + values[key][header]);
                  }
                  res.header[header].should.equal(values[key][header]);
                }
              }
              if (key == 'content') {
                for (var text in values[key]) {
                  res.text.should.containEql(values[key][text]);
                }
              }
            }
          }
          response(true);
        })
        .catch(function (err) {
          reject(err);
        });
    } else {
      tools.getHostRequest(host, url, domain)
        .then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          if (development == true) {
            console.log(res.header);
          }
          for (var key in values) {
            if (values[key] != '') {
              if (key == 'header') {
                for (var header in values[key]) {
                  if (development == true) {
                    console.log(res.header[header] + " <=> " + values[key][header]);
                  }
                  res.header[header].should.equal(values[key][header]);
                }
              }
              if (key == 'content') {
                for (var text in values[key]) {
                  res.text.should.containEql(values[key][text]);
                }
              }
            }
          }
          response(true);
        })
        .catch(function (err) {
          reject(err);
        });
    }
  });
};

var purge = function (newDomainName) {
  return new Promise(function (response, reject) {
    var jsonPurge = {
      "domainName": newDomainName,
      "purges": [{
        "url": {
          "is_wildcard": true,
          "expression": "/**/*"
        }
      }]
    };
    //console.log(jsonPurge);
    api.postPurge(jsonPurge)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        var responseJson = JSON.parse(res.text);
        responseJson.statusCode.should.be.equal(200);
        responseJson.message.should.be.equal('The purge request has been successfully queued');
        responseJson.request_id.should.be.type('string');
        requestID = responseJson.request_id;
        console.log('      ♦ Cache purged');
        response(true);
      }).catch(function (err) {
      reject(err);
    });
  });
};

// getRandomInt potential candidate to become util function
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function test_process(value, newDomainName, jsonContent) {
  //console.log(newDomainName);
  var sub = function (key) {
    var internal = value.cases[key];
    it(internal.description, function (done) {
      var host = testHTTPUrl;
      if (value.protocol == "HTTPS") {
        host = testHTTPSUrl;
      }
      var newDomainName = config.get('test_domain_start') + value.name + "-" + value.step + config.get('test_domain_end');
      checking(host, internal.check.url, newDomainName, internal.check).then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        done();
      }).catch(function (err) {
        done(util.getError(err));
      });
    });
  };

  switch (value.command) {

    // Domain creation for testing
    case "create":
      it(value.description, function (done) {
        tools.beforeSetDomain(newDomainName, jsonContent.origin)
          .then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            domainConfigId = res.id;
            domainConfig = res.config;
          })
          .catch(function (err) {
            done(util.getError(err))
          })
          .then(function () {
            done();
          });
      });
      break;

    case "group_create":
      it(value.description, function (done) {
        var newDomainName = config.get('test_domain_start') + value.name + "-" + value.step + config.get('test_domain_end');

        var found = false;
        for (var ad in domains) {
          if (domains[ad] == newDomainName) {
            found = true;
          }
        }

        if (found) {
          if (development == true)
          {
            console.log('    ♦ Domain found');
          }
        } else {
          if (value.set) {
            tools.beforeSetDomain(newDomainName, value.origin)
              .then(function (res, rej) {
                if (rej) {
                  throw rej;
                }
                domainConfigId = res.id;
                domainConfig = res.config;
              })
              .then(function () {
                domainConfig = merge(domainConfig, value.set);
                if (development == true) {
                  console.log(JSON.stringify(domainConfig));
                }
                tools.afterSetDomain(domainConfigId, domainConfig).then(function (res, rej) {
                  if (rej) {
                    throw rej;
                  }
                  done();
                }).catch(function (err) {
                  done(util.getError(err));
                });
              });
          } else {
            tools.beforeSetDomain(newDomainName, value.origin)
              .then(function (res, rej) {
                if (rej) {
                  throw rej;
                }
                domainConfigId = res.id;
                domainConfig = res.config;
              })
              .catch(function (err) {
                done(util.getError(err))
              })
              .then(function () {
                done();
              });
          }
        }
        done();
      });
      break;

    // Setting domain options
    case "update":
      it(value.description, function (done) {
        //console.log(JSON.stringify(domainConfig));
        domainConfig = merge(domainConfig, value.set);
        if (development == true) {
          console.log(JSON.stringify(domainConfig));
        }
        tools.afterSetDomain(domainConfigId, domainConfig).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          done();
        }).catch(function (err) {
          done(util.getError(err));
        });
      });
      break;

    // Domain removing
    case "delete":
      it(value.description, function (done) {
        tools.deleteDomain(domainConfigId).then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          done();
        }).catch(function (err) {
          done(util.getError(err));
        });
      });
      break;

    // Make test
    case "check":
      it(value.description + " / " + value.step, function (done) {
        var host = testHTTPUrl;
        if (value.protocol == "HTTPS") {
          host = testHTTPSUrl;
        }
        var newDomainName = config.get('test_domain_start') + value.name + "-" + value.step + config.get('test_domain_end');
        if(value.purge) { purge(newDomainName); util.mySleep(value.delay); }
        if(value.check) {
          checking(host, value.check.url, newDomainName, value.check, value.set).then(function (res, rej) {
            if (rej) {
              throw rej;
            }
            done();
          }).catch(function (err) {
            done(util.getError(err));
          });
        }else{
          done();
        }
      });
      break;

    // Make async tests
    case "async":
      parallel(value.description, function () {
        for (var key in value.cases) {
          sub(key);
        }
      });
      break;

    default:
      it.skip("Skipped command " + value.command, function (done) {
        done();
      });
  }

};

describe("Proxy check", function () {
  this.timeout(30000);

  it('should return AccountId', function (done) {
    api.getUsersMyself().then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        AccountId = res.body.companyId[0];
      })
      .then(function () {
        api.getDomainConfigs().then(function (res, rej) {
          if (rej) {
            throw rej;
          }
          var response_json = JSON.parse(res.text);
          //console.log(response_json);
          for (var attributename in response_json) {
            var domain = response_json[attributename].domain_name;
            if (
              domain.substring(0, config.get('test_domain_start').length) == config.get('test_domain_start')
            ) {
              //console.log(domain);
              domains.push(response_json[attributename].domain_name);
            }
          }
          done();
        })
      })
      .catch(function (err) {
        done(util.getError(err));
      });
  });

  var items = fs.readdirSync(sctiptsFolder);
  var files = [];

  if (process.argv[3]) {
    files.push(process.argv[3]);
  } else {
    for (var i = 0; i < items.length; i++) {
      //console.log(items[i]);
      if(items[i] != "special") files.push(sctiptsFolder + items[i]);
    }
  }

  for (var i = 0; i < files.length; i++) {
    var contents = fs.readFileSync(files[i]);
    var jsonContent = JSON.parse(contents);
    var newDomainName = config.get('test_domain_start') + Date.now() + getRandomInt(1000, 9999) + config.get('test_domain_end');
    var tasks = jsonContent.tasks;

    if (jsonContent.enabled) {
      describe(jsonContent.name, function () {
        this.timeout(jsonContent.timeout);
        //console.log(tasks);
        for (var task in tasks) {
          test_process(tasks[task], newDomainName, jsonContent);
        }
      });
    }
  }
});
