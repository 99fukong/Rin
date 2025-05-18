import path from "path";
import Container, { Service } from "typedi";
import type { DB } from "../_worker";
import type { Env } from "../db/db";
import { getDB, getEnv } from "./di";

// Cache Utils for storing data in memory only
// DO NOT USE THIS TO STORE SENSITIVE DATA

@Service()
export class CacheImpl {
    cache: Map<string, any> = new Map<string, any>();
    db: DB;
    env: Env;
    cacheUrl: string;
    type: string;
    loaded: boolean = false;

    constructor(type: string = "cache") {
        this.type = type;
        this.db = getDB();
        this.env = getEnv();
        this.cache = new Map<string, any>();
        const slash = this.env.S3_ACCESS_HOST.endsWith('/') ? '' : '/';
        this.cacheUrl = this.env.S3_ACCESS_HOST + slash + path.join(this.env.S3_CACHE_FOLDER || 'cache', `${type}.json`);
    }

    async load() {
        // Disabled external load to S3/R2
        console.log('Cache load skipped (in-memory only)');
        this.loaded = true;
    }

    async all() {
        if (!this.loaded) {
            await this.load();
        }
        return this.cache;
    }

    async get(key: string) {
        if (!this.loaded) {
            await this.load();
        }
        return this.cache.get(key);
    }

    async getByPrefix(prefix: string): Promise<any[]> {
        if (!this.loaded) {
            await this.load();
        }
        const result = [];
        for (let key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                result.push(this.cache.get(key));
            }
        }
        return result;
    }

    async getBySuffix(suffix: string): Promise<any[]> {
        if (!this.loaded) {
            await this.load();
        }
        const result = [];
        for (let key of this.cache.keys()) {
            if (key.endsWith(suffix)) {
                result.push(this.cache.get(key));
            }
        }
        return result;
    }

    async getOrSet<T>(key: string, value: () => Promise<T>) {
        const cached = await this.get(key);
        if (cached !== undefined) {
            console.log('Cache hit', key);
            return cached as T;
        }
        const newValue = await value();
        await this.set(key, newValue);
        return newValue;
    }

    async getOrDefault<T>(key: string, defaultValue: T) {
        return this.getOrSet(key, async () => defaultValue);
    }

    async set(key: string, value: any) {
        this.cache.set(key, value);
    }

    async delete(key: string) {
        if (!this.loaded) {
            await this.load();
        }
        this.cache.delete(key);
    }

    async deletePrefix(prefix: string) {
        for (let key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    async deleteSuffix(suffix: string) {
        for (let key of this.cache.keys()) {
            console.log("Cache key", key);
            if (key.endsWith(suffix)) {
                console.log("Cache delete", key);
                this.cache.delete(key);
            }
        }
    }

    async clear() {
        this.cache.clear();
    }

    async save() {
        // Disabled saving to S3/R2
        console.log('Cache save skipped (in-memory only)');
    }
}

export const PublicCache = () => Container.get<CacheImpl>("cache");
export const ServerConfig = () => Container.get<CacheImpl>("server.config");
export const ClientConfig = () => Container.get<CacheImpl>("client.config");
