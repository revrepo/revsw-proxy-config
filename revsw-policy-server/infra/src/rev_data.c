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
#include <string.h>
#include <errno.h>

/* public includes */
#include <rev_data.h>
#include <rev_hash.h>
#include <rev_utils.h>
#include <rev_log.h>
#include <rev_rc.h>

/* globals */

rev_data_global_t *rdg;

/* function definitions */

/*
 * rev_data_global_init
 */
rev_rc_t
rev_data_global_init (void)
{
    rdg = (rev_data_global_t *)rev_malloc (sizeof (rev_data_global_t));

    if (rdg == NULL) {
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    rev_memset (rdg, 0, sizeof (rev_data_global_t));

    revcq_init (&rdg->rdg_set_q);

    rev_mutex_init (&rdg->rdg_set_mutex);

    rdg->rdg_set_size = sizeof (rev_data_set_t);

    return (REV_RC_OK);
}

/*
 * rev_data_set_create
 */
rev_rc_t
rev_data_set_create (rev_data_param_t  *rdp,
                     rev_data_set_t   **rds)
{
    rev_rc_t          rev_rc;
    rev_data_set_t   *rds_p;
    rev_data_funcs_t *rdf;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    rdf = &rev_hash_funcs;

    rds_p = rev_malloc (rdg->rdg_set_size);

    if (rds_p == NULL) {
        rev_mutex_unlock (&rdg->rdg_set_mutex);
        return (REV_RC_MEMORY_ALLOC_FAILED);
    }

    rev_memset (rds_p, 0, rdg->rdg_set_size);

    revcq_init_ent (rds_p, rds_q);

    rev_strncpy (rds_p->rds_name, rdp->rdp_name, sizeof (rds_p->rds_name));

    rds_p->rds_type = rdp->rdp_type;

    rds_p->rds_key_offset = rdp->rdp_key_offset;

    rds_p->rds_key_len = rdp->rdp_key_len;

    rds_p->rds_funcs = rdf;

    rev_rc = rdf->rdf_set_create (rdp, rds_p);

    if (rev_rc != REV_RC_OK) {
        rev_free (rds_p);
        rev_mutex_unlock (&rdg->rdg_set_mutex);
        return (rev_rc);
    }

    revcq_insert_tail (&rdg->rdg_set_q, rds_p, rds_q);

    rdg->rdg_num_sets++;

    rdg->rdg_set_create++;

    *rds = rds_p;

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (REV_RC_OK);
}

/*
 * rev_data_set_delete
 */
void
rev_data_set_delete (rev_data_set_t *rds)
{
    rev_mutex_lock (&rdg->rdg_set_mutex);

    rds->rds_funcs->rdf_set_delete(rds);

    revcq_remove (rds, rds_q);

    rdg->rdg_num_sets--;

    rdg->rdg_set_delete++;

    rev_free (rds);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return;
}

/*
 * rev_data_set_size
 */
uint32_t
rev_data_set_size (rev_data_set_t *rds)
{
    uint32_t ents;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    ents = rds->rds_num_ents;

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (ents);
}

/*
 * rev_data_insert
 */
rev_rc_t
rev_data_insert (rev_data_set_t    *rds,
                 void              *ud,
                 rev_hash_handle_t *rhh)
{
    rev_rc_t rev_rc;

    rds->rds_num_inserts++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    rev_rc = rds->rds_funcs->rdf_insert (rds, ud, rhh);

    if (rev_rc == REV_RC_OK) {
        rds->rds_num_ents++;
    }

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (rev_rc);
}

/*
 * rev_data_delete
 */
rev_rc_t
rev_data_delete (rev_data_set_t    *rds,
                 rev_hash_handle_t  rhh)
{
    rev_rc_t rev_rc;

    rds->rds_num_deletes++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    rev_rc = rds->rds_funcs->rdf_delete (rds, rhh);

    if (rev_rc == REV_RC_OK) {
        rds->rds_num_ents--;
    }

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (rev_rc);
}

/*
 * rev_data_find_exact
 */
void *
rev_data_find_exact (rev_data_set_t *rds,
                     const void     *ud)
{
    void *data;

    rds->rds_num_find_exact++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    data = rds->rds_funcs->rdf_find_exact (rds, ud);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (data);
}

/*
 * rev_data_find_exact_by_key
 */
void *
rev_data_find_exact_by_key (rev_data_set_t *rds,
                            const void     *key)
{
    void *data;

    rds->rds_num_find_exact++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    data = rds->rds_funcs->rdf_find_exact_by_key (rds, key);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (data);
}

#ifdef FIND_FUNC_NEEDED
/*
 * rev_data_find_first
 */
void *
rev_data_find_first (rev_data_set_t *rds)
{
    void *data;

    rds->rds_num_find_next++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    data = rds->rds_funcs->rdf_find_first (rds);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (data);
}

/*
 * rev_data_find_next
 */
void *
rev_data_find_next (rev_data_set_t    *rds,
                    rev_hash_handle_t  rhh)
{
    void *data;

    rds->rds_num_find_next++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    data = rds->rds_funcs->rdf_find_next (rds, rhh);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (data);
}

/*
 * rev_data_find_next_by_key
 */
void *
rev_data_find_next_by_key (rev_data_set_t *rds,
                           const void     *key,
                           uint32_t        len)
{
    void *data;

    rds->rds_num_find_next++;

    rev_mutex_lock (&rdg->rdg_set_mutex);

    data = rds->rds_funcs->rdf_find_next_by_key (rds, key, len);

    rev_mutex_unlock (&rdg->rdg_set_mutex);

    return (data);
}
#endif

