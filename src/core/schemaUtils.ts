import type {
  SchemaStringType,
  SchemaDefinition,
  SchemaNumberType,
  SchemaBooleanType,
  NestedSchemaType,
  KeyValueStore,
  // Migrations,
  CollectionStore,
  SchemaObjectType,
  SchemaPropertyType,
  SchemaArrayType,
  SchemaDefinitionDefault,
  SchemaDefinitionWithDefaults,
  StoreTypes,
  CollectionSchemaInternalProperties,
  RequiredKeys,
} from "./types";

const stringFactory = <
  T extends "string",
  Req extends boolean,
  Int extends boolean
>(opts: {
  required: Req;
  internal: Int;
}) => {
  const { required, internal } = opts;
  return {
    type: "string" as T,
    required,
    internal,
  };
};

const x = {
  username: stringFactory({ required: true, internal: false }),
  password: stringFactory({ required: false, internal: false }),
};

let y: RequiredKeys<typeof x>;

const numberFactory = <
  T extends "number",
  Req extends boolean,
  Int extends boolean
>(opts: {
  required: Req;
  internal: Int;
}) => {
  const { required, internal } = opts;

  return {
    type: "number" as T,
    required,
    internal,
  };
};

const booleanFactory = <
  T extends "boolean",
  Req extends boolean,
  Int extends boolean
>(opts: {
  required: Req;
  internal: Int;
}) => {
  const { required, internal } = opts;

  return {
    type: "boolean" as T,
    required,
    internal,
  };
};

const defaultOpts: {
  required: false;
  internal: false;
} = {
  required: false,
  internal: false,
};

const internalOpts = { ...defaultOpts, internal: true };

// todo (yoav): add type safety that checks for valid collection name (typescript or runtime)
const refFactory = <
  T extends "ref",
  Req extends boolean,
  Int extends boolean
>(collectionNames: string[], opts: {
  required: Req;
  internal: Int;
}) => {
  const { required, internal } = opts;

  return {
    type: "ref" as T,
    collectionNames,
    required,
    internal,
  };
};



const collectionFactory = <T extends "collection", Schema>(
  nestedSchema: Schema
) => {
  // const {migrations} = opts;

  // TODO: opts here can be things that control how it auto-increments, or date_created stuff
  return {
    type: "collection" as T,
    schema: {
      ...nestedSchema,
      id: stringFactory(internalOpts),
      date_created: numberFactory(internalOpts),
      date_updated: numberFactory(internalOpts),
    } as CollectionSchemaInternalProperties<Schema>,
    // migrations: migrations || false,
    // ...opts,
  };
};

// const keyValueFactory = <Schema extends NestedSchemaType>(
//   nestedSchema: Schema,
//   opts?: {
//     migrations: Migrations;
//   }
// ): KeyValueStore<Schema> => {
//   const { migrations } = opts || {};
//   // TODO: opts here can be things that control how it auto-increments, or date_created stuff
//   return {
//     type: "keyvalue",
//     schema: nestedSchema,
//     migrations: migrations || false,
//     ...opts,
//   };
// };

// TODO: update object, array, etc. factories to work with the new typing

// const objectFactory = <Schema extends NestedSchemaType>(
//   nestedSchema: Schema,
//   opts?: any
// ): SchemaObjectType<Schema> => {
//   // TODO: opts here can be things that control date_created stuff
//   const schemaValue = { type: "object", schema: nestedSchema, ...opts };

//   return schemaValue;
// };

// Note: this is for a key/value object and not a keyvalue store
// although those two concepts may be merged in the future
// The difference between this and a regular object is that the keys
// are typed as strings and not an explicit key name
const recordFactory = <
T extends "record",
Req extends boolean,
Int extends boolean,
Schema
>(
objectSchema: Schema,
opts: {
  required: Req;
  internal: Int;
}
) => {
const { required, internal } = opts;
// TODO: opts here can be things that control date_created stuff
const schemaValue = {
  type: "record" as T,
  required,
  internal,
  schema: objectSchema as Schema,
};

return schemaValue;
};


const objectFactory = <
  T extends "object",
  Req extends boolean,
  Int extends boolean,
  Schema
>(
  objectSchema: Schema,
  opts: {
    required: Req;
    internal: Int;
  }
) => {
  const { required, internal } = opts;
  // TODO: opts here can be things that control date_created stuff
  const schemaValue = {
    type: "object" as T,
    required,
    internal,
    schema: objectSchema as Schema,
  };

  return schemaValue;
};

const arrayFactory = <
  T extends "array",
  Req extends boolean,
  Int extends boolean,
  Schema extends SchemaPropertyType
>(
  arraySchema: Schema,
  opts: {
    required: Req;
    internal: Int;
  }
) => {
  const { required, internal } = opts;
  // TODO: opts here can be things that control date_created stuff
  return {
    type: "array" as T,
    required,
    internal,
    schema: arraySchema,
  };
};

const convertNodeChildrenToSchema = (node) => {
  if (node.children) {
    node.children = {
      type: 'treenodelist',
      schema: node.children,
      required: true,
      internal: false
    }
  } 

  return node;
}

const convertTreeNodesToSchema = <NodeSchemas>(nodes: NodeSchemas) => {
  const newNodes: NodeSchemas & {children?: {type: string, schema: string[], required: true, internal: false}} = {} as NodeSchemas & {children?: {type: string, schema: string[], required: true, internal: false}};

  for (const nodeName in nodes) {
    const node = nodes[nodeName];
    
    newNodes[(nodeName as string)] = convertNodeChildrenToSchema(node);
  }

  return newNodes;
}

// trees
const treeFactory = <
T extends "tree",
Req extends boolean,
Int extends boolean,
NodeSchemas,
NodeNames extends keyof NodeSchemas
>(
config: {
  nodes: NodeSchemas & {[nodeName in NodeNames]: {children?: NodeNames[]}},
  root: NodeNames[],
  // nodes: {[nodeName in NodeNames]: {children: NodeNames[]}},
},
opts: {
  required: Req;
  internal: Int;
}
) => {
const { required, internal } = opts;
// TODO: opts here can be things that control date_created stuff
const schemaValue = {
  type: "tree" as T,
  required,
  internal,
  nodes: convertTreeNodesToSchema(config.nodes) as NodeSchemas & {[nodeName in NodeNames]: {children?: NodeNames[]}},
  root: config.root,//convertTreeNodesToSchema(config.root),// as NodeNames
  // rel: config.rel
};

return schemaValue;
};

const treenodeFactory = <
T extends "treenode",
Schema
>(
objectSchema: Schema,
) => {

// TODO: opts here can be things that control date_created stuff
const schemaValue = {
  type: "treenode" as T,  
  schema: objectSchema as Schema,
};

return schemaValue;
};

const treenodelistFactory = <
  T extends "treenodelist",
  Req extends boolean,
  Int extends boolean,
  Schema// extends string[]
>(
  // an array of enums that are the tree's nodenames
  arraySchema: Schema,
  opts: {
    required: Req;
    internal: Int;
  }
) => {
  const { required, internal } = opts;
  // TODO: opts here can be things that control date_created stuff
  return {
    type: "treenodelist" as T,
    required,
    internal,
    schema: arraySchema as Schema,
  };
};

// broken
// function schemaFactory<
//   Stores extends { [storeName: string]: CollectionStore | KeyValueStore }
// >(schemaDefinition: SchemaDefinition<Stores>): SchemaDefinition<Stores> {
//   return schemaDefinition;
// }

// works
// function schemaFactory<T>(schemaDefinition: T): T {
//     return schemaDefinition;
// }

function schemaFactory<
  I extends SchemaDefinitionWithDefaults,
  O extends SchemaDefinition<I["stores"]>
>(schemaDefinition: I): O {
  return schemaDefinition as unknown as O;
}

// Create methods for creating collections and properties
export const schemaType = {
  schema: schemaFactory,
  //   schemaFactoryCheck,
  collection: collectionFactory,
  record: recordFactory,
  object: objectFactory,
  array: arrayFactory,
  tree: treeFactory,
  treenode: treenodeFactory,
  treenodelist: treenodelistFactory,
  ref: refFactory,
  // Note: we may not need this, why not just use an array with refs
  // ref_array: typeFactory('ref_array'),
  string: stringFactory,
  number: numberFactory,
  boolean: booleanFactory,
  // TODO: handle timezones and utc
  timestamp: numberFactory,
  // TODO: consider moving these defaults somwehere else
  defaultOpts,
};

export const v1 = {
  schemaType,
};
