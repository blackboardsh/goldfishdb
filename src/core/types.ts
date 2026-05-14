






type emptyObject = Record<string, never>;



// file: SchemaPrimitivesTypes.ts
///////////////////////////////////

export type ValidPropertyTypes = "string" | "number" | "boolean" | "ref" | 'treenodelist';
export type ValidNestedPropertyTypes = "object" | "array" | 'record' | 'tree' | 'treenode'; 
export type ValidTypes = ValidNestedPropertyTypes | ValidPropertyTypes;
export type Ref = any;
export type RefArray = [Ref];
export type defaultProperty =
  | Ref
  | RefArray
  | string
  | number
  | boolean
  | any[]
  | {};

export interface DocumentPropertyType {
  type: ValidTypes;
  // TODO: default is a reserved word but def isn't descriptive enough
  def?: defaultProperty;
  // Force true or nothing, some mapped types we depend on
  // can't tell the difference between true and false
  required: boolean;
  private?: boolean;
  internal?: boolean;
  ref?: Ref;
}

export interface SchemaStringType {
  type: "string";
  def?: string;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaNumberType {
  type: "number";
  def?: number;
  // TODO: The reason type works and required doesn't is
  // when required: true | false here instead of boolean here
  // we need another level of inspection somewhere to check the actual value of required
  // when it's typed here as a boolean. an infer or something
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaBooleanType {
  type: "boolean";
  def?: boolean;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaRefType {
  type: "ref";
  collectionNames: string[];
  def?: string;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaArrayType<Schema = SchemaPropertyType> {
  type: "array";
  schema: Schema;
  // TODO: default types
  def?: any;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaObjectType<Schema = NestedSchemaType> {
  type: "object";
  schema: Schema;
  // TODO: default types
  def?: any;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

// Record is a special type of object that has arbitrary string keys and the schema describes the shape of each value
export interface SchemaRecordType<Schema = NestedSchemaType> {
  type: 'record';
  schema: Schema;
  def?: any;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

type StringKeyOf<T> = Extract<keyof T, string>;

interface Node<Schema, NodeNames extends keyof Schema = keyof Schema> {
  children?: NodeNames[];
}

interface RelType<Schema> {
  children: Array<keyof Schema>;
}

// TREES
// Schema is an object where keys are the nodetype names and the values are the "nested" schema of that object
// By passing the Schema down to the listtype we can use the keys to type check against children within eahc node
export interface SchemaTreeType<Schema = {[nodeName: string]: NestedSchemaType}, NodeNames extends keyof Schema = keyof Schema> {
  type: 'tree';  
  // nodes: {[nodeName in NodeNames]: SchemaTreeNodeType<Schema & {children?: SchemaNodeListType<'folder' | 'file'>}>} // works
  nodes: {[key: string]: Node<Schema>} // works?
  root: NodeNames[]
  // rel: {children: string[]}//RelType<Schema>
  def?: any;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

export interface SchemaTreeNodeType<Schema = NestedSchemaType> {
  type: 'treenode';  
  schema: Schema //& Extension// & {children?:SchemaNodeListType< NodeNames>};
  def?: any;  
}

// This should be an array of strings that are the keys of the Schema
// export interface SchemaNodeListType<NodeNames = string> {
//   type: 'treenodelist';
//   schema: NodeNames[];
//   def?: any;
//   required: boolean;
//   private?: boolean;
//   internal?: boolean;
// }

export interface SchemaNodeListType<Schema = SchemaPropertyType> {
  type: "treenodelist";
  schema: Schema;
  // TODO: default types
  def?: any;
  required: boolean;
  private?: boolean;
  internal?: boolean;
}

// todo (yoav): need two separate things implemented
// 1. we need to define children branch keys of the tree on a node
// 2. we need to constrain them to the original schema's keys




// export interface SchemaRequiredProperty<Schema = NestedSchemaType> {
//   required: true;
// }

type SchemaTreeNodeListType = string[]

export type SchemaPropertyType =
  | SchemaStringType
  | SchemaNumberType
  | SchemaBooleanType
  | SchemaArrayType
  | SchemaObjectType
  | SchemaRecordType 
  | SchemaTreeType
  | SchemaTreeNodeType
  | SchemaNodeListType
  // | SchemaTreeNodeListType


export type NestedSchemaType = {
  [propertyName: string]: SchemaPropertyType;
};

// file: SchemaTypes.ts
///////////////////////////////////
export type SchemaDefinition<MyStores> = {
  v: number;
  stores: MyStores;
};

export type SchemaDefinitionDefault = { [storeName: string]: StoreTypes };

export type SchemaDefinitionWithDefaults<
  MyStores extends SchemaDefinitionDefault = SchemaDefinitionDefault
> = {
  v: number;
  stores: MyStores;
};

// export type ExtBase<A, B> = A<B>

export type MigrationFn<FromDocType, ToDocType, DB> = (
  doc: FromDocType,
  db: DB
) => ToDocType;

export type SchemaHistory = Array<SchemaVersion>;

export type SchemaVersion = {
  v: number;
  schema: SchemaDefinition<SchemaDefinitionDefault>;
  migrationSteps: false | Array<StoreMigrations>;
};

export type DocumentMigrationFunction = (document: any, db: any, targetSchema: any) => any;

export type DocumentMigration =
  | false
  | DocumentMigrationFunction

export type StoreMigrations = {
  [storeName: string]: DocumentMigration;
};



export interface DBConfig {
  schemaHistory: SchemaHistory;
  // used in testing
  engine?: 'none' | 'file' | 'indexeddb';
  initialData?: any;
  db_folder?: string;
  db_name?: string;
  // encryption passphrase (uses secure default if not provided)
  passphrase?: string;
}


// file: SchemaToDocumentTypes.ts
///////////////////////////////////
// working
// todo (yoav): consider separating stores from types and renaming stores to collectionStore etc.
export type SchemaShapeToDocumentType<Shape> = Shape extends { type: "string" }
  ? string
  : Shape extends { type: "ref" }
  ? string
  : Shape extends { type: "number" }
  ? number
  : Shape extends { type: "boolean" }
  ? boolean
  : Shape extends { type: "array"; schema: infer NestedShape }
  ? Array<SchemaShapeToDocumentType<NestedShape>>
  : Shape extends { type: "object"; schema: infer NestedSchema }
  ? StoreSchemaToDocumentType<NestedSchema>  
  : Shape extends { type: "record"; schema: infer NestedSchema }
  ? RecordSchemaToDocumentType<NestedSchema>
  : Shape extends { type: "tree"; nodes: infer NodeSchemas, root: infer RootNodeList   }
  // todo (yoav): consider moving nodes and root into schema so schema = config
  ? TreeSchemaToDocumentType<NodeSchemas, Extract<RootNodeList, keyof NodeSchemas>[] >
  : Shape extends { type: "treenode"; schema: infer NestedSchema }
  ? TreeNodeSchemaToDocumentType<NestedSchema>
  : Shape extends { type: "treenodelist"; schema: infer NestedSchema }
  ? TreeNodeListSchemaToDocumentType<NestedSchema>
  : Shape extends { type: "collection"; schema: infer NestedSchema }
  ? StoreSchemaToDocumentType<NestedSchema>
  : never;

export type RequiredKeys<T> = {
  [K in keyof T]: T[K] extends { required: false } ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]: [T[K]] extends [{ required: false }] ? K : never;
}[keyof T];

// export type TreeSchemaToDocumentType<NodeSchemaTypes, RootNodeList> = {
//   test: 'string'
// }

export type TreeSchemaToDocumentType<NodeSchemaTypes, RootNodeList extends (keyof NodeSchemaTypes)[]> = 
SchemaShapeToDocumentType<NodeSchemaTypes[RootNodeList[number]]>;


export type TreeNodeSchemaToDocumentType<SchemaType> = {

}

export type TreeNodeListSchemaToDocumentType<SchemaType> = {

}

export type RecordSchemaToDocumentType<SchemaType> = {
  [key: string]: StoreSchemaToDocumentType<SchemaType>;
}

export type StoreSchemaToDocumentType<SchemaType> = {
  [Property in RequiredKeys<SchemaType>]: SchemaShapeToDocumentType<
    SchemaType[Property]
  >;
}
  &
  {
    [Property in OptionalKeys<SchemaType>]?: SchemaShapeToDocumentType<
      SchemaType[Property]
    >;
  };

export type StoreToDocumentType<Store> = Store extends
  | CollectionStore<infer Schema>
  | KeyValueStore<infer Schema>
  ? StoreSchemaToDocumentType<Schema>
  : never;

// TODO: rename so the different levels of schema are clearer
// schemaDefinition, vs. storeSchema, vs. documentSchema, vs. propertySchema
export type SchemaToDocumentTypes<
  SchemaDef extends SchemaDefinition<SchemaDef["stores"]>
> = {
    [StoreName in keyof SchemaDef["stores"]]: SchemaShapeToDocumentType<
      SchemaDef["stores"][StoreName]
    >;
  };



// file: DataStoreTypes.ts
///////////////////////////////////

export type DataType<Schema extends SchemaDefinition<Schema["stores"]>> = {
  stores: {
    collection: emptyObject | {
      [storeName in keyof Schema["stores"]]: {
        // TODO: this any should actually be the typescript version of valid data types
        // [id: string]: SchemaShapeToDocumentType<Schema["stores"][storeName]>
        [id: string]: SchemaToDocumentTypes<Schema>[storeName];
      };
    };
    // keyValue: {
    //   [storeName in keyof Schema["stores"]]: {
    //     // TODO: this any should actually be the typescript version of valid data types
    //     [id: string]: SchemaToDocumentTypes<Schema>[storeName];
    //   };
    // };
  };
  // info = metadata
  // assorted metadata
  info: {
    collections: emptyObject | {
      // a key for every collection
      [storeName in keyof Schema["stores"]]: {
        lastId: number;
      };
    };
  };

  schema: Schema;
  // the last couple backups
  backups: Array<Backup<Schema>>;
  // The current data version
  dataVersion: Number;
  // log of data versions that this database has seen  
  log: Array<Number>;
  // goldfish's db structure version, for goldfish authored migrations
  goldfishVersion: 1;
};

export type Backup<Schema extends SchemaDefinition<Schema["stores"]>> = {
  v: number;
  // direction: "pre-migrate" | "pre-rollback";
  snapshot: Pick<DataType<Schema>, "stores" | "schema" | "info">;
  date: Date;
}





// file: CollectionStoreTypes.ts
///////////////////////////////////



export type CollectionStore<CollectionSchema extends NestedSchemaType = NestedSchemaType> = {
  type: "collection";
  schema: CollectionSchema;
};

export type CollectionStoreSchema = CollectionStore["schema"]

export type CollectionSchemaInternalProperties<PropertySchema> = PropertySchema & {
  id: SchemaStringType;
  date_created: SchemaNumberType;
  date_updated: SchemaNumberType;
};


// filters are used to filter out properties of an object based on their properties. useful if you have an object of blog post objects
// that you want to filter by author
export type Filter = {
  prop: string; // dot notation path relative to dotPath
  // TODO: this could be any valid value type
  val: string; // the value to compare it to, could be any type incl regex.
  // TODO: this should actually be a list of filter methods
  method: string; // the method of comparison ie: is(), contains, regex, etc.
};

export type QueryOpts = {
  where?: (item: any) => boolean;
  sort?: (a: unknown, b: unknown) => number;
  select?: [string];
  // expandRefs?: boolean
};

export type DBError = {
  err: string;
  result: null;
};

export type DBResult = {
  result: any;
  err: null;
};

export type CollectionQueryById<DocumentType> = (
  id: string,
  opts?: {
    select?: Array<string>;
    expandRefs?: number;
    includePrivate?: boolean;
  }
) => {
  data: null | CollectionSchemaInternalProperties<DocumentType>;
  err: null;
};

export type CollectionQuery<DocumentType> = (opts?: {
  where?: (document: Readonly<DocumentType>) => boolean;
  sort?: (a: Readonly<DocumentType>, b: Readonly<DocumentType>) => number;
  limit?: number;
  select?: Array<string>;
  expandRefs?: number;
  includePrivate?: boolean;
}) => { data: Array<DocumentType>; err: null };

// todo (yoav): make DocumentWithoutInternalProperties a utility type
export type CollectionInsert<DocumentType> = (
  document: Omit<DocumentType, "id" | "date_created" | "date_updated">
) => DocumentType;

export type CollectionUpdate<DocumentType> = (
  id: string,
  document: Partial<DocumentType>
) => DocumentType;

export type CollectionRemove<DocumentType> = (id: string) => boolean;

export type CollectionMethods<DocumentType> = {
  queryById: CollectionQueryById<DocumentType>;
  query: CollectionQuery<DocumentType>;
  insert: CollectionInsert<DocumentType>;
  update: CollectionUpdate<DocumentType>;
  remove: CollectionRemove<DocumentType>;
};




// file: KeyvalueStoreTypes.ts
///////////////////////////////////
export type KeyValueStore<Schema = NestedSchemaType> = {
  type: "keyvalue";
  schema: Schema;
};


// file: StoreTypes.ts
///////////////////////////////////
export type StoreTypes = CollectionStore | KeyValueStore;
