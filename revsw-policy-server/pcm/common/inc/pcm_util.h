/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_UTIL_H
#define PCM_UTIL_H

/* system includes */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* public includes */
#include "pcm_inc.h"
#include "pcm_rc.h"

/* defines */

/* enums */

/* function prototypes */
pcm_rc_t
pcm_util_dump_file (const char *file_path);

time_t
pcm_util_get_current_time (void);

pcm_rc_t
pcm_util_check_copy_file (const char *file,
                          const char *path);

pcm_rc_t
pcm_util_write_json_to_file (const char *buf,
                             const char *file);

pcm_rc_t
pcm_util_append_status_to_file (const char *buf,
                                const char *file);

#endif /* PCM_UTIL_H */
