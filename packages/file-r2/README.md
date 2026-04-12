# medusa-plugin-r2

File storage provider for Cloudflare R2.

[Documentation](https://pevey.com/medusa-plugin-r2)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Supports specifying two separate buckets: one public and one private
- Supports specifying a global prefix in the provider options
- Supports specifying a prefix on a per-file basis by adding prefix: 'example/' in the file DTO

## Background

The R2 api is based on the S3 api, enabling the official S3 file provider to somewhat work for R2. However, there are some drawbacks:

- Medusa handles making a file public or private by including 'ACL: public' or 'ACL: private' in the file upload DTO. R2 does not support ACL.
- To serve product images, the main R2 bucket must be public.
- To use a custom URL, the bucket must be behind Cloudflare's CDN (you would want this anyway since direct access to an R2 or S3 bucket is a DDoS exposure)
- If a bucket is behind Cloudflare's CDN, it does not support presigned urls

Therefore, using the S3 file provider for R2 meant it did not support the full provider interface. For a very basic Medusa project, this might not be a problem. But for projects needing to use features like private files and presigned urls, it is a problem.

This R2-specific file provider handles the differences by accepting two buckets in its configuration. One is meant for public access and will automatically be used any time the ACL is set to public. The other bucket is meant for private files and supports presigned url generation.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-r2
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your medusa-config.js file. Example:

```ts
module.exports = defineConfig({
	//... other config
	modules: [
		{
			resolve: '@medusajs/medusa/file',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-r2',
						id: 'r2',
						options: {
							region: process.env.R2_REGION,
							bucket: process.env.R2_BUCKET,
							accessKeyId: process.env.R2_ACCESS_KEY_ID,
							secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
							fileUrl: process.env.R2_FILE_URL,
							endpoint: process.env.R2_ENDPOINT,
							privateRegion: process.env.R2_PRIVATE_REGION,
							privateBucket: process.env.R2_PRIVATE_BUCKET,
							privateAccessKeyId: process.env.R2_PRIVATE_ACCESS_KEY_ID,
							privateSecretAccessKey: process.env.R2_PRIVATE_SECRET_ACCESS_KEY,
							privateEndpoint: process.env.R2_PRIVATE_ENDPOINT,
							globalPrefix: 'medusa' // optional prefix to use when uploading any file
						}
					}
				]
			}
		}
		// ... other modules
	]
})
```
