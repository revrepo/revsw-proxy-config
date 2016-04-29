/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_RC_H
#define PCM_RC_H

/* system includes */
#include <stdlib.h>
#include <string.h>

/* public includes */

/* defines */

/* enums */
typedef enum pcm_rc_e {
    PCM_RC_OK = 0,

    PCM_RC_FILE_OPEN_FAILED,
    PCM_RC_FILE_WRITE_FAILED,

    PCM_RC_INVALID_JSON_OBJECT,
    PCM_RC_INVALID_DOMAIN_NAME,
    PCM_RC_INVALID_SDK_OPERATION,
    PCM_RC_INVALID_SSL_OPERATION,
    PCM_RC_INVALID_CONFIGURATION_TYPE,
    PCM_RC_MKDIR_CMD_FAILED,
    PCM_RC_PROCESS_NOT_STARTED,
    PCM_RC_SYSTEM_CMD_FAILED,
    PCM_RC_PATH_NOT_DIRECTORY,
    PCM_RC_TC_INST_INIT_FAILED,
    PCM_RC_TC_NO_DOMAIN,
    PCM_RC_TC_INVALID_DOMAIN,
    PCM_RC_TC_NO_INSTANCE,
    PCM_RC_TC_SHM_INIT_ERR,

    PCM_RC_INVALID_PURGE_VERSION,
    PCM_RC_WEBSOCK_WRITE_FAILED,

} pcm_rc_t;

/* function prototypes */
const char *
pcm_rc_str (pcm_rc_t pcm_rc);

#endif /* PCM_RC_H */
