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
#include <rev_defs.h>
#include <rev_utils.h>

/* pcm includes */
#include "pcm_inc.h"
#include "pcm_util.h"
#include "pcm_rc.h"

/*
 * pcm_util_get_current_time
 */
time_t
pcm_util_get_current_time (void)
{
    return (time (NULL));
}

/*
 * pcm_util_check_copy_file
 */
pcm_rc_t
pcm_util_check_copy_file (const char *file,
                          const char *path)
{
    struct stat st;
    char        cmd_buf[256];
    int         rc;

    snprintf (cmd_buf, sizeof (cmd_buf), "cp %s %s", file, path); 

    if (stat (path, &st) != 0) {
        rc = mkdir (path, 0666);
        if (rc != 0) {
            return (PCM_RC_MKDIR_CMD_FAILED);
        }
    } else {
        if (!S_ISDIR (st.st_mode)) {
            return (PCM_RC_PATH_NOT_DIRECTORY);
        }
    }

    /* now copy to path */
    rc = system (cmd_buf);
    if (rc != 0) {
        PCMG_LOG_ERROR ("%s: command %s failed (rc %d)",
                        func_name, cmd_buf, rc);
        return (PCM_RC_SYSTEM_CMD_FAILED);
    }

    return (PCM_RC_OK);
}

/*
 * pcm_util_write_json_to_file
 */
pcm_rc_t
pcm_util_write_json_to_file (const char *buf,
                             const char *file)
{
    size_t len = (size_t)rev_strlen(buf);
    int    fd = 0;

    fd = open (file, O_RDWR | O_CREAT | O_TRUNC, 0666);
    if (fd == -1) {
        return (PCM_RC_FILE_OPEN_FAILED);
    }

    if (len != (size_t)write (fd, buf, len)) {
        close (fd);
        return (PCM_RC_FILE_WRITE_FAILED);
    }

    close (fd);

    return (PCM_RC_OK);
}

/*
 * pcm_util_append_status_to_file
 */
pcm_rc_t
pcm_util_append_status_to_file (const char *buf,
                                const char *file)
{
    size_t len = (size_t)rev_strlen(buf);
    int    fd = 0;

    fd = open (file, O_CREAT | O_APPEND | O_RDWR, 0666);
    if (fd == -1) {
        return (PCM_RC_FILE_OPEN_FAILED);
    }

    if (len != (size_t)write (fd, buf, len)) {
        close (fd);
        return (PCM_RC_FILE_WRITE_FAILED);
    }

    close (fd);

    return (PCM_RC_OK);
}

/*
 * pcm_util_dump_file
 */
pcm_rc_t
pcm_util_dump_file (const char *file_path)
{
    FILE *file;
    int   c;

    file = fopen (file_path, "r");
    if (file) {
        while ((c = getc (file)) != EOF)
            printf("%c", c);
    } else {
        return (PCM_RC_FILE_OPEN_FAILED);
    }

    fclose (file);

    return (PCM_RC_OK);
}

