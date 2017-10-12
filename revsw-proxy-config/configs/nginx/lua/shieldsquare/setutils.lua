local setutils = {}

--- This function used to convert given table into json
--
-- @param table store_key
-- @param boolean appendN
-- @return json

function setutils.ss_get_json(store_key, appendN)
    local api_table = {};
    table.insert(api_table, "{");

    for k,v in pairs(store_key) do
    table.insert(api_table, '"');
        if appendN == true then
            table.insert(api_table, 'N_'..k);
        else
            table.insert(api_table, k);
        end
        table.insert(api_table, '" : ');
        if k == '_zpsbd0' or k == '_zpsbd8' or k == '_zpsbdx'
            or k == '_zpsbdp' or k == '_zpsbda' then
            table.insert(api_table, tostring(v));
            table.insert(api_table, " , ");
        else
            v = string.gsub(v, "\"", "\\\"");
            table.insert(api_table, '"');
            table.insert(api_table, v);
            table.insert(api_table, '"');
            table.insert(api_table, " , ");
        end
    end
    table.remove(api_table);
    table.insert(api_table, " } ");
    local final_json = table.concat(api_table);
    return final_json;
end


local hex_to_char = function(x)
    return string.char(tonumber(x, 16))
end

--- This function is used to decode the URL
--
-- @param string url
-- @return string

local function urldecode(url)
    return url:gsub("%%(%x%x)", hex_to_char)
end

local function urlencode(str)
  if (str) then
    str = string.gsub (str, "\n", "\r\n")
    str = string.gsub (str, "([^%w %-%_%.%~])",
        function (c) return string.format ("%%%02X", string.byte(c)) end)
    str = string.gsub (str, " ", "+")
  end
  return str    
end

--- This function fetches client IP from IP header, defined in _ipaddress parameter of ss2_config file
--
-- @param string ipaddress_header : contains value of IP header name
-- @param table head: conatins all request headers
-- @return string IP

function setutils.ss_get_request_IP(ipaddress_header, head)
    local request_IP = ngx.var.remote_addr
    if ipaddress_header and ipaddress_header ~= "" then
        if ipaddress_header ~= 'auto' and head[ipaddress_header] then
            request_IP = head[ipaddress_header]
        end
    end
    return request_IP
end


--- This function is used to remove port number from given IP
--
-- @param string split_ip
-- @return string

local function ss_ip_without_port(split_ip)
    local ip_without_port = {}
    local part_index = 1
    for part in string.gmatch(split_ip, '([^:]+)') do   -- Split the IP from port
        ip_without_port[part_index] = part
        part_index = part_index + 1
    end
    return ip_without_port[1]
end


--- This function converts given IP address to long value.
--
-- @param string ipaddress
-- @return long

local function ip2long(ipaddress)
    local IpSplitTable = {};
    local part_index   = 1
    for part in string.gmatch(ipaddress, '([^.]+)') do
        IpSplitTable[part_index] = part
        part_index = part_index + 1
    end
    local sum = 0
    local pow = 24
    for i=1,4,1
        do
        sum = sum + (IpSplitTable[i] * math.pow(2,pow))
        pow = pow - 8
    end
    return sum
end


--- This function checks whether given IP falls in reserved, private or internal IP ranges.
--
-- @param string ipToValidate
-- @return boolean

local function ss_is_valid_IP(ipToValidate)
    if ipToValidate then
        ipToValidate, cntColon   = string.gsub(ipToValidate, '[:]', ":");
        ipToValidate, cntPeriod  = string.gsub(ipToValidate, '[.]', ".");
        if(not(cntColon >1 or cntPeriod == 3)) then
            return false
        end
        if cntColon > 1 then
            if (ipToValidate == '::1' or ipToValidate == '0:0:0:0:0:0:0:0'
              or ipToValidate == '::' or ipToValidate == '::/128'
              or ipToValidate == '0:0:0:0:0:0:0:1' or ipToValidate == '::1/128') then
            return false
            elseif string.match(ipToValidate,'^fd') then
                return false
            end
        elseif (cntPeriod == 3) then
            if (cntColon == 1) then
                ipToValidate = ss_ip_without_port(ipToValidate);
            end
            min1 = ip2long('10.0.0.0');
            max1 = ip2long('10.255.255.255');
            min2 = ip2long('172.16.0.0');
            max2 = ip2long('172.31.255.255');
            min3 = ip2long('192.168.0.0');
            max3 = ip2long('192.168.255.255');
            min4 = ip2long('127.0.0.0');
            max4 = ip2long('127.255.255.255');
            min5 = ip2long('198.18.0.0');
            max5 = ip2long('198.19.255.255');
            min6 = ip2long('100.64.0.0');
            max6 = ip2long('100.127.255.255');
            min7 = ip2long('192.0.0.0');
            max7 = ip2long('192.0.0.255');
            min8 = ip2long('0.0.0.0');
            max8 = ip2long('0.255.255.255');
            ipToValidateLong = ip2long(ipToValidate);

            if (((ipToValidateLong >= min1)  and (ipToValidateLong <= max1))
                or ((ipToValidateLong >= min2) and (ipToValidateLong <= max2))
                or ((ipToValidateLong >= min3) and (ipToValidateLong <= max3))
                or ((ipToValidateLong >= min4) and (ipToValidateLong <= max4))
                or ((ipToValidateLong >= min5) and (ipToValidateLong <= max5))
                or ((ipToValidateLong >= min6) and (ipToValidateLong <= max6))
                or ((ipToValidateLong >= min7) and (ipToValidateLong <= max7))
                or ((ipToValidateLong >= min8) and (ipToValidateLong <= max8))) then
            return false
            end
        end
    else
        return false
    end
    return true
end

setutils.ss_is_valid_IP = ss_is_valid_IP


--- This function fetches valid IP and store it in iSplitIP parameter.
--
-- @param string request_IP
-- @param int ip_index
-- @return void

function setutils.ss_get_iSplitIP(request_IP, ip_index)
    local iSplitIP   = ""
    local split_ip   = ""
    local array_ip   = {}
    local part_index = 1
    local start_index = 1;
    for part in string.gmatch(request_IP, '([^,]+)') do        -- Split IP in header based on ','
        part = part:match("^%s*(.-)%s*$")
        array_ip[part_index] = part
        part_index = part_index + 1
    end
    if ip_index >= 0 then --for positive IP index
        if ip_index > 0 then
            start_index = ip_index
        end
        for i = start_index,#array_ip do
            split_ip = array_ip[i]
            if ss_is_valid_IP(split_ip) then
                iSplitIP = split_ip;
                break;
            end
        end
    else
        start_index = #array_ip + ip_index + 1
        for i = start_index,1,-1 do
            split_ip = array_ip[i]
            if ss_is_valid_IP(split_ip) then
                iSplitIP = split_ip;
                break;
            end
        end
    end
    iSplitIP, cntColon = string.gsub(iSplitIP, '[:]', ":");
    if cntColon == 1 then
        iSplitIP = ss_ip_without_port(iSplitIP)
    end

    return iSplitIP
end


--- function fetches the client IP from different HTTP request headers.
--
-- @param table store_key
-- @param table head
-- @return table

function setutils.ss_get_IP_headers(store_key, head)
    if head['REMOTE_ADDR'] or ngx.var.remote_addr then
        store_key['i0'] = head['REMOTE_ADDR'] or ngx.var.remote_addr;
    end

    if head['X-Forwarded-For'] then
        store_key['i1'] = head['X-Forwarded-For'];
        local x_forwarded_for = {}
        local part_index = 1
        for part in string.gmatch(head['x-forwarded-for'], '([^,]+)') do        -- Split IP in header based on ','
            part = part:match("^%s*(.-)%s*$")
            x_forwarded_for[part_index] = part
            part_index = part_index + 1
        end
        for index=1, #x_forwarded_for do                        -- iterate on split IP table to find correct IP
            split_ip = x_forwarded_for[index]
            if(ss_is_valid_IP(split_ip)) then
                split_ip, cntColon  = string.gsub(split_ip, '[:]', ":");
                if (cntColon == 1) then                     -- if oly one colon available, this means port is appended to the IP
                split_ip = ss_ip_without_port(split_ip);
                end
                store_key['ixff'] = split_ip;                       -- IP set from x-forwarded-for header
                break;
            end
        end
    end

    if head['HTTP_CLIENT_IP'] then
        store_key['i2'] = head['HTTP_CLIENT_IP'];
    end
    if head['HTTP_X_FORWARDED_FOR'] then
        store_key['i3'] = head['HTTP_X_FORWARDED_FOR'];
    end
    if head['x-real-ip'] then
        store_key['i4'] = head['x-real-ip'];
    end
    if head['HTTP_X_FORWARDED'] then
        store_key['i5'] = head['HTTP_X_FORWARDED'];
    end
    if head['Proxy-Client-IP'] then
        store_key['i6'] = head['Proxy-Client-IP'];
    end
    if head['WL-Proxy-Client-IP'] then
        store_key['i7'] = head['WL-Proxy-Client-IP'];
    end
    if head['HTTP_X_CLUSTER_CLIENT_IP'] then
        store_key['i9'] = head['HTTP_X_CLUSTER_CLIENT_IP'];
    end
    if head['HTTP_FORWARDED_FOR'] then
        store_key['i10'] = head['HTTP_FORWARDED_FOR'];
    end
    if head['HTTP_FORWARDED'] then
        store_key['i11'] = head['HTTP_FORWARDED'];
    end
    if head['HTTP_VIA'] then
        store_key['i12'] = head['HTTP_VIA'];
    end
    if head['X-True-Client-IP'] then
        store_key['i13'] = head['X-True-Client-IP'];
    end
    if ngx.var.server_addr then
        store_key['il1'] = ngx.var.server_addr;
    end

    return store_key
end

--- This function generates string of set length from given characters.
--
-- @param int length
-- @param table charset
-- @return string

local function ss_gen_string(length, charset)
    if length > 0 then
        return ss_gen_string(length - 1, charset) .. charset[math.random(1, #charset)]
    else
        return ""
    end
end

--Constants used for query String | ShieldSquare in-build captcha and block
local  digits      = {'0','1','2','3','4','5','6','7','8','9'};--'0123456789';
local char_digits  = {'0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'};--'0123456789abcdef';
local char_digits1 = {'0','1','2','3','4','5','6','a','b','c','d','e','f','g','h','k','i','z','l','m','p'};--'0123456abcdefghkizlmp';
local char_string  = {'a','b','c','d','e','f','g','h','i','j','k','@','l','m','n','o','p'};
local char_digits2 = {'p','q','r','s','t','u','v','2','3','4','1','9','@','l','m','n','o'};


--- This function generates alterate PID.
--
-- @return string : alternate pid

local function ss_generate_alternate_pid()
    local alternate_pid = ss_gen_string(8,char_digits).."-"
        ..ss_gen_string(4, char_digits).."-"
        ..ss_gen_string(4, char_digits).."-"
        ..ss_gen_string(4, char_digits).."-"
        ..ss_gen_string(12, char_digits);
    return alternate_pid;
end


--- This function generates query string for ShieldSquare Captcha and block URL.
--
-- @param table store_key
-- @param string support_email
-- @param int ss_uzmc
-- @return string
sha = require("sha1") -- including library to get digest

function setutils.ss_generate_redirect_query(store_key, support_email, ss_uzmc)

    math.randomseed(os.time())
    local query_string  = ""
    local uzmc_sequence = string.sub(ss_uzmc, 6, string.len(ss_uzmc))
          uzmc_sequence = string.sub(uzmc_sequence, 1, string.len(uzmc_sequence)-5)

    local ssa = ss_gen_string(15, digits)
    local ssb = ss_gen_string(25, char_digits1);
    local ssc =  urlencode(store_key['_zpsbd4']);
    local ssd = ss_gen_string(15, digits);
    local sse = ss_gen_string(15, char_string);
    local ssf = ss_gen_string(40, char_digits);
    local ssg = ss_generate_alternate_pid();
    local ssh = ss_generate_alternate_pid();
    local ssi = store_key['_zpsbd2'];
    local ssj = ss_generate_alternate_pid();
    local ssk = support_email or "support@shieldsquare.com";
    local ssl = ss_gen_string(12, digits);
    local ssm = ss_gen_string(17, digits)..uzmc_sequence
        ..ss_gen_string(13, digits);

    local input_digest =  store_key['_zpsbd1']..store_key['_zpsbd5']
        ..urldecode(store_key['_zpsbd4'])..tostring(uzmc_sequence)
        ..store_key['_zpsbd2']..store_key['_zpsbd7']
        ..ssk;--ssk is equivalent to support mail

    local digest = sha.sha1(input_digest)

    local first_part_uzma  = ""
    local second_part_uzma = ""

    if (#store_key['__uzma'] <= 20) then
        local first_part_uzma  = store_key['__uzma'];
        local second_part_uzma = "";
    else
        first_part_uzma  = string.sub(store_key['__uzma'], 1, 20);
        second_part_uzma = string.sub(store_key['__uzma'], 21, #store_key['__uzma'])
    end


    local ssn = ss_gen_string(8, char_digits)..string.sub(digest, 1, 20)
        ..ss_gen_string(8, char_digits)..first_part_uzma
        ..ss_gen_string(5, char_digits);

    local sso = ss_gen_string(5, char_digits)..second_part_uzma
        ..ss_gen_string(8, char_digits)..string.sub(digest, 21, 40)
        ..ss_gen_string(8, char_digits);

    local ssp = ss_gen_string(10, digits)..string.sub(store_key['__uzmb'], 1, 5)
        ..ss_gen_string(5, digits)..string.sub(store_key['__uzmd'], 1, 5)
        ..ss_gen_string(10, digits);

    local ssq = ss_gen_string(7, digits)..string.sub(store_key['__uzmd'], 6, 10)
        ..ss_gen_string(9, digits)..string.sub(store_key['__uzmb'], 6, 10)
        ..ss_gen_string(15, digits);

    local ssr = ss_gen_string(48, char_digits);

    local alternate_ua = {
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Mozilla/4.0 (Windows NT 5.1) AppleWebKit/535.7 (KHTML,like zeco) Chrome/33.0.1750.154 Safari/536.7",
        "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1) Gecko/20100101 Firefox/39.0",
        "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
        "Chrome/5.0 (iPhone; U; CPU iPhone OS 3_0 like Mac OS X; en-us) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7A341 Safari/528.16"
        }

    local r_ua = math.random(1, 5)
    local sss  = alternate_ua[r_ua];
    local sst  = store_key['_zpsbd7']---user agent
          r_ua = math.random(1, 5)
    local ssu  = alternate_ua[r_ua];
    local ssv  = ss_gen_string(15, char_digits2);
    local ssw  = ngx.var.cookie__sessid or "";---session ID
    local ssx  = ss_gen_string(15, digits);
    local ssy  = ss_gen_string(40, char_string);
    local ssz  = ss_gen_string(15, char_digits);

    query_string = "ssa="..ssa.."&ssb="..ssb.."&ssc="..ssc.."&ssd="..ssd.."&sse="..sse
        .."&ssf="..ssf.."&ssg="..ssg.."&ssh="..ssh.."&ssi="..ssi.."&ssj="..ssj
        .."&ssk="..ssk.."&ssl="..ssl.."&ssm="..ssm.."&ssn="..ssn.."&sso="..sso
        .."&ssp="..ssp.."&ssq="..ssq.."&ssr="..ssr.."&sss="..sss.."&sst="..sst
        .."&ssu="..ssu.."&ssv="..ssv.."&ssw="..ssw.."&ssx="..ssx.."&ssy="..ssy
        .."&ssz="..ssz

    return query_string
end


--- This methood is used to write IP in the file, present in given location.
--
-- @param stirng host
-- @param string filepath
-- @return IP as string

local function ss_load_IP(host, filepath, ctfilepath)
    --require "socket"
    --local ip = socket.dns.toip(host)
    local ip      = host --initializing IP
    local timeout = 1 -- setting timeout value for command
    local command = "nslookup -timeout="..timeout.." -retry=1 "..host
    local aHandle = io.popen( command , 'r' )
    local modified_time = 0

    if aHandle then
        local output  = aHandle:read('*all')
        aHandle:close()
        if output then
            local ip1,ip2,ip3,ip4 = output:match("Address: (%d+).(%d+).(%d+).(%d+)")

            if ip1 and ip2 and ip3 and ip4 then
                ip   = ip1.."."..ip2.."."..ip3.."."..ip4
                file = io.open(filepath, "w")
                if file then
                    file:write(ip)
                    ngx.log(ngx.ERR,"ShieldSquare INFO: IP is written in cache file");
                    file:close()
                    local ctfile = io.popen("stat -c %Y "..filepath)
                    if ctfile then
                        modified_time  = ctfile:read()
                        ctfile:close()
                        timefile = io.open(ctfilepath, "w")
                        if timefile and modified_time then
                            timefile:write(modified_time)
                            timefile:close()
                            ngx.log(ngx.ERR,'ShieldSquare Info: modified time updated in the file')
                        else
                            ngx.log(ngx.ERR,"ShieldSquare Error: could not open file. modified time is ", modified_time);
                        end 
                    else
                        ngx.log(ngx.ERR,"ShielSquare Error: could not able to get modified time")
                    end
                else
                    ngx.log(ngx.ERR,"ShieldSquare Error: File does not have read/write permission");
                end
            end
        end
    end

    return ip
end


--- This function will fetch IP of given host from cache.
--
-- @param string host
-- @param int domain_ttl
-- @param string domain_cache_file
-- @return IP as string

local function ss_get_IP(host, domain_ttl, domain_cache_file)
    --Initialize variables
    local result   = "";                 --cache result (IP)
    local cltime   = 0;                  --cache loaded time (last loaded time)
    local ttl      = 3600;               --ttl for IP validity
    local filepath = "/tmp/ss_nr_cache"; --path of the cache file
    local ctfilepath   = "/tmp/ss_cache_time"--path of cache time file

    ttl = domain_ttl;
    if domain_cache_file ~= nil or domain_cache_file ~= '' then
        filepath   = domain_cache_file..'ss_nr_cache';
        ctfilepath = domain_cache_file..'ss_cache_time';
    end

    if (ttl == -1) then
        return host;
    end
    local rfile  = io.open(filepath, "r");
    local ip = ''
    if rfile == nil then
        ip = ss_load_IP(host, filepath, ctfilepath)
    else
        result = rfile:read()
        rfile:close()
        --getting last modified time
        --local f = io.popen("stat -c %Y "..filepath)
        --cltime  = f:read()
        --f:close()
        local ctfile = io.open(ctfilepath, "r");
        if ctfile then 
            cltime = ctfile:read()
            ctfile:close()
        end
        --file exists with no content
        if (result == nil or result == '' or cltime == nil) then
            ip = ss_load_IP(host, filepath, ctfilepath);
        else
            life   = ngx.time() - cltime; --file exists with content but the value has expired
            if(life > ttl) then
                ip = ss_load_IP(host, filepath, ctfilepath);
            --value has not expired
            else
                ip = result;
            end
        end
    end
    return ip

end



-- This function creates ShieldSquare service URL.
--
-- @param string ss_apicloud_server
-- @param int domain_ttl
-- @param string domain_cache_file
-- @return string : URL

function setutils.ss_get_service_URL(ss_apicloud_server, domain_ttl, domain_cache_file)
    local secure_endpoint = false
    if string.sub(ss_apicloud_server, 1, 8) == "https://" then
        ss_apicloud_server = string.sub(ss_apicloud_server, 9, #ss_apicloud_server)
        secure_endpoint = true
    elseif string.sub(ss_apicloud_server, 1, 7) == "http://" then
        ss_apicloud_server = string.sub(ss_apicloud_server, 8, #ss_apicloud_server)
    end

    if secure_endpoint == true then
        return "https://" .. ss_get_IP(ss_apicloud_server, domain_ttl, domain_cache_file) .. "/getRequestData";
    else
        return "http://" .. ss_get_IP(ss_apicloud_server, domain_ttl, domain_cache_file) .. "/getRequestData";---test
    end
end

return setutils
