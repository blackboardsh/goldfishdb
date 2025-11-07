import DB from "../src/node";
import { SchemaToMigrationsType } from "../src/core/abstractClass";

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
    defaultOpts,
} = DB.v1.schemaType;
import { SchemaToDocumentTypes } from "../src/core/types";
import { expectType, expectNotType, expectNotAssignable } from 'tsd'


type XType = {test: 'hi'};
const x:XType  = {test: 'hi'}

expectType<'hi'>(x)
expectType<(XType)>(x)
expectNotType<number>(x)



const schema1 = schema({
    // version of your schema, for user defined versioned migrations of user data
    v: 1,
    // TODO: a collection can be anywhere in the data structure but it can't be nested
    // eg: config.thing.somecollection: collection({})
    stores: {
        // test: "broken",
        user: collection({
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
            // Note: Keys are implied to be strings, likely ids
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
                const { data } = db.collection("user").query();
                console.log(data[0].username, data[0].skills);
                console.log(user.username, user.skills, user.tabs);

                expectType<{
                    username: string;
                    email: string;
                    pass?: string;
                    loginCount?: number;
                    // todo (yoav): NOTE: this check is worthless the required keys aren't validated
                    // at all, see nasme instead of path
                    skills?: Array<{ nasme?: string, ability?: string, rating?: number }>;
                    betaFlags?: string[];
                    // todo (yoav): NOTE: this check is worthless the required keys aren't validated
                    // at all, see psath instead of path
                    tabs: { [key: string]: { id: string, path: string, isPreview: boolean, paneId: string } };
                }>(user)
                

                expectType<undefined | Array<{name?: string, ability?: string, rating?: number}>>(user.skills)
                console.log(user.skills.map, user.skills?.map);

                const v2skills = user.skills?.map((skill) => {
                    const { name, ability, rating } = skill;

                    const experience = (rating || 1) * 10;

                    return {
                        name: name || "test",
                        ability,
                        rating,
                        experience,
                    };
                });

                const v2User = {
                    ...user,
                    settings: {
                        showTime: false,
                        canScroll: false,
                        favFollow: "hi",
                        numToShow: 5,
                    },
                    skills: v2skills,
                };

                expectType<{
                    username: string;
                    email: string;
                    pass?: string;
                    loginCount?: number;
                    // todo (yoav): typescript is not catching error where a skill name is left out 
                    // we probably need to build in custom type checking automation tests                    
                    skills?: Array<{name: string, ability?: string, rating?: number, experience?: number}>
                    betaFlags?: string[];
                    settings: {
                        showTime: boolean;
                        canScroll: boolean;
                        favFollow: string;
                        numToShow: number;
                    };                    
                }>(v2User)

                expectType<undefined | Array<{name: string, ability?: string, rating?: number, experience?: number}>>(v2User.skills)

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
                        experience: number(defaultOpts),
                    },
                    defaultOpts
                ),
                defaultOpts
            ),
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
        }),
        // config: keyValue({
        //   api_key_service1: string(defaultOpts),
        //   // api_key_service2: string(),
        // }),
        // needed for migrating top-level properties
    },
});


const db = new DB<typeof schema2>().init({
    schemaHistory: [
        { v: 1, schema: schema1, migrationSteps: false },
        { v: 2, schema: schema2, migrationSteps: migrationsFor2 },
    ],
});

export default db;

// TODO: maybe a custom utility type that just takes db
export type CurrentDocumentTypes = SchemaToDocumentTypes<
    typeof db._data.schema
>;



