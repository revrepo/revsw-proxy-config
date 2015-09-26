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
#include <rev_utils.h>

/*
 * rev_malloc
 */
void *
rev_malloc (size_t n)
{
    return (malloc (n));
}

/*
 * rev_free
 */
void
rev_free (void *ptr)
{
    return (free(ptr));
}
             
/*
 * rev_memcpy
 */
void *
rev_memcpy (void       *dst,
            const void *src,
            size_t      n)
{
    return (memcpy (dst, src, n));
}

/*
 * rev_memset
 */
void *
rev_memset (void           *ptr,
            register int    ch,
            register size_t n)
{
    return (memset (ptr, ch, n));
}
