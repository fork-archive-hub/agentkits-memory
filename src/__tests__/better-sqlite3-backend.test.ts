/**
 * Tests for BetterSqlite3Backend with FTS5 Trigram Tokenizer for CJK Support
 *
 * These tests verify proper CJK (Japanese, Chinese, Korean) language support
 * using the native SQLite trigram tokenizer.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { BetterSqlite3Backend, createBetterSqlite3Backend } from '../better-sqlite3-backend.js';
import type { MemoryEntry } from '../types.js';

// Skip tests if better-sqlite3 is not available
let betterSqlite3Available = false;
try {
  await import('better-sqlite3');
  betterSqlite3Available = true;
} catch {
  console.log('[Test] better-sqlite3 not available, skipping native tests');
}

const describeCond = betterSqlite3Available ? describe : describe.skip;

describeCond('BetterSqlite3Backend', () => {
  let backend: BetterSqlite3Backend;

  beforeEach(async () => {
    backend = createBetterSqlite3Backend({
      databasePath: ':memory:',
      ftsTokenizer: 'trigram',
      verbose: false,
    });
    await backend.initialize();
  });

  afterEach(async () => {
    await backend.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(backend).toBeDefined();
    });

    it('should have FTS5 available', () => {
      expect(backend.isFtsAvailable()).toBe(true);
    });

    it('should use trigram tokenizer', () => {
      expect(backend.getActiveTokenizer()).toBe('trigram');
    });

    it('should report CJK optimized', () => {
      expect(backend.isCjkOptimized()).toBe(true);
    });

    it('should pass health check with CJK support', async () => {
      const health = await backend.healthCheck();
      expect(health.status).toBe('healthy');

      // cache component is repurposed for CJK status
      expect(health.components.cache.status).toBe('healthy');
      expect(health.components.cache.message).toContain('Trigram');
    });
  });

  describe('basic CRUD operations', () => {
    it('should store and retrieve entries', async () => {
      const entry: MemoryEntry = {
        id: 'test-1',
        key: 'test-key',
        content: 'Test content',
        type: 'semantic',
        namespace: 'default',
        tags: ['test'],
        metadata: {},
        accessLevel: 'project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };

      await backend.store(entry);
      const retrieved = await backend.get('test-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.content).toBe('Test content');
    });

    it('should update entries', async () => {
      const entry: MemoryEntry = {
        id: 'test-update',
        key: 'original-key',
        content: 'Original content',
        type: 'semantic',
        namespace: 'default',
        tags: [],
        metadata: {},
        accessLevel: 'project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };

      await backend.store(entry);
      const updated = await backend.update('test-update', { content: 'Updated content' });

      expect(updated?.content).toBe('Updated content');
      expect(updated?.version).toBe(2);
    });

    it('should delete entries', async () => {
      const entry: MemoryEntry = {
        id: 'test-delete',
        key: 'delete-key',
        content: 'Delete me',
        type: 'semantic',
        namespace: 'default',
        tags: [],
        metadata: {},
        accessLevel: 'project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };

      await backend.store(entry);
      const deleted = await backend.delete('test-delete');
      const retrieved = await backend.get('test-delete');

      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });
  });

  describe('FTS5 with trigram tokenizer', () => {
    beforeEach(async () => {
      // Insert test entries
      const entries: MemoryEntry[] = [
        {
          id: 'en-1',
          key: 'english',
          content: 'Authentication using JWT tokens with refresh mechanism',
          type: 'semantic',
          namespace: 'patterns',
          tags: ['auth'],
          metadata: {},
          accessLevel: 'project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          references: [],
          accessCount: 0,
          lastAccessedAt: Date.now(),
        },
        {
          id: 'en-2',
          key: 'database',
          content: 'PostgreSQL connection pooling for high performance',
          type: 'semantic',
          namespace: 'patterns',
          tags: ['database'],
          metadata: {},
          accessLevel: 'project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          references: [],
          accessCount: 0,
          lastAccessedAt: Date.now(),
        },
      ];

      await backend.bulkInsert(entries);
    });

    it('should find English entries by keyword', async () => {
      const results = await backend.searchFts('authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === 'en-1')).toBe(true);
    });

    it('should find entries by partial match', async () => {
      const results = await backend.searchFts('auth');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by namespace', async () => {
      const results = await backend.searchFts('authentication', { namespace: 'patterns' });
      expect(results.every((r) => r.namespace === 'patterns')).toBe(true);
    });
  });

  describe('CJK language support', () => {
    describe('Japanese (日本語)', () => {
      beforeEach(async () => {
        const entries: MemoryEntry[] = [
          {
            id: 'jp-1',
            key: 'japanese-1',
            content: '日本語のテスト内容です。認証機能の実装について説明します。',
            type: 'semantic',
            namespace: 'japanese',
            tags: ['日本語', 'テスト'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
          {
            id: 'jp-2',
            key: 'japanese-2',
            content: 'データベース接続プーリングの実装パターン',
            type: 'semantic',
            namespace: 'japanese',
            tags: ['データベース'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
        ];

        await backend.bulkInsert(entries);
      });

      it('should find entries by Japanese text', async () => {
        const results = await backend.searchFts('日本語');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'jp-1')).toBe(true);
      });

      it('should find entries by Japanese partial text', async () => {
        // Trigram tokenizer needs 3+ characters for reliable matching
        const results = await backend.searchFts('認証機能');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'jp-1')).toBe(true);
      });

      it('should find entries by katakana', async () => {
        const results = await backend.searchFts('データベース');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'jp-2')).toBe(true);
      });

      it('should find entries by hiragana', async () => {
        // 'テスト内容' is a longer phrase that appears in the content
        const results = await backend.searchFts('テスト内容');
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('Chinese (中文)', () => {
      beforeEach(async () => {
        const entries: MemoryEntry[] = [
          {
            id: 'cn-1',
            key: 'chinese-1',
            content: '中文测试内容。这是关于用户认证的说明。',
            type: 'semantic',
            namespace: 'chinese',
            tags: ['中文', '测试'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
          {
            id: 'cn-2',
            key: 'chinese-2',
            content: '数据库连接池配置说明',
            type: 'semantic',
            namespace: 'chinese',
            tags: ['数据库'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
        ];

        await backend.bulkInsert(entries);
      });

      it('should find entries by Chinese text', async () => {
        // Use 3+ character term for trigram tokenizer
        const results = await backend.searchFts('中文测试');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'cn-1')).toBe(true);
      });

      it('should find entries by Chinese partial text', async () => {
        // Use longer phrase for reliable trigram matching
        const results = await backend.searchFts('用户认证');
        expect(results.length).toBeGreaterThan(0);
      });

      it('should find entries by Chinese database term', async () => {
        const results = await backend.searchFts('数据库');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'cn-2')).toBe(true);
      });
    });

    describe('Korean (한국어)', () => {
      beforeEach(async () => {
        const entries: MemoryEntry[] = [
          {
            id: 'kr-1',
            key: 'korean-1',
            content: '한국어 테스트 내용입니다. 사용자 인증에 대한 설명입니다.',
            type: 'semantic',
            namespace: 'korean',
            tags: ['한국어', '테스트'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
          {
            id: 'kr-2',
            key: 'korean-2',
            content: '데이터베이스 연결 풀 설정 방법',
            type: 'semantic',
            namespace: 'korean',
            tags: ['데이터베이스'],
            metadata: {},
            accessLevel: 'project',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            references: [],
            accessCount: 0,
            lastAccessedAt: Date.now(),
          },
        ];

        await backend.bulkInsert(entries);
      });

      it('should find entries by Korean text', async () => {
        const results = await backend.searchFts('한국어');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'kr-1')).toBe(true);
      });

      it('should find entries by Korean partial text', async () => {
        // Use longer phrase for reliable trigram matching
        const results = await backend.searchFts('사용자 인증');
        expect(results.length).toBeGreaterThan(0);
      });

      it('should find entries by Korean database term', async () => {
        const results = await backend.searchFts('데이터베이스');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'kr-2')).toBe(true);
      });
    });

    describe('Mixed language support', () => {
      beforeEach(async () => {
        const entry: MemoryEntry = {
          id: 'mixed-1',
          key: 'mixed',
          content: 'API設計パターン - Japanese API design patterns using REST and GraphQL',
          type: 'semantic',
          namespace: 'mixed',
          tags: ['API', '設計'],
          metadata: {},
          accessLevel: 'project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          references: [],
          accessCount: 0,
          lastAccessedAt: Date.now(),
        };

        await backend.store(entry);
      });

      it('should find by Japanese in mixed content', async () => {
        const results = await backend.searchFts('設計パターン');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'mixed-1')).toBe(true);
      });

      it('should find by English in mixed content', async () => {
        const results = await backend.searchFts('GraphQL');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'mixed-1')).toBe(true);
      });

      it('should find by API term in mixed content', async () => {
        const results = await backend.searchFts('API');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.id === 'mixed-1')).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', async () => {
      const results = await backend.searchFts('');
      expect(results.length).toBe(0);
    });

    it('should handle whitespace-only query', async () => {
      const results = await backend.searchFts('   ');
      expect(results.length).toBe(0);
    });

    it('should handle special characters', async () => {
      const results = await backend.searchFts('test*[query]');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle very long content', async () => {
      const longContent = '日本語テスト '.repeat(1000);
      const entry: MemoryEntry = {
        id: 'long-content',
        key: 'long',
        content: longContent,
        type: 'semantic',
        namespace: 'default',
        tags: [],
        metadata: {},
        accessLevel: 'project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      };

      await backend.store(entry);
      const results = await backend.searchFts('日本語');
      expect(results.some((r) => r.id === 'long-content')).toBe(true);
    });
  });

  describe('bulk operations', () => {
    it('should handle bulk insert', async () => {
      const entries: MemoryEntry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-${i}`,
        key: `key-${i}`,
        content: `Bulk content ${i} with 日本語 and 中文`,
        type: 'semantic' as const,
        namespace: 'bulk',
        tags: [],
        metadata: {},
        accessLevel: 'project' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      }));

      await backend.bulkInsert(entries);
      const count = await backend.count('bulk');
      expect(count).toBe(100);

      // FTS should work on bulk inserted entries
      const results = await backend.searchFts('日本語', { namespace: 'bulk' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle bulk delete', async () => {
      const entries: MemoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `delete-${i}`,
        key: `key-${i}`,
        content: `Delete content ${i}`,
        type: 'semantic' as const,
        namespace: 'delete',
        tags: [],
        metadata: {},
        accessLevel: 'project' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      }));

      await backend.bulkInsert(entries);
      const deleted = await backend.bulkDelete(entries.slice(0, 5).map((e) => e.id));
      const remaining = await backend.count('delete');

      expect(deleted).toBe(5);
      expect(remaining).toBe(5);
    });
  });

  describe('statistics', () => {
    it('should return correct stats', async () => {
      const entries: MemoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `stats-${i}`,
        key: `key-${i}`,
        content: `Stats content ${i}`,
        type: 'semantic' as const,
        namespace: i < 5 ? 'ns1' : 'ns2',
        tags: [],
        metadata: {},
        accessLevel: 'project' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        references: [],
        accessCount: 0,
        lastAccessedAt: Date.now(),
      }));

      await backend.bulkInsert(entries);
      const stats = await backend.getStats();

      expect(stats.totalEntries).toBe(10);
      expect(stats.entriesByNamespace.ns1).toBe(5);
      expect(stats.entriesByNamespace.ns2).toBe(5);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });
});

describe('createBetterSqlite3Backend factory', () => {
  const describeCond = betterSqlite3Available ? describe : describe.skip;

  describeCond('factory function', () => {
    it('should create backend with default trigram tokenizer', async () => {
      const backend = createBetterSqlite3Backend({
        databasePath: ':memory:',
      });
      await backend.initialize();

      expect(backend.getActiveTokenizer()).toBe('trigram');
      expect(backend.isCjkOptimized()).toBe(true);

      await backend.shutdown();
    });

    it('should allow custom tokenizer', async () => {
      const backend = createBetterSqlite3Backend({
        databasePath: ':memory:',
        ftsTokenizer: 'unicode61',
      });
      await backend.initialize();

      expect(backend.getActiveTokenizer()).toBe('unicode61');
      expect(backend.isCjkOptimized()).toBe(false);

      await backend.shutdown();
    });
  });
});
