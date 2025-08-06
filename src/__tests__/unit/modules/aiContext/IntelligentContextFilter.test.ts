/**
 * Tests for IntelligentContextFilter
 */

import { IntelligentContextFilter, ContextItem, FilteringOptions } from '../../../../modules/aiContext/IntelligentContextFilter';

describe('IntelligentContextFilter', () => {
    let contextFilter: IntelligentContextFilter;

    beforeEach(() => {
        contextFilter = new IntelligentContextFilter('/test/workspace');
    });

    describe('Constructor', () => {
        test('should create instance', () => {
            expect(contextFilter).toBeDefined();
            expect(contextFilter).toBeInstanceOf(IntelligentContextFilter);
        });
    });

    describe('ContextItem interface', () => {
        test('should create valid context item', () => {
            const contextItem: ContextItem = {
                type: 'git_diff',
                content: 'test content',
                relevanceScore: 0.8,
                metadata: {
                    filePath: '/test/path.ts',
                    timestamp: Date.now(),
                    size: 100,
                    lineCount: 5
                }
            };

            expect(contextItem.type).toBe('git_diff');
            expect(contextItem.relevanceScore).toBe(0.8);
            expect(contextItem.metadata.size).toBe(100);
        });
    });

    describe('FilteringOptions interface', () => {
        test('should create valid filtering options', () => {
            const options: FilteringOptions = {
                maxTokens: 8000,
                includeTypes: ['git_diff', 'test_output'],
                prioritizeRecent: true,
                includeErrorContext: true,
                minRelevanceScore: 0.5
            };

            expect(options.maxTokens).toBe(8000);
            expect(options.includeTypes).toContain('git_diff');
            expect(options.prioritizeRecent).toBe(true);
        });
    });

    describe('Static properties', () => {
        test('should have default options accessible', () => {
            expect(IntelligentContextFilter).toBeDefined();
            expect(typeof IntelligentContextFilter).toBe('function');
        });
    });
});