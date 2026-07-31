## 1.0.1

- Remove test artifacts from repo & package
- Fix document upload api endpoint to not return internal file_key. The files are saved with ACL: private, but a Medusa backend configured to use R2 storage via the s3 file provider silently ignores that.

## 1.0.0

- Fix a11y issues with create modal and edit drawer
- Updated medusa packages to 2.18.0
- Bump other dependency versions

## 0.4.3

- Updated medusa packages to 2.17.2
- Migrated all integration tests to work with changes introduced in @medusajs/test-utils 2.17.0

## 0.4.2

- Make create and edit forms more consistent across plugins

## 0.4.1

- Fix type error in complaint list view

## 0.4.0

- Enable export of one or more complaints in PDF format from list view

## 0.3.0

- Enable document upload.
- Complaint fields order_id and product_id are now optional. Customer_id is still required.
- Added two new complaint properties: actionable and reportable. Both default to false. Actionable indicates the complaint requires investigation or some other follow-up that should be tracked. Reportable indicates the complaint should be reported to a regulator.
- The complaint list view is now filtered to show only actionable complaints by default. The filter can be edited by users to show all complaints.

## 0.2.1

- Upgrade underlying Medusa packages

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
