
# Varnish WURFL Initialization
# This is included in vcl_init()

#import wurfl;
#import var;

sub vcl_init {

wurfl.set_root("/usr/share/wurfl/wurfl.xml");
#wurfl.add_patch("...");

#wurfl.set_engine_target_high_performance();
wurfl.set_engine_target_high_accuracy();

wurfl.set_useragent_priority_override_sideloaded_browser_useragent();
#wurfl.set_useragent_priority_use_plain_useragent();

#wurfl.set_cache_provider_none();
#wurfl.set_cache_provider_lru(100000);
wurfl.set_cache_provider_double_lru(10000,3000);

# Required Capabilities
# DO NOT REMOVE, EVEN IF THEY AREN'T USED!
wurfl.add_requested_capability("device_os");
wurfl.add_requested_capability("device_os_version");
wurfl.add_requested_capability("is_tablet");
wurfl.add_requested_capability("is_wireless_device");
wurfl.add_requested_capability("pointing_method");
wurfl.add_requested_capability("preferred_markup");
wurfl.add_requested_capability("resolution_height");
wurfl.add_requested_capability("resolution_width");
wurfl.add_requested_capability("ux_full_desktop");
wurfl.add_requested_capability("xhtml_support_level");
wurfl.add_requested_capability("is_smarttv");
wurfl.add_requested_capability("brand_name");
wurfl.add_requested_capability("can_assign_phone_number");
wurfl.add_requested_capability("marketing_name");
wurfl.add_requested_capability("model_name");
wurfl.add_requested_capability("mobile_browser_version");

# Optional WURFL Capabilities to be loaded
wurfl.add_requested_capability("max_image_width");
wurfl.add_requested_capability("max_image_height");
wurfl.add_requested_capability("webp_lossy_support");
wurfl.add_requested_capability("webp_lossless_support");

wurfl.load();
if (wurfl.error()) {
#    std.log(wurfl.error());

    # TODO: Varnish 4.x does not support panic
    #panic wurfl.error();
}

}
