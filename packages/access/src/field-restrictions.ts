/**
 * The cross-plugin restricted-fields contract, importable as
 * `medusa-plugin-access/field-restrictions`.
 *
 * Kept to the declaration function and its input type on purpose: other
 * plugins import this optionally (try/catch) from their module loaders, so
 * this module must stay small, side-effect-light, and semver-stable.
 */
export { declareRestrictedFields } from './utils/field-restrictions'
export type { RestrictedFieldsDeclaration } from './utils/field-restrictions'
