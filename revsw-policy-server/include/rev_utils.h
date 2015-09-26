#ifndef REV_UTILS_H
#define REV_UTILS_H

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
#include <stdlib.h>
#include <string.h>

/* public includes */

/* function prototypes */
int
rev_strlen(const char *s);

void
rev_strcpy(char *dst,
           char *src);

char *
rev_strncpy (char       *dst,
             const char *src,
             size_t      n);

void *
rev_malloc (size_t n);

void
rev_free (void *ptr);

void *
rev_memcpy (void       *dst,
            const void *src,
            size_t      n);

void *
rev_memset (void           *ptr,
            register int    ch,
            register size_t n);

int
rev_atoi (char *s);

#endif /* REV_UTILS_H */
