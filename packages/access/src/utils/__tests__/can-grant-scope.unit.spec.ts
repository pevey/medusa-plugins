import { canGrantScope, ResolvedPermission } from '../has-permission'

const RESOURCE = 'customer'
const OPERATION = 'delete'

type TargetScope = undefined | 'own' | 'company'

describe('canGrantScope', () => {
	const cases: { label: string; granted: ResolvedPermission[]; expected: Record<'unrestricted' | 'own' | 'company', boolean> }[] = [
		{
			label: 'holds nothing for the pair',
			granted: [],
			expected: { unrestricted: false, own: false, company: false }
		},
		{
			label: 'holds it unrestricted',
			granted: [{ resource: RESOURCE, operation: OPERATION }],
			expected: { unrestricted: true, own: true, company: true }
		},
		{
			label: 'holds it only @own',
			granted: [{ resource: RESOURCE, operation: OPERATION, scope: 'own' }],
			expected: { unrestricted: false, own: true, company: false }
		},
		{
			label: 'holds it @own AND @company (two entries, same pair)',
			granted: [
				{ resource: RESOURCE, operation: OPERATION, scope: 'own' },
				{ resource: RESOURCE, operation: OPERATION, scope: 'company' }
			],
			expected: { unrestricted: false, own: true, company: true }
		},
		{
			label: 'holds unrestricted for a DIFFERENT pair only',
			granted: [{ resource: RESOURCE, operation: 'read' }],
			expected: { unrestricted: false, own: false, company: false }
		}
	]

	const targetScopes: { name: 'unrestricted' | 'own' | 'company'; value: TargetScope }[] = [
		{ name: 'unrestricted', value: undefined },
		{ name: 'own', value: 'own' },
		{ name: 'company', value: 'company' }
	]

	for (const { label, granted, expected } of cases) {
		describe(label, () => {
			for (const { name, value } of targetScopes) {
				it(`granting at ${name} -> ${expected[name]}`, () => {
					expect(canGrantScope(granted, RESOURCE, OPERATION, value)).toBe(expected[name])
				})
			}
		})
	}
})
