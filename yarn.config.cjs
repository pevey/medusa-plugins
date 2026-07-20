// Yarn constraints — enforce dependency-version conventions across the monorepo.
//
// Run `yarn constraints` to check, `yarn constraints --fix` to auto-apply.
// Conventions (see docs / memory "dependency-version-conventions"):
//   • devDependencies  → EXACT pin. Never installed by consumers of a published
//     plugin, so tight pinning is a pure security/reproducibility win with no
//     downstream cost. Enforced for packages/* (plugins) only — apps own their
//     own framework toolchains (Astro/etc.) and are intentionally left alone.
//   • peerDependencies → RANGE. Exact-pinned peers force a consuming project onto
//     one exact host version and cause ERESOLVE / duplicate-singleton bugs.
//   • dependencies     → prefer caret (not enforced here; see runtime-dep note).

// Canonical versions for build tooling shared across the publishable plugins.
const PINNED_DEV_TOOLING = {
	typescript: "6.0.3",
	vite: "8.1.5",
	vitest: "4.1.10",
	"@types/node": "22.20.1",
};

// Medusa framework peers must be ranges, not exact pins. `^2.17.2` accepts the
// whole 2.x line at or above the version the plugins were built against.
const MEDUSA_PEER_RANGE = "^2.17.2";
const MEDUSA_PEER_IDENTS = new Set([
	"@medusajs/framework",
	"@medusajs/js-sdk",
	"@medusajs/medusa",
]);

module.exports = {
	async constraints({ Yarn }) {
		for (const dep of Yarn.dependencies()) {
			const isPlugin = dep.workspace.cwd.includes("/packages/");

			// 1. Pin shared dev tooling to one version — plugins only.
			if (
				isPlugin &&
				dep.type !== "peerDependencies" &&
				PINNED_DEV_TOOLING[dep.ident]
			) {
				dep.update(PINNED_DEV_TOOLING[dep.ident]);
			}

			// 2. Medusa peers must use the shared range, never an exact pin.
			if (dep.type === "peerDependencies" && MEDUSA_PEER_IDENTS.has(dep.ident)) {
				dep.update(MEDUSA_PEER_RANGE);
			}
		}
	},
};
