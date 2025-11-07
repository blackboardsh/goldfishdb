import Base from "../core/abstractClass";
import { SchemaDefinitionWithDefaults } from "../core/types";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from "fs";
import * as crypto from "crypto";

export default class DB<
  CurrentSchema extends SchemaDefinitionWithDefaults
> extends Base<CurrentSchema> {
  constructor() {
    super();
  }

  mkdirSync(path: string): void {
    mkdirSync(path, { recursive: true });
  }

  readFileSync = (path: string) => {
    return readFileSync(path, { encoding: "utf-8" });
  };

  writeFileSync = (path: string, dataStr: string) => {
    writeFileSync(path, dataStr, { encoding: "utf-8" });
  };

  writeFileSyncAtomic = (path: string, dataStr: string) => {
    const nextPath = path.replace('.db', '_next.db');
    
    // Write to temporary file
    writeFileSync(nextPath, dataStr, { encoding: "utf-8" });
    
    // Atomic rename (overwrites existing file)
    renameSync(nextPath, path);
  };

  existsSync = (path: string): boolean => {
    return existsSync(path);
  };

  renameSync = (oldPath: string, newPath: string) => {
    renameSync(oldPath, newPath);
  };

  unlinkSync = (path: string) => {
    unlinkSync(path);
  };

  pbkdf2Sync = (password: string, salt: string, iterations: number, keylen: number): Buffer => {
    return crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
  };

  randomBytes = (size: number): Buffer => {
    return crypto.randomBytes(size);
  };

  createCipher = (algorithm: string, key: Buffer, iv: Buffer) => {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    return cipher;
  };

  createDecipher = (algorithm: string, key: Buffer, iv: Buffer, authTag: Buffer) => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher;
  };

  // Inherit static v1 from Base class
  static readonly v1 = Base.v1;
}

export * from '../core/types'