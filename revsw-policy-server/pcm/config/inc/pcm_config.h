/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_CONFIG_H
#define PCM_CONFIG_H

/* public includes */
#include "pcm_inc.h"

/* defines */
#define PCM_CONFIG_LWS_SSL_CERT "/opt/revsw-config/pcm-config-certs/server.crt"
#define PCM_CONFIG_LWS_SSL_KEY  "/opt/revsw-config/pcm-config-certs/server.key"
#define PCM_CONFIG_JSON_PATH    "/opt/revsw-config/policy"

#define PCM_CONFIG_DOMAIN_SCRIPT_NAME "python /opt/revsw-config/bin/pc-apache-config.py"
#define PCM_CONFIG_SDK_SCRIPT_NAME    "python /opt/revsw-config/bin/revsw-sdk-nginx-gen-config.py"
#define PCM_CONFIG_SSL_SCRIPT_NAME    "python /opt/revsw-config/bin/revsw-ssl-cert-manager.py"
#define PCM_CONFIG_WAF_RULE_SCRIPT_NAME    "python /opt/revsw-config/bin/revsw-waf-rule-manager.py"

#define PCM_CONFIG_CMD_BUFLEN    256
#define PCM_CONFIG_FILE_BUFLEN   256
#define PCM_CONFIG_JSON_BUFLEN   256
#define PCM_CONFIG_LISTNER_PORT 8000
#define PCM_CONFIG_LISTNER_PORT_SSL 8001

/* globals */
rev_thread_mutex_t pcm_config_mutex;

/* enums */

/* structure definitions */
typedef struct pcm_config_gloabal_s {
    rev_thread_t pcg_thread_id;
    char         pcg_thread_name[REV_THREAD_NAME_LEN];

} pcm_config_global_t;

typedef struct pcm_config_process_data_s {
    char   *json_in;  /* holds incoming JSON data */
    size_t  json_in_len;
} pcm_config_process_data_s;

/* function prototypes */
extern void *
pcm_config_thread_main (void *arg);

#endif /* PCM_CONFIG_H */

