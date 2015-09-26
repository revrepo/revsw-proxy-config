/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

#ifndef PCM_INC_H
#define PCM_INC_H

/* system includes */
#include <stdint.h>
#include <stdlib.h>
#include <getopt.h>
#include <strings.h>
#include <fcntl.h>
#include <errno.h>
#include <time.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/dir.h>
#include <sys/time.h>
#include <semaphore.h>

/* public includes */
#include <rev_thread.h>
#include <rev_itc.h>
#include <rev_hash.h>
#include <rev_utils.h>
#include <rev_log.h>
#include <rev_rc.h>
#include <rev_defs.h>

/* pcm includes */
#include "pcm_rc.h"
#include "pcm_log.h"
#include "pcm_util.h"

/* defines */
#define PCM_SOCK_WAIT_TIME 50
#define pcm_main_loop()    while (1) {sleep(10);}

/* enums */

/* structure definitions */

/* extern variables */

/* function prototypes */

#endif /* PCM_INC_H */

