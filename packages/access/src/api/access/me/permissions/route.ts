/**
 * The actor-agnostic twin of `GET /admin/access/me/permissions`: same handler,
 * same response contract, but reachable by every actor type the application
 * opts into the `/access` namespace (see `configureAccessNamespace`) — portals
 * and POS clients cannot authenticate against `/admin/*`, which is hard-locked
 * to the `user` actor type. The admin path remains as an alias for the
 * dashboard until its UI migrates.
 */
export { GET } from '../../../admin/access/me/permissions/route'
