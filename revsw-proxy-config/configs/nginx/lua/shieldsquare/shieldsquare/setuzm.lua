local setuzm = {}

math.randomseed(os.clock()*100000000000)
local random = math.random
 
--- Function used to generate uuid
-- 
-- @return string
function setuzm.uuid()
    local template ='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return string.gsub(template, '[xy]', function (c)
        local v = (c == 'x') and random(0, 0xf) or random(8, 0xb)
        return string.format('%x', v)
    end)
end

 
--- This function is used to get uzma value 
-- 
-- @return string
function setuzm.set_uzma()
    local ui = setuzm.uuid()
    for w in string.gmatch(ui, "%S+") do
        return w
    end
end

 
--- This function is used to get uzmc value
-- 
-- @param uzmc_counter 
-- @return string
function setuzm.set_uzmc(uzmc_counter)
    local num = ((uzmc_counter + 1)*3) + 7
    local rand1 = math.random(10000, 99999)
    local rand2 = math.random(10000, 99999)
    local uzmc = rand1 .. num  .. rand2
    return uzmc
end


--- This function is used to get uzmc counter value
-- 
-- @param old_uzmc 
-- @return int
function setuzm.get_uzmc_counter(old_uzmc)
    if #old_uzmc > 11 and string.match(old_uzmc, '%D') == nil then
        local str1 =  string.sub(old_uzmc, 6, string.len(old_uzmc))
        local str2 = string.sub(str1, 1, string.len(str1) - 5)
        local num  = tonumber(str2)
        local uzmc_counter = (num-7)/3;
        return uzmc_counter;
    else
        return 0--default counter value if uzmc is nil
    end 

end

return setuzm
