// @ts-nocheck
import type {
  DBConfig,
  DataType,
  SchemaDefinition,
  // QueryOpts,
  // DBResult,
  // DBError,
  // StoreMigrations,
  SchemaHistory,
  SchemaData,
  // SchemaVersion,
  SchemaDataVersionMigrations,
  DocumentMigrationFunction,
  SchemaToDocumentTypes,
  MigrationFn,
  CollectionMethods,
  // SchemaDefinitionWithDefaults,
  // SchemaDefinitionDefault,
  CollectionQuery,
  CollectionQueryById,
  CollectionInsert,
  CollectionStore,
  CollectionUpdate,
  CollectionRemove,
  SchemaDefinitionWithDefaults,
  SchemaShapeToDocumentType,
  StoreSchemaToDocumentType,

} from "./types";

import {
  deepClone,
  // deepClone,
  deepCloneDocumentFromDocumentSchema,
  deepClonePropertyFromPropertySchema,
  selectPropertiesFromDocument,
} from "./utils";
import { v1 } from "./schemaUtils";

const DEFAULT_BACKUP_LIFESPAN = 1000 * 60 * 60 * 24 * 7 * 2; // 2 weeks
const DEFAULT_DATA_FOLDER = './data';
const DB_FILE_NAME = 'goldfish.db';

function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

export default abstract class Base<
  CurrentSchema extends SchemaDefinition<CurrentSchema["stores"]> // | SchemaDefinitionWithDefaults  
> {
  _data: DataType<CurrentSchema>;
  data_folder: string = DEFAULT_DATA_FOLDER;

  // indicates goldfish has finished initializing and is ready for queries. eg: if migrations needed to be run
  // it will be false until complete.
  ready: boolean = false;
  // TODO: implement a queue for queries that come in before the db is ready and/or use async/await when initing
  // instead of this ready flag.

  changed: boolean = false;
  is_writing: boolean = false;
  saveInterval;
  // read and write to a passed in object instead of a file on disk

  engine: 'none' | 'file' | 'indexeddb' = 'file';
  db_name: string = 'goldfishdb';
  indexedDbStoreName: string = 'documents';
  indexedDbRecordKey: string = DB_FILE_NAME;
  private indexedDbPromise: Promise<any> | null = null;
  
  // encryption settings (always enabled for file engine)
  private encryptionKey: Buffer | null = null;


  constructor() {
    // This will call some methods in the derived class that haven't been created yet (in the constructor)
    // so we just wait a tick before initializing the db
    // setTimeout(() => this.init(config), 0);
    // this.init(config);
  }

  private getDataFilePath() {
    return joinPath(this.data_folder, DB_FILE_NAME);
  }

  public init(config: DBConfig) {
    if (config.engine === 'indexeddb') {
      throw new Error("Use initAsync() with engine 'indexeddb'");
    }

    if (config.engine === 'none') {
      this.engine = 'none'
    }

    if (config.db_folder) {
      this.data_folder = config.db_folder;
    }

    if (config.db_name) {
      this.db_name = config.db_name;
    }

    // Setup encryption (always enabled for file engine)
    if (this.engine === 'file') {
      const passphrase = config.passphrase || 'goldfish-default-key-v1';
      this.encryptionKey = this.deriveKey(passphrase);
    }

    this.load(config);

    const { schemaHistory } = config;

    const currentDataVersion = schemaHistory[schemaHistory.length - 1].v;
    const schemas = schemaHistory.filter(item => Boolean(item.schema));
    const currentSchemaVersion = schemas[schemas.length - 1];
    const { schema: currentSchema } = currentSchemaVersion;

    this.setSchema(currentDataVersion, currentSchema as CurrentSchema, schemaHistory);

    this.saveInterval = setInterval(() => this.trySave(), 1000);

    if (typeof process !== "undefined" && process.env.NODE_ENV !== 'test') {
      process.on('beforeExit', () => {
        this.close();
      });
    }

    return this;
  }

  public async initAsync(config: DBConfig) {
    if (config.engine !== 'indexeddb') {
      return this.init(config);
    }

    this.engine = 'indexeddb';

    if (config.db_folder) {
      this.data_folder = config.db_folder;
    }

    if (config.db_name) {
      this.db_name = config.db_name;
    } else if (config.db_folder) {
      this.db_name = config.db_folder;
    }

    await this.loadAsync(config);

    const { schemaHistory } = config;
    const currentDataVersion = schemaHistory[schemaHistory.length - 1].v;
    const schemas = schemaHistory.filter(item => Boolean(item.schema));
    const currentSchemaVersion = schemas[schemas.length - 1];
    const { schema: currentSchema } = currentSchemaVersion;

    this.setSchema(currentDataVersion, currentSchema as CurrentSchema, schemaHistory);

    this.saveInterval = setInterval(() => {
      void this.trySaveAsync();
    }, 1000);

    if (typeof window !== "undefined") {
      const persist = () => { void this.trySaveAsync(); };
      window.addEventListener("pagehide", persist);
      window.addEventListener("beforeunload", persist);
    }

    return this;
  }

  private load(config: DBConfig) {

    // loaded the data from elsewhere, mostly used in tests
    if (this.engine === 'none') {

      // Maintain link between reference objects
      this._data = config.initialData;
    } else if (this.engine === 'file') {
      const dataPath = this.getDataFilePath();
      const nextPath = dataPath.replace('.db', '_next.db');
      
      // Check for interrupted atomic write
      if (this.existsSync(nextPath)) {
        // Previous write was interrupted, complete it
        try {
          // Verify the temp file is valid before completing the atomic write
          const nextData = this.readFileSync(nextPath);
          const decrypted = this.encryptionKey ? this.decrypt(nextData) : nextData;
          JSON.parse(decrypted);
          this.renameSync(nextPath, dataPath);
        } catch (err) {
          // Temp file is corrupted, remove it and continue with main file
          this.unlinkSync(nextPath);
        }
      }
      
      try {
        const rawData = this.readFileSync(dataPath);
        const decrypted = this.encryptionKey ? this.decrypt(rawData) : rawData;
        this._data = JSON.parse(decrypted);
      } catch (err) {
        // try create the file
        console.error("failed to parse on load");
        //   this.changed = true;
        //   this.trySave();
      }
    }

    // If the database file is new or was corrupted load the default _data object into memory
    if (!this._data) {

      this._data = {
        stores: {
          collection: {},
          // keyValue: {},
        },
        info: {
          collections: {},
        },
        dataVersion: 0,
        goldfishVersion: 1,
        schema: null,
        backups: [],
        log: []
      };
    }

  }

  private async loadAsync(config: DBConfig) {
    if (this.engine !== 'indexeddb') {
      this.load(config);
      return;
    }

    if (config.initialData) {
      this._data = config.initialData;
      return;
    }

    try {
      const serialized = await this.readIndexedDbRecord();
      if (serialized) {
        this._data = JSON.parse(serialized);
      }
    } catch (err) {
      console.error("failed to parse on indexeddb load");
    }

    if (!this._data) {
      this._data = {
        stores: {
          collection: {},
        },
        info: {
          collections: {},
        },
        dataVersion: 0,
        goldfishVersion: 1,
        schema: null,
        backups: [],
        log: []
      };
    }
  }

  private setSchema(
    targetDataVersion: number,
    targetSchema: CurrentSchema,
    schemaHistory: SchemaHistory,
  ) {

    // This could be the same of currentSchema
    // let prevSchemaData = this._data.schema;
    let prevDataVersion = this._data.dataVersion;

    if (targetDataVersion < prevDataVersion) {

      // This will throw if we don't have a backup of the previous version
      this.rollbackDataToVersion(targetDataVersion);
    } else {
      for (let i = 0; i < schemaHistory.length; i++) {

        const { v, schema, migrationSteps } = schemaHistory[i];


        if (v > prevDataVersion) {
          this.migrateDataToVersion(v, schema, migrationSteps);
          // this.applyMigrationToStores()      
        }
      };
    }

    this.cleanupBackups();
    // this.migrateDataToCurrent(prevSchemaData);



    this.ready = true;

    // Set up stores if they're new
    // TODO: maybe this should happen before migrations are run



    // TODO: handle key/Value, stack, queue, etc.
    this.changed = true;
  }

  cleanupBackups() {
    const backupsToKeep = [];
    for (const backup of this._data.backups) {
      if (backup.date > Date.now() - DEFAULT_BACKUP_LIFESPAN) {
        backupsToKeep.push(backup);
      }
    }

    this._data.backups = backupsToKeep;
  }

  // private migrateDataToCurrent = (prevSchemaData: SchemaData) => {
  //   const currentSchemaData = this._data.schema;

  //   // const prevVersions = prevSchemaData.migrations.versions;
  //   const currentVersions = currentSchemaData.migrations.versions;

  //   let index = 0;

  //   while (
  //     // index < prevVersions.length &&
  //     index < currentVersions.length &&
  //     prevVersions[index] === currentVersions[index]
  //   ) {
  //     index++;
  //   }

  //   const downMigrations = prevVersions.slice(index).reverse();
  //   const upMigrations = currentVersions.slice(index);

  //   for (let d = 0; downMigrations.length; d++) {
  //     const schemaHashIndex = downMigrations[d];
  //     // note: this should also exist on currentSchemaData
  //     const targetMigrations = prevSchemaData.migrations.map[schemaHashIndex];
  //     this.applyMigrationToStores("down", targetMigrations, schemaHashIndex);
  //   }

  //   console.log('up migrations?', upMigrations.length, prevVersions, currentVersions)
  //   for (let u = 0; upMigrations.length; u++) {
  //     const schemaHashIndex = upMigrations[u];
  //     const targetMigrations =
  //       currentSchemaData.migrations.map[schemaHashIndex];
  //     console.log('hererere')
  //     this.applyMigrationToStores("up", targetMigrations, schemaHashIndex);
  //   }

  //   // const prevSchemaHashIndex =
  //   //   this._data.schema.migrations.schemaHashes.indexOf(
  //   //     this.generateSchemaHash(prevSchemaData.current)
  //   //   );
  //   // const currentSchemaHashIndex =
  //   //   this._data.schema.migrations.schemaHashes.indexOf(
  //   //     this.generateSchemaHash(currentSchemaData.current)
  //   //   );

  //   // // check if the previous schema is still considered mainline and get its index.
  //   // const prevSchemaVersionIndex =
  //   //   this._data.schema.migrations.versions.indexOf(prevSchemaHashIndex);

  //   // // Note: We assume that in dev(wip schema) or prod(emergency roll back) you likely only have a single schema that will ever be
  //   // // abandoned for any given environment. ie: prevSchemaData.current may no longer exist in the code base, but older schemas than that
  //   // // should always be. so we only expect this to migrate down a single step.

  //   // // However we're leaving the behaviour to unwrap as far as it needs in the event you have multiple emergency rollbacks. This should warn visibly
  //   // // when encountering 2+ down grades and then leave it up to the user to catch in dev/qa if they don't want this behaviour in prod.
  //   // if (prevSchemaVersionIndex === -1) {
  //   //   // prevSchema.
  //   //   // migrate down until we hit mainline
  //   //   this.applyMigrationToStores('down', prevSchemaData)
  //   // }

  //   // // now migrate up mainline versions until current.

  //   // const;
  // };

  private rollbackDataToVersion = (targetDataVersion) => {
    const backup = this._data.backups.find(backup => backup.dataVersion === targetDataVersion);

    if (!backup) {
      throw new Error(`No backup found for version ${targetDataVersion}`)
    }

    const { stores, schema, info } = backup.snapshot;

    this.backupData();

    this._data.schema = schema;
    this._data.stores = stores
    this._data.info = info;
    this._data.dataVersion = targetDataVersion

    this._data.log.push(targetDataVersion)
  }

  private backupData = () => {
    // no need to backup the initial state
    if (this._data.schema === null) {
      return;
    }

    this._data.backups.push({
      dataVersion: this._data.dataVersion,
      // todo (yoav): this should be a deep copy
      snapshot: deepClone({
        schema: this._data.schema,
        stores: this._data.stores,
        info: this._data.info,
      }),
      date: new Date(),
    })
  }

  // targetSchema will be undefined if we're not changing the schema
  private migrateDataToVersion = (
    v, targetSchema, migrationSteps
  ) => {

    // console.log('migrateDataToVersion', v, targetSchema, migrationSteps)
    this.backupData();

    if (migrationSteps) {
      // console.log('migrationSteps')
      for (let i = 0; i < migrationSteps.length; i++) {
        const migrationStep = migrationSteps[i];
        const storesToMigrate = Object.keys(migrationStep);

        for (let s = 0; s < storesToMigrate.length; s++) {
          const storeName = storesToMigrate[s];

          const currentStoreSchema = this._data.schema.stores[storeName];
          const storeType = currentStoreSchema.type;
          const store = this._data.stores[storeType][storeName];
          const migrationFn = migrationStep[storeName];

          if (migrationFn) {

            for (const key in store) {
              const document = store[key];
              // Note: The whole database would have been deepCloned and snapshotted
              // before this. So we can safely mutate the document in place.              
              // as well as delete it or use any db methods on it.
              migrationFn(document, this, targetSchema);
            }
          }
        }
      }
    }

    this._data.schema = targetSchema;
    this._data.dataVersion = v;

    this.initInfoForSchema(targetSchema);

    this._data.log.push(v);
  }

  private initInfoForSchema = (targetSchema) => {
    const stores = targetSchema.stores;
    const storeKeys = Object.keys(stores);
    const collectionKeys = storeKeys.filter(
      (storeName) => stores[storeName].type === "collection"
    );

    // load collections
    collectionKeys.forEach((collectionName) => {
      // TODO: normalize this info.collections vs. stores.collection
      if (!this._data.info.collections[collectionName]) {
        // console.log("----> creating info for collection", collectionName);
        this._data.info.collections[collectionName] = { lastId: 0 };
      }

      const storeType = stores[collectionName].type;
      // TODO: do we need to keep the stores separate like this by type?
      if (!this._data.stores[storeType][collectionName]) {
        // console.log(
        //   "----> creating store for collection",
        //   collectionName,
        //   this._data
        // );
        this._data.stores.collection[collectionName] = {};
      }
    });
  }

  // private applyMigrationToStores = (
  //   direction: "up" | "down",
  //   schemaVersion: SchemaDataVersionMigrations,
  //   schemaHashIndex: number
  //   // prevSchemaData: SchemaData
  // ) => {
  //   const { v, migrations } = schemaVersion;

  //   this._data.schema.migrations.log.push({
  //     v,
  //     direction,
  //     schemaHashIndex,
  //     // warnings: [],// TODO: add a logging method for use by the user inside migration functions that can be stored here.
  //   });

  //   // You can specify a multi-step migration although most times the migrations array here will only have a single index.
  //   // We want to migrate the entire database with each step as a step may rely on database queries that expect the previous
  //   // step to have been applied globally.
  //   const documentMigrations = migrations.forEach((storeMigration) => {
  //     const storesNames = Object.keys(storeMigration);
  //     // TODO: do we need the schemaFrom and the schemaTo to be available in migration functions?
  //     // eg: any given document migration function can't know how much of the documents have been migrated without storing some metadata
  //     // or duplicating the entire database in memory during migrations.

  //     // NOTE: if this fails then your database is corrupt and you need a specialized tool to resolve.
  //     const schema: SchemaDefinition = JSON.parse(
  //       this._data.schema.migrations.schemaHashes[schemaHashIndex]
  //     );

  //     storesNames.forEach((storeName) => {
  //       const store = this._data.stores[storeName];
  //       const storeMigrations = storeMigration[storeName];

  //       if (storeMigrations) {
  //         const migrateDocument = storeMigrations[direction];
  //         // TODO: need to version the abstractNode class methods that migrations may use to make them immutable.

  //         const storeSchema = schema.stores[storeName];

  //         if (storeSchema.type === "collection") {
  //           this.applyMigrationToCollectionStore(storeName as keyof CurrentSchema["stores"]["collections"], migrateDocument);
  //         } else if (storeSchema.type === "keyvalue") {
  //           this.applyMigrationToKeyValueStore(storeName, migrateDocument);
  //         }
  //       }

  //       this._data.schema = schema;
  //     });
  //   });

  //   // TODO: maintain migration log of direction and schema version
  // };

  // private applyMigrationToCollectionStore = (
  //   storeName: string,
  //   migrateDocument: DocumentMigrationFunction
  // ) => {
  //   // TODO: loop over documents, 'update' them in place using abstract class methods
  //   const allDocuments = this.collection(storeName).query()

  //   allDocuments.forEach((document) => {
  //     this.update(storeName, document.id, migrateDocument(document, this));
  //   });
  // };

  // // note: with keyvalue store there's just one document
  // private applyMigrationToKeyValueStore = (
  //   storeName: string,
  //   migrateDocument
  // ) => {
  //   // this.update(storeName)
  //   // TODO: need keyvalue methods to update
  // };

  // TODO: this should be a util not a member of the class
  // private generateSchemaHash = (schema: CurrentSchema | SchemaDefinitionWithDefaults) => {
  //   // NOTE: if you change this implementation (stringified schema object) for the hash
  //   // then we will need to store the schema object in some form somewhere else for use during migrations.
  //   return JSON.stringify(schema);
  // };

  private trySave() {
    var data_str;

    if (this.changed === false || this.is_writing === true) {
      return;
    }

    this.is_writing = true;

    try {

      if (this.engine === 'none') {
        // do nothing. user can grab db._data in tests

      } else if (this.engine === 'file') {
        // console.log("trySave");
        // console.log('saving: ', _data)
        this.changed = false;
        data_str = JSON.stringify(this._data);
        
        // Encrypt for file storage (always enabled)
        const finalData = this.encryptionKey ? this.encrypt(data_str) : data_str;
        
        // console.log('hi', data_str)

        this.mkdirSync(this.data_folder);

        this.writeFileSyncAtomic(this.getDataFilePath(), finalData);
      }

    } catch (err) {
      console.log("error writing db: ", err);
    }

    this.is_writing = false;
  }

  private async trySaveAsync() {
    if (this.engine !== 'indexeddb') {
      this.trySave();
      return;
    }

    if (this.changed === false || this.is_writing === true) {
      return;
    }

    this.is_writing = true;

    try {
      this.changed = false;
      const data_str = JSON.stringify(this._data);
      await this.writeIndexedDbRecord(data_str);
    } catch (err) {
      console.log("error writing indexeddb: ", err);
    }

    this.is_writing = false;
  }

  private saveChanges() {
    this.changed = true;
    this.trySave();
  }

  // re-usable on demand closure for stores
  //   private storeMethods = {};

  // Collection methods
  //   public collection = (collectionName: string) => {
  public collection = <
    StoreName extends keyof CurrentSchema["stores"],
    StoreSchema = CurrentSchema["stores"][StoreName],
    DocumentType = StoreSchemaToDocumentType<StoreSchema["schema"]>
  >(
    collectionName: StoreName
  ): CollectionMethods<DocumentType> => {
    // TODO: it's silly we have to do this casting here
    const storeSchema = this._data.schema.stores[
      collectionName
    ] as CollectionStore;
    const storeData = this._data.stores.collection[collectionName] as {
      [id: string]: DocumentType;
    };

    if (!storeSchema || storeSchema.type !== "collection") {
      throw new Error(
        `The ${collectionName as string
        } store is not a collection store, it's a ${storeSchema.type}`
      );
    }

    const collectionShape = storeSchema.schema;
    const storeInfo = this._data.info.collections[collectionName];
    const deepCloneDocument = deepCloneDocumentFromDocumentSchema<DocumentType>(
      storeSchema.schema
    );

    const queryById: CollectionQueryById<DocumentType> = (
      id: string,
      { select, expandRefs = 0, includePrivate = false } = {}
    ) => {
      const schemaPropertyKeys = Object.keys(collectionShape);

      const selectedProperties = schemaPropertyKeys.reduce(
        (selection, propertyName) => {
          const propertySchema = collectionShape[propertyName];
          const isSelected = !select || select.includes(propertyName);
          const isAllowed = includePrivate || !propertySchema.private;

          selection[propertyName] = isSelected && isAllowed;

          return selection;
        },
        {}
      );

      const document = storeData[id];

      // console.log("queryById", storeData, id, document);

      if (!document) {
        return { data: null, err: null };
      }

      // console.log(
      //   "selected document",
      //   document,
      //   storeSchema,
      //   selectedProperties,
      //   schemaPropertyKeys
      // );
      const data = selectPropertiesFromDocument(
        storeSchema,
        selectedProperties,
        schemaPropertyKeys,
        document
      );

      return { data, err: null };
    };

    const query: CollectionQuery<DocumentType> = (opts) => {
      const {
        where,
        sort,
        limit,
        select,
        expandRefs = 0,
        includePrivate = false,
      } = opts || {};
      const data: Array<DocumentType> = [];
      // note: we can store this on the schema itself during init
      const schemaPropertyKeys = Object.keys(collectionShape);

      const selectedProperties = schemaPropertyKeys.reduce(
        (selection, propertyName) => {
          const propertySchema = collectionShape[propertyName];
          const isSelected = !select || select.includes(propertyName);
          const isAllowed = includePrivate || !propertySchema.private;

          selection[propertyName] = isSelected && isAllowed;

          return selection;
        },
        {}
      );

      // TODO: optimize this
      const values = Object.values(storeData) as Array<DocumentType>;
      const documents = sort ? values.sort(sort) : values;

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        // TODO: we can handle deepCloning more efficiently for perf, especially since we know the schema
        // const document = storeData[_id] as DocumentType;
        const isMatchingDocument = !where || where(document);

        if (isMatchingDocument) {
          const result = selectPropertiesFromDocument(
            storeSchema,
            selectedProperties,
            schemaPropertyKeys,
            document
          ) as DocumentType;

          data.push(result);

          // TODO: handle select, includePrivate, and expandRefs

          if (limit && data.length === limit) {
            break;
          }
        }
      }

      return { data, err: null };
    };

    const expandRefs = (document: DocumentType, documentSchema) => { };

    const insert: CollectionInsert<DocumentType> = (document) => {
      // TODO: validate it matches schema, set default values, and smart deep clone based on schema
      const newId = `${collectionName as string
        }.${++storeInfo.lastId}` as string;

      const newDocument = Object.keys(collectionShape).reduce(
        (doc, propertyName) => {
          let propertyValue;

          if (propertyName === "id") {
            propertyValue = newId;
          } else if (propertyName === "date_created") {
            propertyValue = Date.now();
          } else {
            const propertySchema = collectionShape[propertyName];
            const value = document[propertyName];

            // TODO: add some runtime validation, even though we have typescript

            const { def, required } = propertySchema;
            propertyValue = typeof value === "undefined" ? def : value;

            if (required && typeof propertyValue === "undefined") {
              throw new Error(
                `Property ${propertyName} is required for ${collectionName as string
                } documents`
              );
            }
          }

          doc[propertyName] = propertyValue;

          return doc;
        },
        {} as DocumentType
      );

      storeData[newId] = deepCloneDocument(newDocument);

      this.changed = true;

      return deepCloneDocument(newDocument);
    };

    const update: CollectionUpdate<DocumentType> = (
      id: string,
      // TODO: this should also take a function that gets the current document and returns the new document
      // so end users don't have to query->modify->update manually
      props: DocumentType & {}
    ) => {

      // console.log('gdb: props to update: ', props)
      // const { id, ...props } = props as DocumentType

      if (!id) {
        throw new Error(
          `You must provide an id to update a ${collectionName as string}`
        );
      }

      const document = storeData[id];

      if (!document) {
        if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
          console.error('tried to update a document that does not exist with id: ', id)
        }
        return null;
      }

      // const store = this._data.stores[collectionName];
      const storeInfo = this._data.info.collections[collectionName];
      // console.log('gdb: storeInfo: ', storeInfo, collectionShape)
      const updatedProps = Object.keys(collectionShape).reduce(
        (doc, propertyName) => {
          let propertyValue;
          if (props.hasOwnProperty(propertyName)) {
            // TODO: give these a special 'internal' schema property
            const propertySchema = collectionShape[propertyName];
            if (!propertySchema.internal) {
              const value = props[propertyName];
              const { def, required } = propertySchema;
              // TODO: do some validation even though we have typescript types
              doc[propertyName] = deepClonePropertyFromPropertySchema(
                propertySchema,
                value
              );
            }
          }

          return doc;
        },
        {}
      );



      const updatedDocument = {
        ...document,
        ...updatedProps,
        date_updated: Date.now(),
      };

      storeData[id] = updatedDocument;

      this.changed = true;

      return deepCloneDocument(updatedDocument);
    };

    const remove: CollectionRemove<DocumentType> = (id) => {
      const document = storeData[id];

      if (document) {
        delete storeData[id];
        this.changed = true;
        return true;
      } else {
        return false;
      }
    };

    return {
      query,
      queryById,
      insert,
      update,
      remove,
    };
  };

  // KeyValue methods
  // TODO: consider schema-constrained vs. unconstrained keyValue stores
  public keyValue = (collectionName: string) => {
    const store = this._data.stores[collectionName];
    const storeSchema = this._data.schema.stores[collectionName] || {};
    if (storeSchema.type !== "keyvalue") {
      throw new Error(
        `The ${collectionName} store is not a keyValue store, it's a ${storeSchema.type}`
      );
    }

    // TODO: we should attach the schema or make it easier to access from returned methods

    return this.keyValueMethods;
  };

  private keyValueGet = ({
    where,
    sort,
    select,
    expandRefs,
    includePrivate,
  }) => { };

  private keyValueSet = (props) => { };

  private keyValueUpdate = (propsWithId) => { };

  private keyValueDelete = (whereOrId) => { };

  private keyValueMethods = {
    get: this.keyValueGet,
    set: this.keyValueSet,
    update: this.keyValueUpdate,
    delete: this.keyValueDelete,
  };

  //////// Core utils

  // get items from a collection
  //   public query = (
  //     collectionName: string,
  //     { where, sort, select }: QueryOpts = {}
  //   ): DBResult | DBError => {
  //     const collection = this._data.collections[collectionName];

  //     if (!collection) {
  //       return {
  //         err: "collection does not exist",
  //         result: null,
  //       };
  //     }

  //     const clonedCollection = deepClone(collection);
  //     const schema = this._data.schema[collectionName];

  //     let result = Object.values(clonedCollection);
  //     // Note: this doesn't expand refs
  //     if (where) {
  //       result = result.filter(where);
  //     }

  //     if (sort) {
  //       result = result.sort(sort);
  //     }

  //     if (select) {
  //       result = result.map((item) => {
  //         let selectedItem = {};
  //         for (const prop of select) {
  //           selectedItem[prop] = item[prop];
  //         }
  //         return selectedItem;
  //       });
  //     }

  //     return { result, err: null };
  //   };

  //   public getById = (id: string) => {
  //     const [collectionName, itemId] = id.split(".");
  //     const item = this._data.collections[collectionName][id];
  //     return item ? deepClone(item) : null;
  //   };

  //   public removeById = (id: string) => {
  //     const [collectionName] = id.split(".");
  //     const collection = this._data.collections[collectionName];
  //     const item = collection[id];

  //     if (item) {
  //       delete collection[id];
  //     }

  //     this.changed = true;

  //     return true;
  //   };

  // add an item to a collection
  //   public insert = (collectionName: string, item: any) => {
  //     item = deepClone(item);
  //     // TODO: validate it matches schema
  //     const collection = this._data.collections[collectionName];

  //     if (!collection) {
  //       console.error(`no collection named: ${collectionName}`);
  //       return;
  //     }

  //     const schema = this._data.schema[collectionName];
  //     const info = this._data.info.collections[collectionName];

  //     // increment both at the same time and cast to string
  //     // TODO: if a collection can be nested the id should actually be the dot path
  //     // to the collection, else if all collections are in data.collections then nested collections
  //     // can just be refs
  //     // NOTE: an item's id references its collection so that we can infer the collection/type from the item itself
  //     // after it's been passed through the app
  //     const id = `${collectionName}.${++info.lastId}`;
  //     const newItem = deepClone(item);
  //     newItem.id = id;
  //     // TODO: they should all have date_created in the schema and it should be a protected key
  //     // TODO: date_created should be timezone-proof
  //     newItem.date_created = Date.now();
  //     collection[id] = newItem;

  //     this.changed = true;

  //     return deepClone(newItem);
  //   };

  // removes an item from a collection
  //   public remove = (collectionName: string, id: string) => {
  //     const collection = this._data.collections[collectionName];
  //     const item = collection[id];

  //     if (item) {
  //       delete collection[id];
  //     }

  //     this.changed = true;

  //     return true;
  //   };

  // sets a property on an item
  //   public set = (collectionName: string, id: string, prop: string, val: any) => {
  //     // TODO: validate prop and value against schema

  //     if (typeof val === "object") {
  //       val = deepClone(val);
  //     }

  //     const collection = this._data.collections[collectionName];
  //     const item = collection[id];

  //     item[prop] = val;
  //     this.changed = true;

  //     return deepClone(item);
  //   };

  //   public update = (collectionName: string, id: string, props: {}) => {
  //     // TODO: validate prop and value against schema
  //     props = deepClone(props);
  //     const collection = this._data.collections[collectionName];

  //     collection[id] = {
  //       ...collection[id],
  //       ...props,
  //     };
  //     this.changed = true;

  //     const item = collection[id];

  //     return deepClone(item);
  //   };

  //   public upsert = (collectionName: string, item: { id?: string }) => {
  //     const { id, ...props } = item;

  //     if (typeof id === "string") {
  //       return this.update(collectionName, id, props);
  //     } else {
  //       return this.insert(collectionName, props);
  //     }
  //   };

  public close() {
    clearInterval(this.saveInterval);
    if (this.engine === 'indexeddb') {
      void this.trySaveAsync();
    } else {
      this.trySave();
    }
  }

  public async closeAsync() {
    clearInterval(this.saveInterval);
    await this.trySaveAsync();
  }

  // make this available on both the Class and instances
  static readonly v1 = v1;
  public get v1() {
    return Base.v1;
  }

  // Encryption helper methods
  private deriveKey(passphrase: string): Buffer {
    return this.pbkdf2Sync(passphrase, 'goldfish-salt', 100000, 32);
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not set');
    
    const iv = this.randomBytes(16);
    const cipher = this.createCipher('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encryptedData (all base64)
    return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not set');
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    const decipher = this.createDecipher('aes-256-gcm', this.encryptionKey, iv, authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private getIndexedDbFactory(): any {
    const factory = (globalThis as any).indexedDB;
    if (!factory) {
      throw new Error("indexedDB is not available in this environment");
    }
    return factory;
  }

  private async openIndexedDb(): Promise<any> {
    if (this.indexedDbPromise) {
      return this.indexedDbPromise;
    }

    this.indexedDbPromise = new Promise((resolve, reject) => {
      const request = this.getIndexedDbFactory().open(this.db_name, 1);

      request.onerror = () => {
        reject(request.error || new Error(`Failed to open IndexedDB database ${this.db_name}`));
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.indexedDbStoreName)) {
          db.createObjectStore(this.indexedDbStoreName);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });

    return this.indexedDbPromise;
  }

  private async readIndexedDbRecord(): Promise<string | null> {
    const db = await this.openIndexedDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(this.indexedDbStoreName, "readonly");
      const store = tx.objectStore(this.indexedDbStoreName);
      const request = store.get(this.indexedDbRecordKey);

      request.onerror = () => reject(request.error || new Error("Failed to read IndexedDB record"));
      request.onsuccess = () => {
        const result = request.result;
        if (typeof result === "string") {
          resolve(result);
        } else if (result && typeof result.data === "string") {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }

  private async writeIndexedDbRecord(dataStr: string): Promise<void> {
    const db = await this.openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.indexedDbStoreName, "readwrite");
      const store = tx.objectStore(this.indexedDbStoreName);
      const request = store.put(dataStr, this.indexedDbRecordKey);

      request.onerror = () => reject(request.error || new Error("Failed to write IndexedDB record"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to commit IndexedDB transaction"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  // Create these for the specific runtime (node, bun, browser, s3, cloudflare, etc.)

  // recursively create the directory {recursive: true}
  abstract mkdirSync(path: string): void;
  // should read in utf-8 {encoding: 'utf8'}
  abstract readFileSync(path: string): string;
  abstract writeFileSync(path: string, dataStr: string): void;
  // atomic write using temp file + rename
  abstract writeFileSyncAtomic(path: string, dataStr: string): void;
  // atomic rename operation
  abstract renameSync(oldPath: string, newPath: string): void;
  // check if file exists
  abstract existsSync(path: string): boolean;
  // delete file
  abstract unlinkSync(path: string): void;
  
  // crypto methods for encryption
  abstract pbkdf2Sync(password: string, salt: string, iterations: number, keylen: number): Buffer;
  abstract randomBytes(size: number): Buffer;
  abstract createCipher(algorithm: string, key: Buffer, iv: Buffer): any;
  abstract createDecipher(algorithm: string, key: Buffer, iv: Buffer, authTag: Buffer): any;
}

// TODO: consider moving to another type file since type.ts currently has circular dependency
export type SchemaToMigrationsType<
  S1 extends SchemaDefinition<S1["stores"]>,
  S2 extends SchemaDefinition<S2["stores"]>
// TODO: the migration code should make a copy of the database/store
// so that for the whole duration of the migration up or down Base.currentSchema
// remains constant. no swap-in-place, and likely also a duplicate file to make the
// whole migration atomic and easy to rollback
//   DBInstance extends Base<any>
> = [
    {
      [K in keyof SchemaToDocumentTypes<S1>]?: MigrationFn<
        SchemaToDocumentTypes<S1>[K],
        SchemaToDocumentTypes<S2>[K],
        Base<S1>
      >;

    }
  ];
