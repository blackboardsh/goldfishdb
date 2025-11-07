# GoldfishDB

A lightweight in-memory document database with TypeScript-first design and atomic writes.

## Features

- **TypeScript-first**: Full type safety with zero configuration
- **In-memory**: Loads entire database into memory for fast access
- **Encrypted by default**: AES-256-GCM encryption with optional custom passphrase
- **Atomic writes**: Protection against data corruption during interruptions
- **Schema migrations**: Built-in versioning and migration system
- **Zero build step**: Works directly with TypeScript
- **Collections**: Document-based storage with automatic ID generation

## Installation

```bash
npm install goldfishdb
```

## Quick Start

```typescript
import DB from 'goldfishdb';

// Define your schema
const schema = {
  v: 1,
  stores: {
    users: {
      type: "collection",
      schema: {
        name: { type: "string", required: true },
        email: { type: "string", required: true },
        age: { type: "number", required: false }
      }
    }
  }
};

// Initialize database with default encryption
const db = new DB<typeof schema>().init({
  schemaHistory: [{ v: 1, schema, migrationSteps: false }],
  db_folder: './data'
});

// Or with custom passphrase for production
const prodDb = new DB<typeof schema>().init({
  schemaHistory: [{ v: 1, schema, migrationSteps: false }],
  db_folder: './data',
  passphrase: 'your-production-secret'
});

// Use the database
const user = db.collection('users').insert({
  name: "John Doe",
  email: "john@example.com",
  age: 30
});

const allUsers = db.collection('users').query();
const userById = db.collection('users').queryById(user.id);
```

## Key Benefits

- **Underserved niche**: Perfect for applications that need a simple, typed database without the complexity of full database systems
- **Fully typed**: Get complete IntelliSense and type checking on your data
- **Best practices**: Built-in patterns for schema evolution and data safety
- **No build step required**: Works directly in your TypeScript workflow

## Use Cases

- Development and prototyping
- Small to medium applications
- Applications requiring full type safety
- Local-first applications
- Configuration and settings storage

## License

MIT