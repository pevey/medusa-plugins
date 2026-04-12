const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()

process.setMaxListeners(50)