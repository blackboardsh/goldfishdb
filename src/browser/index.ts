import Base from "../core/abstractClass";
import { SchemaDefinitionWithDefaults } from "../core/types";

function unsupportedBrowserMethod(method: string): never {
  throw new Error(
    `goldfishdb/browser does not support ${method}. Use initAsync({ engine: "indexeddb" }) in browser environments.`,
  );
}

export default class DB<
  CurrentSchema extends SchemaDefinitionWithDefaults
> extends Base<CurrentSchema> {
  constructor() {
    super();
  }

  mkdirSync(_path: string): void {
    unsupportedBrowserMethod("mkdirSync");
  }

  readFileSync(_path: string): string {
    return unsupportedBrowserMethod("readFileSync");
  }

  writeFileSync(_path: string, _dataStr: string): void {
    unsupportedBrowserMethod("writeFileSync");
  }

  writeFileSyncAtomic(_path: string, _dataStr: string): void {
    unsupportedBrowserMethod("writeFileSyncAtomic");
  }

  renameSync(_oldPath: string, _newPath: string): void {
    unsupportedBrowserMethod("renameSync");
  }

  existsSync(_path: string): boolean {
    return unsupportedBrowserMethod("existsSync");
  }

  unlinkSync(_path: string): void {
    unsupportedBrowserMethod("unlinkSync");
  }

  pbkdf2Sync(_password: string, _salt: string, _iterations: number, _keylen: number): any {
    return unsupportedBrowserMethod("pbkdf2Sync");
  }

  randomBytes(_size: number): any {
    return unsupportedBrowserMethod("randomBytes");
  }

  createCipher(_algorithm: string, _key: any, _iv: any): any {
    return unsupportedBrowserMethod("createCipher");
  }

  createDecipher(_algorithm: string, _key: any, _iv: any, _authTag: any): any {
    return unsupportedBrowserMethod("createDecipher");
  }

  static readonly v1 = Base.v1;
}

export * from "../core/types";
