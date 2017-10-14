local setpid = {}

--- Function generates PID
--
-- @param string SID
-- @param number bignum
-- @return string

function setpid.get_pid(SID, bignum)

    local table_pid = {}

    -- first part PID, removing depedency of IP to create PID
    math.randomseed(ngx.time() % 100000 + bignum)
    local rand1 = ""
    for i=1,2 do
        rand1 = rand1 .. string.format("%x", math.random(4096, 65535))
    end
    table.insert(table_pid, string.lower(rand1))


    -- second part PID
    local part_index = 0
    for part in string.gmatch(SID, '([^-]+)') do
        part_index = part_index + 1
        if(part_index == 4) then
            table.insert(table_pid, string.lower(part))
        end
    end

    -- Third part PID
    local hex_time0 = string.reverse(string.format("%x", os.time()))
    local hex_time1 = string.sub(hex_time0, 1, 4)
    table.insert(table_pid, string.lower(hex_time1))

    -- Fourth part PID
    math.randomseed(ngx.now() % 100009 + bignum)
    local ran4 = string.format("%x", math.random(4096, 65535))
    table.insert(table_pid, string.lower(ran4))

    -- Fifth part PID
    math.randomseed(ngx.time() % 100010 + bignum)
    local rand5 = ""
    for i=1,3 do
        rand5 = rand5 .. string.format("%x", math.random(4096, 65535))
    end
    table.insert(table_pid, string.lower(rand5))

    local pid = table.concat(table_pid, "-")
    return pid
end

return setpid
