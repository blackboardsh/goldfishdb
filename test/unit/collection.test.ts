import DB from "../../src/node/index";
import { v1 } from "../../src/core/schemaUtils";
import { deepClone } from "../../src/core/utils";

const { collection, string, number, defaultOpts, schema } = v1.schemaType

describe("collection methods", () => {
    let dbData;

    const schema1 = schema({
        v: 1,
        stores: {
            // projects
            buns: collection({
                name: string(defaultOpts),
                // absolute root path to custom directory for this bun
                path: string(defaultOpts),
            }),
            tokens: collection({
                name: string({ ...defaultOpts, required: true }), // blackboard
                url: string(defaultOpts), // https://blackboard.sh (matched against the egg url)
                endpoint: string({ ...defaultOpts, required: true }), // https://api.blackboard.sh
                token: string({ ...defaultOpts, required: true }),
            })
        },
    });

    const db = new DB<typeof schema1>().init({
        schemaHistory: [
            { v: 1, schema: schema1, migrationSteps: false },
        ],
        engine: 'none',
        initialData: dbData,
    });

    afterAll(() => {
        db.close();
    })

    describe('insert', () => {
        it("should insert a document", () => {
            const insertedDocument = db.collection('buns').insert({
                name: 'test1',
            })

            expect(db._data.stores.collection.buns['buns.1']).toEqual(insertedDocument)
            expect(insertedDocument).toEqual({
                id: 'buns.1',
                name: 'test1',
                date_created: expect.any(Number),
                date_updated: undefined,
            })
        });

        it("should insert a document with all required properties defined", () => {
            const insertedDocument = db.collection('tokens').insert({
                name: 'test1',
                endpoint: 'test234',
                token: '2903498fasjdf98sjf'
            })

            expect(db._data.stores.collection.tokens['tokens.1']).toEqual(insertedDocument)
            expect(insertedDocument).toEqual({
                id: 'tokens.1',
                name: 'test1',
                endpoint: 'test234',
                token: '2903498fasjdf98sjf',
                date_created: expect.any(Number),
                date_updated: undefined,
            })
        });

        it("should throw if inserting a document without all the required properties", () => {
            // @ts-expect-error
            expect(() => db.collection('tokens').insert({
                // name: 'test1',
                endpoint: 'test234',
                token: '2903498fasjdf98sjf'
            })).toThrowError('Property name is required for tokens documents')

            // @ts-expect-error
            expect(() => db.collection('tokens').insert({
                name: 'test1',
                // endpoint: 'test234',
                token: '2903498fasjdf98sjf'
            })).toThrowError('Property endpoint is required for tokens documents')
        });
    });

    describe('update', () => {

        it("should update a document that exists", () => {
            const newValue = String(Math.random());
            const oldDoc = deepClone(db._data.stores.collection.buns['buns.1']);
            const updatedDoc = db.collection('buns').update('buns.1', { name: newValue });

            expect(oldDoc.date_updated).not.toEqual(updatedDoc.date_updated)
            expect(oldDoc.name).not.toEqual(newValue)
            expect(updatedDoc.name).toEqual(newValue)

        });

        it("should update the date_updaed when updating a document that exists with no new props", () => {
            const oldDoc = deepClone(db._data.stores.collection.buns['buns.1']);
            const updatedDoc = db.collection('buns').update('buns.1', {});

            oldDoc.date_updated = updatedDoc.date_updated;

            expect(updatedDoc).toEqual(oldDoc);
            expect(updatedDoc).toEqual(db._data.stores.collection.buns['buns.1']);
        });

        it("should return null when updating a doc that does not exist", () => {
            const newValue = String(Math.random());

            const updatedDoc = db.collection('buns').update('buns.234234', { name: newValue });
            expect(updatedDoc).toBeNull();
        });

    })

    describe('query', () => {
        let insertedQueryItem1;
        let insertedQueryItem2;

        beforeAll(() => {
            insertedQueryItem1 = db.collection('buns').insert({ name: 'query1name' })
            insertedQueryItem2 = db.collection('buns').insert({ name: 'query2name' })
        })

        it("should query all documents", () => {
            const queryResults = db.collection('buns').query();
            expect(queryResults.data).toEqual(Object.values(db._data.stores.collection.buns));
        });

        it("should query a document by a match function", () => {
            const queryResults = db.collection('buns').query({ where: doc => doc.id === 'buns.1' });
            expect(queryResults.data).toEqual([db._data.stores.collection.buns['buns.1']]);
        });

        it("should return an empty array if querying no matches", () => {
            const queryResults = db.collection('buns').query({ where: doc => doc.id === 'buns.19j9f8jsd9f8jasd98fj' });
            expect(queryResults.data).toEqual([]);
        });

        it("should sort results", () => {
            const queryResults = db.collection('buns').query({
                where: doc => Boolean(doc.name?.match(/query\dname/)),
                sort: (a, b) => a.id > b.id ? 1 : -1,
            });

            expect(queryResults.data[0]).toEqual(insertedQueryItem1);
            expect(queryResults.data[1]).toEqual(insertedQueryItem2);

            const queryResultsReversed = db.collection('buns').query({
                where: doc => Boolean(doc.name?.match(/query\dname/)),
                sort: (a, b) => a.id < b.id ? 1 : -1,
            });

            expect(queryResultsReversed.data[0]).toEqual(insertedQueryItem2);
            expect(queryResultsReversed.data[1]).toEqual(insertedQueryItem1);
        });

        it("should limit results", () => {
            const queryResults = db.collection('buns').query({
                where: doc => Boolean(doc.name?.match(/query\dname/)),
                sort: (a, b) => a.id > b.id ? 1 : -1,
                limit: 1,
            });

            expect(queryResults.data[0]).toEqual(insertedQueryItem1);
            expect(queryResults.data.length).toEqual(1);

            const queryResultsReversed = db.collection('buns').query({
                where: doc => Boolean(doc.name?.match(/query\dname/)),
                sort: (a, b) => a.id < b.id ? 1 : -1,
                limit: 1
            });

            expect(queryResultsReversed.data[0]).toEqual(insertedQueryItem2);
            expect(queryResults.data.length).toEqual(1);
        });

        it("should select properties when querying", () => {
            const queryResults = db.collection('buns').query({
                where: doc => Boolean(doc.name?.match(/query\dname/)),
                select: ['name', 'id']
            });
            expect(queryResults.data).toEqual([{ name: 'query1name', id: 'buns.2' }, { name: 'query2name', id: 'buns.3' }]);
        });

    });

    describe('it should queryById', () => {
        it("should query a document by id", () => {
            const queryResults = db.collection('buns').queryById('buns.1');
            expect(queryResults.data).toEqual(db._data.stores.collection.buns['buns.1']);
        });

        it("should return null if document with id does not exist", () => {
            const queryResults = db.collection('buns').queryById('buns.102j98jas9d8fja0sd89fj');
            expect(queryResults.data).toEqual(null);
        });

        it("should select properties when querying by id", () => {
            const queryResults = db.collection('buns').queryById('buns.2', {
                select: ['name', 'id']
            });
            expect(queryResults.data).toEqual({ name: 'query1name', id: 'buns.2' });
        });
    })

    describe('it should queryById', () => {
        it("should remove a document by id", () => {
            const itemToBeRemoved = db._data.stores.collection.buns['buns.1'];
            const removedItem = db.collection('buns').remove('buns.1');

            expect(db._data.stores.collection.buns['buns.1']).toBeUndefined();
            expect(removedItem).toEqual(true);
        });

        it("should return false if document with id did not exist", () => {
            const id = 'buns.102j98jas9d8fja0sd89fj';
            const itemToBeRemoved = db._data.stores.collection.buns[id];
            const removedItem = db.collection('buns').remove(id);

            expect(db._data.stores.collection.buns[id]).toBeUndefined();
            expect(itemToBeRemoved).toBeUndefined();
            expect(removedItem).toEqual(false);
        });
    });







});