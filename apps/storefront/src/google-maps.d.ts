// @types/google.maps is hoisted to the monorepo root node_modules/@types; with this app's
// moduleResolution: "bundler" tsconfig, TypeScript's automatic ambient-@types walk doesn't reach it,
// so the google.maps.* namespace used by the google-places-autocomplete component is pulled in
// explicitly here.
/// <reference types="google.maps" />
