/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */
      
/* system includes */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* pcm includes */
#include "pcm_inc.h"

/*
 * pcm_rc_str
 */
const char *
pcm_rc_str (pcm_rc_t pcm_rc)
{
    switch (pcm_rc) {

    case PCM_RC_OK:
        return ("ok");

    case PCM_RC_FILE_OPEN_FAILED:
        return ("file open failed");

    case PCM_RC_FILE_WRITE_FAILED:
        return ("file write failed");

    case PCM_RC_INVALID_JSON_OBJECT:
        return ("received json is empty");

    case PCM_RC_INVALID_DOMAIN_NAME:
        return ("domain name is null");

    case PCM_RC_MKDIR_CMD_FAILED:
        return ("mkdir failed");

    case PCM_RC_PROCESS_NOT_STARTED:
        return ("process not started");

    case PCM_RC_SYSTEM_CMD_FAILED:
        return ("system cmd failed");

    case PCM_RC_PATH_NOT_DIRECTORY:
        return ("not a directory");

    case PCM_RC_TC_INST_INIT_FAILED:
        return ("tc instance init failed");

    case PCM_RC_TC_NO_INSTANCE:
        return ("found no tc instance");

    case PCM_RC_TC_SHM_INIT_ERR:
        return ("found no tc shared memory");

    case PCM_RC_TC_INVALID_DOMAIN:
        return ("invalid doamin received");

    case PCM_RC_TC_NO_DOMAIN:
        return ("domain was not found");

    case PCM_RC_INVALID_PURGE_VERSION:
        return ("purge version mismatch");

    case PCM_RC_WEBSOCK_WRITE_FAILED:
        return ("writing to websocket failed");

    }
    
    return ("unknown");
}
