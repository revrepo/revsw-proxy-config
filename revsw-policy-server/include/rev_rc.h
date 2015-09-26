#ifndef REV_RC_H
#define REV_RC_H

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

/* public includes */

/* REV return codes */
typedef enum rev_rc_e {
    REV_RC_OK = 0,

    REV_RC_THREAD_CREATE_FAILED,

    REV_RC_INVALID_QUEUE_PARAM,
    REV_RC_INVALID_CONFIG_GEN,
    REV_RC_INVALID_CONFIG_SES,
    REV_RC_INVALID_OPTMZR_DATA,
    REV_RC_INVALID_RUM_DATA,

    REV_RC_MEMORY_ALLOC_FAILED,
    REV_RC_ITC_QUEUE_NOT_EMPTY,
    REV_RC_ITC_ALLOC_FAILED,

    REV_RC_HASH_INVALID_BKT_SIZE,
    REV_RC_HASH_TABLE_IS_EMPTY,
    REV_RC_HASH_ENTRY_NOT_FOUND,

    REV_RC_SHM_OPEN_FAILED,
    REV_RC_SHM_MMAP_FAILED,
    REV_RC_SHM_UNMMAP_FAILED,
    REV_RC_SHM_UNLINK_FAILED,

    REV_RC_SEM_OPEN_FAILED,
    REV_RC_SEM_WAIT_FAILED,
    REV_RC_SEM_POST_FAILED,
    REV_RC_SEM_CLOSE_FAILED,

    REV_RC_MSGQ_OPEN_FAILED,
    REV_RC_MSGQ_SEND_FAILED,
    REV_RC_MSGQ_RECV_FAILED,

} rev_rc_t;

/* function prototypes */
extern const char *
rev_rc_str (rev_rc_t rev_rc);

#endif /* REV_RC_H */
