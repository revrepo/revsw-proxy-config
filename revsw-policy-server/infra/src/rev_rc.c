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

/* public includes */
#include <rev_rc.h>

/*
 * rev_rc_str
 */
const char *
rev_rc_str (rev_rc_t rev_rc)
{
    switch (rev_rc) {

    case REV_RC_OK:
        return ("ok");

    case REV_RC_THREAD_CREATE_FAILED:
        return ("thread create failed");

    case REV_RC_INVALID_QUEUE_PARAM:
        return ("invalid queue config parameters");

    case REV_RC_INVALID_CONFIG_GEN:
        return ("invalid general config params");

    case REV_RC_INVALID_CONFIG_SES:
        return ("invalid session config params");

    case REV_RC_INVALID_OPTMZR_DATA:
        return ("invalid content optmzrizer input");

    case REV_RC_INVALID_RUM_DATA:
        return ("invalid RUM input");


    case REV_RC_MEMORY_ALLOC_FAILED:
        return ("memory allocation failed");

    case REV_RC_ITC_QUEUE_NOT_EMPTY:
        return ("queue is not empty");

    case REV_RC_ITC_ALLOC_FAILED:
        return ("itc queue alloc failed");

    case REV_RC_HASH_INVALID_BKT_SIZE:
        return ("invalid bucket size");

    case REV_RC_HASH_TABLE_IS_EMPTY:
        return ("hash table is empty");

    case REV_RC_HASH_ENTRY_NOT_FOUND:
        return ("hash table entry not found");

    case REV_RC_SHM_OPEN_FAILED:
        return ("shared memory open failed");

    case REV_RC_SHM_MMAP_FAILED:
        return ("memory map failed");

    case REV_RC_SHM_UNMMAP_FAILED:
        return ("memory unmap failed");

    case REV_RC_SHM_UNLINK_FAILED:
        return ("memory unlink failed");

    case REV_RC_SEM_OPEN_FAILED:
        return ("semaphore open failed");

    case REV_RC_SEM_WAIT_FAILED:
        return ("semaphore wait failed");

    case REV_RC_SEM_POST_FAILED:
        return ("semaphore post failed");

    case REV_RC_SEM_CLOSE_FAILED:
        return ("semaphore close failed");

    case REV_RC_MSGQ_OPEN_FAILED:
        return ("message queue open failed");

    case REV_RC_MSGQ_SEND_FAILED:
        return ("message queue send failed");

    case REV_RC_MSGQ_RECV_FAILED:
        return ("message queue receive failed");

    }

    return ("unknown");
}

