## 0.3.0

- Complaint fields order_id and product_id are now optional. Customer_id is still required.
- Added two new complaint properties: actionable and reportable. Both default to false. Actionable indicates the complaint requires investigation or some other follow-up that should be tracked. Reportable indicates the complaint should be reported to a regulator.
- The complaint list view is now filtered to show only actionable complaints by default. The filter can be edited by users to show all complaints.

## 0.2.1

- Upgrade underlying Medusa packages

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
