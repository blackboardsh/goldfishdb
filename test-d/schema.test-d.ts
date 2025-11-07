import DB from "../src/node";
import { SchemaToMigrationsType } from "../src/core/abstractClass";

const {
    schema,
    collection,
    // keyValue,
    string,
    ref,
    boolean,
    object,
    array,
    number,
    timestamp,
    defaultOpts,
} = DB.v1.schemaType;
import { SchemaToDocumentTypes } from "../src/core/types";
import { expectType, expectNotType, expectError } from 'tsd'

// VALID - basic schema definition 
schema({
    v: 1,
    stores: {
        user: collection({
            username: string({ ...defaultOpts }),
        }),
    },
})

// todo (yoav): would be nice if this errored, it currently does not
// invalid schema properties
// expectError(schema({
//     v: 1,
//     someKey: 'someValue',
//     stores: {        
//         user: collection({
//             username: string({ ...defaultOpts }),
//         }),
//     },
// }))

// missing schema version
expectError(schema({
    stores: {
        user: collection({
            username: string({ ...defaultOpts }),
        }),
    },
}))

// missing stores
expectError(schema({
    v: 1,
}))



// invalid store name
expectError(schema({
    v: 1,
    stores: {
        someKey: 'someValue',
        user: collection({
            username: string({ ...defaultOpts }),
        }),
    },
}))

// invalid property value
expectError(schema({
    v: 1,
    stores: {
        user: collection({
            someKey: 'someValue',
            username: string({ ...defaultOpts }),
        }),
    },
}))

