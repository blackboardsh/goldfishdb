import { expectType, expectNotType, expectError, expectDocCommentIncludes, expectNotAssignable } from 'tsd'
import DB from "../src/node";
const {
    schema,
    collection,
    record,
    string,
    ref,
    boolean,
    object,
    array,
    number,
    timestamp,
    tree,
    treenodelist,
    treenode,
    defaultOpts,
} = DB.v1.schemaType;

import { SchemaToMigrationsType } from "../src/core/abstractClass";
import { SchemaToDocumentTypes } from "../src/core/types";


const x = 'hi'

expectType<'hi'>(x)
expectNotType<'hi3'>(x)

// todo (yoav): no enforcement of fields being a valid type
const schema1 = schema({
    // version of your schema, for user defined versioned migrations of user data
    v: 1,
    // TODO: a collection can be anywhere in the data structure but it can't be nested
    // eg: config.thing.somecollection: collection({})
    stores: {
        // test: "broken",
        user: collection({
            // test: 'hi',
            // test: 'broken',
            username: string({ ...defaultOpts, required: true }),
            // date_created: timestamp(),
            email: string({ ...defaultOpts, required: true }),
            pass: string(defaultOpts),
            loginCount: number(defaultOpts),
            skills: array(
                object(
                    {
                        name: string(defaultOpts),
                        ability: string(defaultOpts),
                        rating: number(defaultOpts),
                    },
                    defaultOpts
                ),
                defaultOpts
            ),
            tabs: record({                
                id: string({...defaultOpts, required: true}),
                path: string({...defaultOpts, required: true}),
                isPreview: boolean({...defaultOpts, required: true}),
                paneId: string({...defaultOpts, required: true}),
                url: string(defaultOpts)
            }, {...defaultOpts, required: true}),
            // TODO: need an enum type, although maybe we use string + allowed values?
            betaFlags: array(string(defaultOpts), defaultOpts),
            // // This is the first schema definition for the user collection so no migration needed
            fileTree: tree({
                 nodes: {
                    folder: {
                        name: string({...defaultOpts, required: true}),
                        // test: 'hi',
                        // in v1 folder can only have a file, in v2 it can also have a folder
                        // children: ['file'], // works
                        children: ['folder', 'file'], // works
                        // children: ['folder', 'file', 'test'],  // broken test                      
                    },
                    file: {
                        name: string({...defaultOpts, required: true}),
                        content: string({...defaultOpts, required: true}),                        
                    }
                },
                root: ['folder', 'file'], // works
                // root: ['folder', 'file', 'test'], // broken test      
            }
            , defaultOpts),
            
        }),       

        team: collection({
            name: string({ ...defaultOpts, required: true }),
            // user: ref("user", { internal: false, required: true }),
        })
        // config: keyValue({
        //   api_key_service1: string(defaultOpts),
        //   // api_key_service2: string(),
        // }),
    },
});

console.log(schema1.stores.user.schema.fileTree.nodes.folder.children)

type Schema1DocumentTypes = SchemaToDocumentTypes<typeof schema1>;

// todo (yoav): this should be a function that takes (schema1, schema2, migrationSteps)
const migrationsFor2: SchemaToMigrationsType<
    typeof schema1,
    typeof schema2
// NOTE: we pass this in here isntead of in types.ts to avoid circular dependencies
// DB<any>
> = [
        {
            user: (user, db) => {
                console.log(user.fileTree)
                const { data } = db.collection("user").query();

                const v2skills = user.skills?.map((skill) => {
                    const { name, ability, rating } = skill;

                    // INVALID - experience is not defined on schema 1 doc
                    expectError(skill.experience)

                    const experience = (rating || 1) * 10;

                    return {
                        name: name || "test",
                        ability,
                        rating,
                        // VALID - experience is defined on schema 2 doc
                        // note: can comment this out to see the error
                        experience,
                    };
                });

                const v2FileTree = user.fileTree || {
                    name: 'root file', 
                    content: 'root content'
                }

                const v2User = {
                    ...user,
                    settings: {
                        showTime: false,
                        canScroll: false,
                        favFollow: "hi",
                        numToShow: 5,
                    },
                    skills: v2skills,
                    fileTree: v2FileTree

                };

                return v2User;
            }



        },
    ];

const schema2 = schema({
    // version of your schema, for user defined versioned migrations of user data
    v: 2,
    // TODO: a collection can be anywhere in the data structure but it can't be nested
    // eg: config.thing.somecollection: collection({})
    stores: {
        // test: "broken",
        user: collection({
            // test: 'broken',
            username: string({ ...defaultOpts, ...{ required: true } }),
            // test: string(),
            // date_created: timestamp(),
            email: string({ ...defaultOpts, required: true }),
            pass: string(defaultOpts),
            loginCount: number(defaultOpts),
            // test: number(),
            skills: array(
                object(
                    {
                        name: string({ ...defaultOpts, required: true }),
                        ability: string(defaultOpts),
                        rating: number(defaultOpts),
                        experience: number({ ...defaultOpts, required: true }),
                    },
                    defaultOpts
                ),
                defaultOpts
            ),
            tabs: record({
                id: string({...defaultOpts, required: true}),
                path: string({...defaultOpts, required: true}),
                isPreview: boolean({...defaultOpts, required: true}),
                paneId: string({...defaultOpts, required: true}),
                url: string(defaultOpts)
            }, {...defaultOpts, required: true}),
            settings: object(
                {
                    showTime: boolean(defaultOpts),
                    canScroll: boolean(defaultOpts),
                    favFollow: string(defaultOpts),
                    numToShow: number(defaultOpts),
                },
                defaultOpts
            ),
            // TODO: need an enum type, although maybe we use string + allowed values?
            betaFlags: array(string(defaultOpts), defaultOpts),
            // // This is the first schema definition for the user collection so no migration needed
            fileTree: tree({
                nodes: {
                   folder: {
                       name: string({...defaultOpts, required: true}),
                       // test: 'hi',
                       // in v1 folder can only have a file, in v2 it can also have a folder
                    //    children: ['folder', 'file'], // works
                       children: ['folder', 'file'], // works
                    //    children: ['folder', 'file', 'test'],  // broken test                      
                   },
                   file: {
                       name: string({...defaultOpts, required: true}),
                       content: string({...defaultOpts, required: true}),                        
                   }
               },
               root: ['folder', 'file'], // works
            //    root: ['folder', 'file', 'test'], // broken test      
           }
           , {...defaultOpts, required: true}),
        }),
        
        // config: keyValue({
        //   api_key_service1: string(defaultOpts),
        //   // api_key_service2: string(),
        // }),
        // needed for migrating top-level properties
    },
});

type Schema2DocumentTypes = SchemaToDocumentTypes<typeof schema2>;

const db = new DB<typeof schema2>().init({
    schemaHistory: [
        { v: 1, schema: schema1, migrationSteps: false },
        { v: 2, schema: schema2, migrationSteps: migrationsFor2 },
    ],
});


// TODO: maybe a custom utility type that just takes db
export type CurrentDocumentTypes = SchemaToDocumentTypes<
    typeof db._data.schema
>;



// VALID - has all required fields
const insertedUser = db.collection("user").insert({
    username: "yoav",
    email: "test@test.com",
    tabs: {
        'tab.id.1': {
        id: '1',
        path: 'path',
        isPreview: false,
        paneId: '1',
        // url: 'url'
        }
    },
    fileTree: 'thing'
});

// VALID - access internal field
insertedUser.id
insertedUser.date_created
insertedUser.date_updated


// VALID - accessing optional field with conditional
const skill = insertedUser.skills?.[0].name;

// VALID - has all required deeply fields
const insertedUser2 = db.collection("user").insert({
    username: "yoav",
    email: "test@test.com",
    skills: [{
        name: "test",
        ability: "test",
        experience: 1,
    }],
    tabs: {
        'tab.id.1': {
        id: '1',
        path: 'path',
        isPreview: false,
        paneId: '1',
        url: 'url'
        }
    },
   fileTree: 'thing'
});



// VALID - queried documents
const documents = db.collection("user").query().data;

const document = documents[0]
expectType<string>(document.username)
expectType<string>(document.email)
expectType<string | undefined>(document.pass)
expectType<number | undefined>(document.loginCount)
expectType<string | undefined>(document.skills?.[0].name)
expectType<string | undefined>(document.skills?.[0].ability)
expectType<boolean | undefined>(document.settings?.showTime)
expectType<string | undefined>(document.betaFlags?.[0])
expectType<{[key: string]: {id: string, path: string, paneId: string, isPreview: boolean, url?: string}} | undefined>(document.tabs)


// INVALID - accessing invalid collection
expectError(db.collection("usder"))

// INVALID - accessing invalid field
expectError(insertedUser.blah)
// INVALID - access non-existant field
expectError(insertedUser.ids)

// INVALID - accessing deep optional field
// note: expectError doesn't catch these, so just confirm visually they are underlined
insertedUser.skills[0]
insertedUser.skills[0].name

// INVALID - missing required field
expectError(db.collection("user").insert({
    // username: "yoav",
    email: "",
}))
// INVALID - missing required field
expectError(db.collection("user").insert({
    username: "yoav",
    // email: "",
}))

// INVALID - missing required deeply fields
expectError(
    db.collection("user").insert({
        username: "yoav",
        email: "test@test.com",
        skills: [{
            // name: "test",
            ability: "test",
        }]
    }))

// INVALID - missing required deeply fields in keyvalue
expectError(
    db.collection("user").insert({
        username: "yoav",
        email: "test@test.com",
        skills: [{
            name: "test",
            ability: "test",
            rating: 4,
            experience: 4
        }],
        tabs: {
            'tab.id.1': {
            id: '1',
            path: 'path',
            isPreview: false,
            // paneId: '1',
            url: 'url'
            }
        }
    }))





