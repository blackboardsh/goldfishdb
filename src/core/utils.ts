import { CollectionStore, CollectionStoreSchema, SchemaPropertyType, SchemaShapeToDocumentType, StoreSchemaToDocumentType } from "./types";

export function deepClone(source: Object) {
  try {
    return JSON.parse(JSON.stringify(source));
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.stack);
    }
    console.log("source: ", source);
    throw "failed to parse on deep clone";
  }
}

export const deepClonePropertyFromPropertySchema = (
  propertySchema: SchemaPropertyType,
  propertyValue: SchemaShapeToDocumentType<SchemaPropertyType>
) => {
  if (typeof propertyValue === "undefined") {
    return;
  }

  switch (propertySchema.type) {
    case "string":
    case "number":
    case "boolean":
    // case "ref": {
    //   return propertyValue;
    //   break;
    // }
    case "tree":
    case "array":
    case "object": {
      return deepClone(propertyValue);
    }
  }
};

export const deepCloneDocumentFromDocumentSchema = <Document>(storeSchema: CollectionStoreSchema) => {
  const schemaPropertyKeys = Object.keys(storeSchema);

  return (document: Document): Document => {
    const clonedDocument = schemaPropertyKeys.reduce(
      (resultDoc: Document, propertyName) => {
        const propertySchema = storeSchema[propertyName];
        const value = document[propertyName];
        resultDoc[propertyName] = deepClonePropertyFromPropertySchema(
          propertySchema,
          (value as any)
        );
        return resultDoc;
      },

      {} as Document
    );

    return clonedDocument;
  };
};

export const selectPropertiesFromDocument = (
  storeSchema: CollectionStore,
  selectedPropertyMap,
  schemaPropertyKeys,
  document
) => {
  return schemaPropertyKeys.reduce((resultDoc, propertyName) => {
    const include = selectedPropertyMap[propertyName];

    if (include) {
      const propertySchema = storeSchema.schema[propertyName];
      const value = document[propertyName];

      resultDoc[propertyName] = deepClonePropertyFromPropertySchema(
        propertySchema,

        value
      );

    }
    return resultDoc;
  }, {});
};
