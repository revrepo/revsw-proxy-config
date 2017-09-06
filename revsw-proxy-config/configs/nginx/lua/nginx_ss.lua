-------------------------
-- Nginx Plugin (v1.3.0)
-- Last Modified : 13-06-2017
-------------------------

-----------CUSTOM SETTING STARTs---------

--  Subscriber ID assigned after registration.
local _sid  = "";

-- _mode (set Active as 'true', Monitor as 'false')
local _mode = false;

-- Set the session key, if there is any.
local _sessid = '';

-- Set the remote_address key, if you are setting in header
-- Default value : auto
local _ipaddress = 'auto';

-- Set the nearest API endpoint of ShieldSquare to your server
-- (Take assistance of Shieldsquare Support to configure)
-- Refer below link to know the location of ShieldSquare data centers
-- https://shieldsquare.freshdesk.com/support/solutions/articles/1000224258-where-is-shieldsquare-cloud-service-hosted-]]
local ss_apicloud_server = "ss_ew.shieldsquare.net"

--  Set timeout (milliseconds) for request to Shieldsquare
local _sstimeout = 100;

--Set the DNS cache time (in seconds)
-- Default value is one hour
local _domain_ttl = 3600

-- Set DNS Cache file path
-- Default value is /tmp/ folder.
-- Note: To use this feature your application server [Apache/Nginx]
-- should have write access to folder specified.
-- Also add '/' in the end of the path
-- eg. /tmp/
local _domain_cache_file = "/tmp/"

-- Set this parameter as 'true' if you want to send all request headers to shieldsquare end-point
-- Default value: false
local _other_headers = false;

-- This parameter is used to identify different families of configuration settings in the customer servers. 
-- You can use any deployment Version ID.
-- Set different values on different environments if you have multiple configurations on production.
local _deployment_number = "1234";

-- Set this parameter as 'true', if the IP header(present in _ipaddress parameter) contains multiple IP, else 'false'
local _is_multiple_ip = false;

-- Put valid IP location in _ip_index parameter
-- This parameter can contain positive and negative integer values
-- Default value: 1
local _ip_index = 1;

-- Set this parameter as 'true' to enable ShieldSquare CAPTCHA service
-- In Monitor mode, this parameter should be 'false'
local _ss_captcha_enabled = false;

-- Set this parameter as 'true' to enable ShieldSquare block service
-- In Monitor mode, this parameter should be 'false'
local _ss_block_enabled = false;

-- Provide your support email ID to display in ShieldSquare Captcha and Block page.
-- In monitor mode, kindly ignore this parameter
-- default value : support@shieldsquare.com
local _support_email = "support@shieldsquare.com";

-- Set this parameter as 'true', if you want to enable SSL for ShieldSquare Captcha and block pages, else 'false'
-- In monitor mode, kindly ignore this parameter
local _enable_ssl = false;

----------------------CUSTOM SETTING ENDs--------------------------------


---------Load External modules
pid  = require("setpid");
uzm  = require("setuzm");
util = require("setutils");
-----------------------------

-----Logging Headers--------
--local header1 = ngx.req.get_headers()
--ngx.log(ngx.ERR,'Before: ');
--for k,v in pairs(header1) do ngx.log(ngx.ERR,'PRINT: ',tostring(k), " :: ",tostring(v)); end
--ngx.log(ngx.ERR,' Before END ');
--End--
----------Constants----------------
local CAPTCHA = 2
local BLOCK   = 3
------------------------------------

local head = ngx.req.get_headers(); -- print ngx headers

local var_url = ngx.var.host .. ngx.var.request_uri;  --capture request_page

local cookie_pid = "";
local var_pid    = "";

--Utils PID----------------------------------------------------
bigprime = 999983
ref      = ngx.var.http_referer
bignum   = 0

if ref ~= nil then
	init    = string.len(ref) * string.len(var_url)
	postfix = ( ngx.now() * 10000 ) % 1000000
	bignum  = ( init * postfix ) % bigprime
else
	init    = 27 * string.len(var_url)
	postfix = ( ngx.now() * 100000 ) % 10000000
	bignum  = ( init * postfix ) % bigprime
end
------------------------------------------------------

-- generating pid
var_pid    = tostring(pid.get_pid(_sid, bignum));
cookie_pid = 'uzdbm_a=' .. var_pid .. '; path=/';


-- Set _uzma _uzmb uzmc and _uzmd cookie value
local flag         = 0;
local cookie_uzm_a = "";
local cookie_uzm_b = "";
local cookie_uzm_c = "";
local cookie_uzm_d = "";
local ss_uzmc      = tostring(uzm.set_uzmc(0));
local ss_uzma      = tostring(uzm.set_uzma());
local ss_uzmb      = "";
local var_time     = tostring(ngx.time());
local cookie_tempered = 0;
local expires      = ngx.time() + 3600 * 24 * 365 * 10;--10 years

--if all cookies are present
if ngx.var.cookie___uzma and ngx.var.cookie___uzmb
	and ngx.var.cookie___uzmc and ngx.var.cookie___uzmd then
	ss_uzmb = tostring(ngx.var.cookie___uzmb);
	ss_uzmc = tostring(ngx.var.cookie___uzmc);
	ss_uzmd = tostring(ngx.var.cookie___uzmd);

	local uzmc_counter = uzm.get_uzmc_counter(ngx.var.cookie___uzmc);
    --Checking for cookie tampering cases
     if #ss_uzmb ~= 10 or string.match(ss_uzmb,'%D') ~= nil
     	  or  #ss_uzmc < 12 or string.match(ss_uzmc,'%D') ~= nil
     	  or #ss_uzmd ~= 10 or string.match(ss_uzmd,'%D') ~= nil
     	  or (tostring(ngx.var.cookie___uzma) == '')
     	  or math.floor(uzmc_counter) ~= uzmc_counter
     	  or uzmc_counter < 1 then
     	    cookie_tempered = 1;
     	    ss_uzmc = tostring(uzm.set_uzmc(0));
     	else
     		ss_uzmc = tostring(uzm.set_uzmc(math.floor(uzmc_counter)));
     	end
else --if cookies are not present
	flag = 1;
end

cookie_uzm_c = '__uzmc=' .. ss_uzmc .. '; path=/; Expires='..ngx.cookie_time(expires);
cookie_uzm_d = '__uzmd=' .. var_time .. '; path=/; Expires='..ngx.cookie_time(expires);

if flag == 1 or cookie_tempered == 1 then
	cookie_uzm_a = '__uzma=' .. ss_uzma .. '; path=/; Expires='..ngx.cookie_time(expires);
	cookie_uzm_b = '__uzmb=' .. var_time .. '; path=/; Expires='..ngx.cookie_time(expires);
	ngx.header['Set-Cookie'] = {cookie_uzm_a, cookie_uzm_b, cookie_uzm_c, cookie_pid, cookie_uzm_d};
else
	ngx.header['Set-Cookie'] = {cookie_uzm_c, cookie_pid, cookie_uzm_d};
end

local var_method = 1;
if ngx.req.get_method() == ngx.HTTP_POST then
	var_method   = 2;
end

if _ipaddress == nil then
	_ipaddress = ""
end
   local request_IP = util.ss_get_request_IP(_ipaddress, head);

local store_key  = {};
store_key['_zpsbd0'] = _mode;
store_key['_zpsbd1'] = _sid;
store_key['_zpsbd2'] = var_pid;
store_key['_zpsbd3'] = ngx.var.http_referer or "";
store_key['_zpsbd4'] =  var_url;
store_key['_zpsbd5'] = ngx.var.cookie__sessid or "";
store_key['_zpsbd6'] = request_IP;
store_key['_zpsbd7'] = head['user-agent'] or "";
store_key['_zpsbd8'] = var_method;
store_key['_zpsbd9'] = "";
store_key['_zpsbda'] = var_time;
if flag == 1 or cookie_tempered == 1 then
    store_key['__uzma']  =  ss_uzma;
    store_key['__uzmb']  =  var_time;
else
    store_key['__uzma']  =  ngx.var.cookie___uzma;
    store_key['__uzmb']  =  ngx.var.cookie___uzmb;
end
store_key['__uzmc']  =  ss_uzmc;
store_key['__uzmd']  =  var_time;

--Ajax Headers------
store_key['_zpsbdxrw'] = head['x-requested-with'] or "";
store_key['_zpsbdm']   = ngx.var.request_method;

--ip headers---
store_key = util.ss_get_IP_headers(store_key, head)

--adding deployment number in packet
if _deployment_number == nil or _deployment_number == '' then
    store_key['idn'] = "1234"
else
	store_key['idn'] = _deployment_number
end

--all request headers
if _other_headers == true then
	store_key['_zpsbdx'] = util.ss_get_json(head,true);
end
--proxy authorization
if head['proxy-authorization'] then
	store_key['_zpsbdpa'] = head['proxy-authorization'];
end
--remote port
local req_port = 70000;
if ngx.var.remote_port ~= nil and ngx.var.remote_port ~= "" then 
	req_port = ngx.var.remote_port;
end
store_key['_zpsbdp'] = req_port;

--multiple IP check
if _is_multiple_ip == true then
    store_key['iSplitIP'] = util.ss_get_iSplitIP(request_IP, _ip_index);
end

--ngx.log(ngx.ERR, "final_json: ", final_json)
local final_json  = util.ss_get_json(store_key,false);
local client_body = ngx.req.read_body();

------------- load http module
local http = require "resty.http"

-- intializing domain_ttl and _domain_cache_file
_domain_ttl = _domain_ttl or 3600;
_domain_cache_file = _domain_cache_file or "/tmp/";

local server_end_url = util.ss_get_service_URL(ss_apicloud_server, _domain_ttl, _domain_cache_file);
--ngx.log(ngx.ERR, "host : ", var_url)
--ngx.log(ngx.ERR, "http host : ", ngx.var.http_host)

local function push_Async(premature)

	local hc = http:new()
	local ok, code, headers, status, body  = hc:request {
	url = server_end_url ,
        method = "POST", -- POST or GET
        timeout = _sstimeout,
        body = final_json
    }
end


if _mode == false then
	ngx.timer.at(0, push_Async)
	--ngx.log(ngx.ERR, "Aysnc POST")
	ngx.req.set_header('ShieldSquare-Response', tostring(0))
else
	--ngx.log(ngx.ERR, "Sync POST \n")
	local hc = http:new()
	local ok, code, headers, status, ssResponse  = hc:request {
	url = server_end_url ,
        	method = "POST", -- POST or GET
        	timeout = _sstimeout,
        	body = final_json
        }


	 --Active mode----
	--ngx.log(ngx.ERR, "ShieldSquare Response: ", type(ssResponse));
	local ixstart, ixend = string.find(tostring(ssResponse), "ssresp");
    --  if valid response success
    if ixstart ~= nil then
    	local ssJson = ssResponse;
    	if ssJson ~= nil then
		    local clean_strJson = string.gsub(ssJson, '[{"}]', "");  -- remove [{,",}]
		    if clean_strJson ~= nil then
		        Ikey_data, IIkey_data = clean_strJson:match("(.-),(.-)$"); --split at ','
		        if Ikey_data ~= nil then
		            ssKey, ssCode = Ikey_data:match("(.-):(.-)$"); --split at ':'
		            if ssCode ~= nil then
		                -- setting response_code in header
		                ngx.req.set_header('ShieldSquare-Response', tostring(ssCode))
						--ngx.log(ngx.ERR, "ShieldSquare Response Code: ", ssCode);

					end
				end
			end
		end
	end
end


local header = ngx.req.get_headers()

if header['ShieldSquare-Response'] == nil then
	ngx.req.set_header('ShieldSquare-Response', tostring(0))
end

--ngx.log(ngx.ERR, "ShieldSquare Response Code: ", header['ShieldSquare-Response']);
--ngx.req.set_header('requri',ngx.var.uri)


local ssl_query = 'http://'
if _enable_ssl == true then
	ssl_query = 'https://'
end

if tonumber(header['ShieldSquare-Response']) == CAPTCHA and _ss_captcha_enabled == true then

	local query_string   = util.ss_generate_redirect_query(store_key, _support_email, ss_uzmc);
	local ss_redirectURL = ssl_query.."validate.perfdrive.com/captcha?"..query_string;
	return ngx.redirect(ss_redirectURL);

elseif tonumber(header['ShieldSquare-Response']) == BLOCK and _ss_block_enabled == true then

	local query_string   = util.ss_generate_redirect_query(store_key, _support_email, ss_uzmc);
	local ss_redirectURL = ssl_query.."validate.perfdrive.com/block?"..query_string;
	return ngx.redirect(ss_redirectURL);

else
	return
end
