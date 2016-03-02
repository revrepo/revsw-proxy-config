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

var testHTTPUrl = config.get('test_proxy_http'),
  testHTTPSUrl = config.get('test_proxy_https'),
  newDomainName = config.get('test_domain_start') + Date.now() + config.get('test_domain_end'),
  testAPIUrl = config.get('testAPIUrl'),
  domainConfig = '',
  domainConfigId = '';

api.debugMode(false);
tools.debugMode(true);
//console.log(jsonContent);

var merge = function () {
  var destination = {},
    sources = [].slice.call(arguments, 0);
  sources.forEach(function (source) {
    var prop;
    for (prop in source) {
      if (prop in destination && Array.isArray(destination[prop])) {
        // Concat Arrays
        destination[prop] = destination[prop].concat(source[prop]);

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

var checking = function (host, url, domain, values) {
  //console.log(host, url, domain, values);
  return new Promise(function (response, reject) {
    tools.getHostRequest(host, url, domain)
      .then(function (res, rej) {
        if (rej) {
          throw rej;
        }
        //console.log(res.header);
        for (var key in values) {
          if (values[key] != '') {
            if (key == 'header') {
              for (var header in values[key]) {
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
  });
};

describe("Proxy check", function () {
  var items = fs.readdirSync('./scripts/');
  var files = [];

  if(process.argv[3]){
    files.push(process.argv[3]);
  }else{
    for (var i = 0; i < items.length; i++) {
      files.push('./scripts/'+items[i]);
    }
  }

  for (var i = 0; i < files.length; i++) {
    var contents = fs.readFileSync(files[i]);
    var jsonContent = JSON.parse(contents);

    describe(jsonContent.name, function () {
      this.timeout(jsonContent.timeout);

      var tasks = jsonContent.tasks;

      function process(value) {

        var sub = function (key) {
          var internal = value.cases[key];
          it(internal.description, function (done) {
            var host = testHTTPUrl;
            if (value.protocol == "HTTPS") {
              host = testHTTPSUrl;
            }
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
            before(function (done) {
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

          // Setting domain options
          case "update":
            it(value.description, function (done) {
              domainConfig = merge(domainConfig, value.set);
              console.log(domainConfig);
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
            after(function (done) {
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
            it(value.description, function (done) {
              var host = testHTTPUrl;
              if (value.protocol == "HTTPS") {
                host = testHTTPSUrl;
              }
              checking(host, value.check.url, newDomainName, value.check).then(function (res, rej) {
                if (rej) {
                  throw rej;
                }
                done();
              }).catch(function (err) {
                done(util.getError(err));
              });
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

      for (var task in tasks) {
        process(tasks[task]);
      }
    });
  }
});
