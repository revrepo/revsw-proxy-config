/*
 * Copyright (c) 2013-2015, Rev Software, Inc.
 * All Rights Reserved.
 *
 * This code is confidential and proprietary to Rev Software, Inc
 * and may only be used under a license from Rev Software Inc.
 *
 * Author: Sidde Gowda
 */

/* public includes */

/* pcm includes */
#include "pcm_stats.h"

/* globals */
pcm_global_t pcm_global;

/*
 * pcm_global_init
 * - initialize policy controller global structure
 */
static void
pcm_global_init (void)
{
    rev_rc_t rev_rc = REV_RC_OK;

    rev_memset (&pcm_global, 0, sizeof(pcm_global_t));
    
    /* name the threads */
    rev_strncpy (pcm_global.pg_stats_thread,
                 "PcmStatsThrd", REV_THREAD_NAME_LEN);

    /* initialize itc */
    rev_rc = rev_itc_init ();
    if (rev_rc != REV_RC_OK) {
        REV_LOG_ERROR ("%s: rev_itc_init() failed (%s)",
                       func_name, rev_rc_str (rev_rc));
    }

    return;
}

/*
 * pcm_create_threads
 * - create all the pcm threads
 */
static pcm_rc_t
pcm_create_threads (void)
{
    int rc;

    rc = rev_thread_create (&pcm_global.pg_stats_tid, NULL,
                            pcm_stats_thread_main, NULL,
                            pcm_global.pg_stats_thread);
    if (rc != 0) {
        REV_LOG_ERROR ("%s(%d): stats thread create failed [rc %d]",
                       func_name, line_num, rc);
        return (REV_RC_THREAD_CREATE_FAILED);
    }

    return (PCM_RC_OK);
}
   
/* 
 * pcm_main_init()
 * - main function of pcm process
 */
static void
pcm_main_init (void)
{
    pcm_rc_t pcm_rc = PCM_RC_OK;

    pcm_global_init ();
    
    pcm_rc = pcm_create_threads ();
    if (pcm_rc != PCM_RC_OK) {
        PCMG_LOG_ERROR ("%s: %s", func_name, pcm_rc_str (pcm_rc));
        return;
    }

    rev_mutex_init (&pcm_stats_mutex);

    return;
}

/*
 * main 
 * - entry to pcm module
 */
int
main (void)
{
    pcm_main_init ();

    /* wait loop */
    pcm_main_loop ();
}
