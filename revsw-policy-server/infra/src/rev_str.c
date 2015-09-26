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

/* 
 * rev_strlen()
 * - return length of string s
 */
int
rev_strlen(const char *str)
{
    const char *ptr = str;

    while (*ptr != '\0') {
        ptr++;
    }

    return (ptr - str);
}

/* 
 * rev_strcpy()
 * - copy t to s
 */
void 
rev_strcpy(char *dst,
           char *src)
{
    char       *t = dst;
    const char *s = src;

    while ((*t++ = *s++) != (char)0);
}

/* rev_strncpy()
 * - copy t to s of n bytes
 */
char *
rev_strncpy (char       *dst,
             const char *src,
             size_t      n)
{
    if (n != 0) {
        char       *t = dst; 
        const char *s = src;

        do {
            if ((*t++ = *s++) == (char)0) {
                return (dst);
            }
        } while (--n != 0);

        t[-1] = '\0';
    }

    return (dst);
}

/* rev_atoi()
 * - convert string to an integer
 */
int
rev_atoi (char *s)
{
    int n = 0;

    while (*s) {
        n = (n<<3)+(n<<1)+(*s)-'0';
        s++;
     }

     return (n);
}

