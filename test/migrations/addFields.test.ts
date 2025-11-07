import DB from "../../src/node/index";
import { v1 } from "../../src/core/schemaUtils";
import { deepClone } from "../../src/core/utils";

const { collection, string, number, defaultOpts, schema } = v1.schemaType

beforeAll(() => {

})


describe("add new field", () => {
    it("should update persisted schema when no migrations are specified", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1.0, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db1._data).toEqual({
            stores: {
                collection: {
                    buns: {},
                    tokens: {},
                }
            },
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 0
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [],
            log: [1.0],
        })



        // db1.collection('bund').insert({ name: 'bun1', path: 'path1' })

        dbData = db1._data;

        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })



        expect(db1._data).toEqual({
            stores: {
                collection: {
                    buns: { "buns.1": { name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1' } },
                    tokens: {},
                }
            },
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 1
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [],
            log: [1.0],
        })



        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });


        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: { "buns.1": { name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1' } },
                    tokens: {},
                }
            },
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 1
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1.0, 2],
        })

        db1.close();
        db2.close();

    });

    it("should apply the migration to documents", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db1._data).toEqual({
            stores: {
                collection: {
                    buns: {},
                    tokens: {},
                }
            },
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 0
                    },
                    tokens: {
                        lastId: 0
                    }
                },
                // goldfishVersion: 1
            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [],
            log: [1.0],
        })

        dbData = db1._data;

        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = 'newField';
            }
        }]

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            newField: 'newField'
                        }
                    },
                    tokens: {},
                }
            },
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 1
                    },
                    tokens: {
                        lastId: 0
                    }
                },

            },
            dataVersion: 2,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1.0, 2],
        })

        db1.close();
        db2.close();
    });

    it("should apply 2 migrations to documents and save backups for both", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        const schema3 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: number(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const migrationsTo3 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = parseInt(doc.newField, 10);
            }
        }]


        const db3 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
                { v: 3, schema: schema3, migrationSteps: migrationsTo3 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db3._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            newField: 0
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            newField: 1
                        }
                    },
                    tokens: {},
                }
            },
            schema: schema3,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },

            },
            dataVersion: 3,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db3._data.backups[0].date,
                snapshot: db1Snapshot
            }, {
                dataVersion: 2,
                date: db3._data.backups[1].date,
                snapshot: db2Snapshot
            }],
            log: [1.0, 2, 3],
        })

        db1.close();
        db2.close();
        db3.close();

    });

    it("should not apply old migrations to documents if dataVersion is higher. should skip 1->2, schema should not change", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                // fake version 3
                { v: 2, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": { name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1' },
                        "buns.2": { name: 'bun2', path: 'path2', date_created: insertedBun2.date_created, date_updated: insertedBun2.date_updated, id: 'buns.2' }
                    },
                    tokens: {},
                }
            },
            // because we were already at version 2 we ignore changing the schema
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            // no backups should have been created because dataVersion was already 2
            backups: [],
            log: [2],
        })
        db1.close();
        db2.close();

    });

    it("should not apply old migrations to documents if dataVersion is higher. should skip 1->2 but apply 2->3", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                // fake version 3
                { v: 2, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": { name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1' },
                        "buns.2": { name: 'bun2', path: 'path2', date_created: insertedBun2.date_created, date_updated: insertedBun2.date_updated, id: 'buns.2' }
                    },
                    tokens: {},
                }
            },
            // because we were already at version 2 we ignore changing the schema
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            // no backups should have been created because dataVersion was already 2
            backups: [],
            log: [2],
        })

        const schema3 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: number(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const migrationsTo3 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = parseInt(doc.newField, 10) || 5;
            }
        }]


        const db3 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
                { v: 3, schema: schema3, migrationSteps: migrationsTo3 },
            ],
            engine: 'none',
            initialData: dbData,
        });


        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            // newField should default to 5 for both, because the v2 migration was skipped
                            newField: 5
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            // newField should default to 5 for both, because the v2 migration was skipped
                            newField: 5
                        }
                    },
                    tokens: {},
                }
            },
            schema: schema3,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },

            },
            dataVersion: 3,
            goldfishVersion: 1,
            // only one migration should be run
            backups: [{
                dataVersion: 2,
                date: db3._data.backups[0].date,
                snapshot: db2Snapshot
            }],
            log: [2, 3],
        })

        db1.close();
        db2.close();
        db3.close();
    });

    it("should apply multi-step migrations to documents", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                // fake version 3
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        },
        {
            buns: (doc, db, targetSchema) => {
                doc.newField = doc.newField + "hello"
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            newField: '0hello'
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            newField: '1hello'
                        }
                    },
                    tokens: {},
                }
            },
            // because we were already at version 2 we ignore changing the schema
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            // no backups should have been created because dataVersion was already 2
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1, 2],
        })

        db1.close();
        db2.close();


    });

    it("should delete backups that are 1 week old, but only after the new migration", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        dbData.backups[0].date = new Date(Date.now() - (1000 * 60 * 60 * 24 * 7 * 2) - 1)

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        const schema3 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: number(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        expect(db2._data.backups).toEqual([{
            dataVersion: 1,
            date: dbData.backups[0].date,
            snapshot: db1Snapshot
        }])

        const migrationsTo3 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = parseInt(doc.newField, 10);
            }
        }]


        const db3 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
                { v: 3, schema: schema3, migrationSteps: migrationsTo3 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            newField: 0
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            newField: 1
                        }
                    },
                    tokens: {},
                }
            },
            schema: schema3,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },

            },
            dataVersion: 3,
            goldfishVersion: 1,
            backups: [{
                // only the second backup should be kept
                dataVersion: 2,
                date: db3._data.backups[0].date,
                snapshot: db2Snapshot
            },],
            log: [1.0, 2, 3],
        })
        db1.close();
        db2.close();
        db3.close();
    });

    it("should run migrations for all stores", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                // fake version 3
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })
        const insertedToken = db1.collection('tokens').insert({ name: 'token1', endpoint: 'path3', token: '2398u989fh98ahsf8' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            },
            tokens: (doc) => {
                doc.url = "https://blah.sh/" + doc.endpoint
            }
        },
        {
            buns: (doc, db, targetSchema) => {
                doc.newField = doc.newField + "hello"
            },
            tokens: (doc) => {
                doc.url = doc.url + '/'
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            newField: '0hello'
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            newField: '1hello'
                        }
                    },
                    tokens: {
                        "tokens.1": {
                            name: 'token1',
                            endpoint: 'path3',
                            date_created: insertedToken.date_created,
                            date_updated: insertedToken.date_updated,
                            id: 'tokens.1',
                            url: 'https://blah.sh/path3/',
                            token: '2398u989fh98ahsf8'
                        }
                    }
                },
            },
            // because we were already at version 2 we ignore changing the schema
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 1
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            // no backups should have been created because dataVersion was already 2
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1, 2],
        })
        db1.close();
        db2.close();


    });

    it("should be able to use collection methods and delete the current document", () => {

        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1.0, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db1._data).toEqual({
            stores: {
                collection: {
                    buns: {},
                    tokens: {},
                }
            },
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 0
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [],
            log: [1.0],
        })



        // db1.collection('bund').insert({ name: 'bun1', path: 'path1' })

        dbData = db1._data;

        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })


        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });


        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                if (testIndex === 0) {
                    db.collection('buns').remove(doc.id)
                    testIndex++
                } else {
                    doc.newField = String(testIndex++);
                }
            }
        }]

        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        // buns.1 should be deleted
                        // "buns.1": {
                        //     name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1',
                        //     newField: '0'
                        // },
                        "buns.2": {
                            name: 'bun2', path: 'path2', date_created: insertedBun2.date_created, date_updated: insertedBun2.date_updated, id: 'buns.2',
                            newField: '1'
                        }
                    },
                    tokens: {},
                }
            },
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1.0, 2],
        })
        db1.close();
        db2.close();

    });

    it("should be able to use collection methods and delete the next document", () => {

        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1.0, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db1._data).toEqual({
            stores: {
                collection: {
                    buns: {},
                    tokens: {},
                }
            },
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 0
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [],
            log: [1.0],
        })

        dbData = db1._data;

        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })


        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });


        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let idToDelete;
        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                if (testIndex === 0) {
                    idToDelete = doc.id === 'buns.1' ? 'buns.2' : 'buns.1';
                    db.collection('buns').remove(idToDelete)
                    doc.newField = String(testIndex++);
                    const preMigrationBackup = db._data.backups[0];
                } else {
                    throw new Error('should not be called')
                }
            }
        }]

        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        ...(idToDelete === 'buns.1' ?

                            {
                                "buns.2": {
                                    name: 'bun2', path: 'path2', date_created: insertedBun2.date_created, date_updated: insertedBun2.date_updated, id: 'buns.2',
                                    newField: '0'
                                }
                            } : {
                                "buns.1": {
                                    name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1',
                                    newField: '0'
                                }
                            }),
                    },
                    tokens: {},
                }
            },
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1.0, 2],
        })
        db1.close();
        db2.close();

    });

    it("should roll back to a previous version if a backup exists", () => {
        let dbData;

        const schema1 = schema({
            v: 1,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                })
            },
        });

        const db1 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });



        dbData = db1._data;
        const insertedBun = db1.collection('buns').insert({ name: 'bun1', path: 'path1' })
        const insertedBun2 = db1.collection('buns').insert({ name: 'bun2', path: 'path2' })

        const schema2 = schema({
            v: 2,
            stores: {                
                buns: collection({
                    name: string(defaultOpts),                    
                    path: string(defaultOpts),
                    newField: string(defaultOpts)
                }),
                tokens: collection({
                    name: string({ ...defaultOpts, required: true }), 
                    url: string(defaultOpts), 
                    endpoint: string({ ...defaultOpts, required: true }), 
                    token: string({ ...defaultOpts, required: true }),
                }),
            },
        });

        const db1Snapshot = deepClone({
            stores: db1._data.stores,
            info: db1._data.info,
            schema: db1._data.schema,
        })

        let testIndex = 0;
        const migrationsTo2 = [{
            buns: (doc, db, targetSchema) => {
                doc.newField = String(testIndex++);
            }
        }]


        const db2 = new DB().init({
            schemaHistory: [
                { v: 1, schema: schema1, migrationSteps: false },
                { v: 2, schema: schema2, migrationSteps: migrationsTo2 },
            ],
            engine: 'none',
            initialData: dbData,
        });

        const db2Snapshot = deepClone({
            stores: db2._data.stores,
            info: db2._data.info,
            schema: db2._data.schema,
        })

        expect(db2._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1', path: 'path1', date_created: insertedBun.date_created, date_updated: insertedBun.date_updated, id: 'buns.1',
                            newField: '0'
                        },
                        "buns.2": {
                            name: 'bun2', path: 'path2', date_created: insertedBun2.date_created, date_updated: insertedBun2.date_updated, id: 'buns.2',
                            newField: '1'
                        }
                    },
                    tokens: {},
                }
            },
            // because we were already at version 2 we ignore changing the schema
            schema: schema2,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },
            },
            dataVersion: 2,
            goldfishVersion: 1,
            // no backups should have been created because dataVersion was already 2
            backups: [{
                dataVersion: 1,
                date: db2._data.backups[0].date,
                snapshot: db1Snapshot
            }],
            log: [1, 2],
        })

        const db1RolledBack = new DB().init({
            schemaHistory: [
                // rolled back to v1
                { v: 1, schema: schema1, migrationSteps: false },
            ],
            engine: 'none',
            initialData: dbData,
        });

        expect(db1RolledBack._data).toEqual({
            stores: {
                collection: {
                    buns: {
                        "buns.1": {
                            name: 'bun1',
                            path: 'path1',
                            date_created: insertedBun.date_created,
                            date_updated: insertedBun.date_updated,
                            id: 'buns.1',
                            // rolled back
                            // newField: '0'                         
                        },
                        "buns.2": {
                            name: 'bun2',
                            path: 'path2',
                            date_created: insertedBun2.date_created,
                            date_updated: insertedBun2.date_updated,
                            id: 'buns.2',
                            // newField: '1'                         
                        }
                    },
                    tokens: {},
                }
            },
            // rolled back
            schema: schema1,
            info: {
                collections: {
                    buns: {
                        lastId: 2
                    },
                    tokens: {
                        lastId: 0
                    }
                },

            },
            dataVersion: 1,
            goldfishVersion: 1,
            backups: [{
                dataVersion: 1,
                date: db1RolledBack._data.backups[0].date,
                snapshot: db1Snapshot
            }, {
                dataVersion: 2,
                date: db1RolledBack._data.backups[1].date,
                snapshot: db2Snapshot
            }],
            // 1, up to 2, then rolled back down to 1
            log: [1.0, 2, 1],
        })

        db1.close();
        db2.close();
        db1RolledBack.close();


    });
});