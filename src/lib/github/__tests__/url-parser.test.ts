/**
 * Tests for URL Parser Module
 */

import { describe, it, expect } from 'vitest';
import { parseGitHubPRUrl, type ParsedPRUrl } from '../url-parser';

describe('URL Parser', () => {
  describe('parseGitHubPRUrl', () => {
    it('should parse standard GitHub PR URL', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/42');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 42,
      });
    });

    it('should parse GitHub PR URL with trailing slash', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/42/');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 42,
      });
    });

    it('should parse GitHub PR URL with www prefix', () => {
      const result = parseGitHubPRUrl('https://www.github.com/octocat/hello-world/pull/42');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 42,
      });
    });

    it('should parse GitHub PR URL with http protocol', () => {
      const result = parseGitHubPRUrl('http://github.com/octocat/hello-world/pull/42');
      expect(result).toEqual({
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 42,
      });
    });

    it('should parse PR URL with large pull number', () => {
      const result = parseGitHubPRUrl('https://github.com/facebook/react/pull/12345');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        pullNumber: 12345,
      });
    });

    it('should return null for invalid URL', () => {
      const result = parseGitHubPRUrl('invalid-url');
      expect(result).toBeNull();
    });

    it('should return null for non-GitHub URL', () => {
      const result = parseGitHubPRUrl('https://gitlab.com/octocat/hello-world/pull/42');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseGitHubPRUrl('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = parseGitHubPRUrl(null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = parseGitHubPRUrl(undefined as any);
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = parseGitHubPRUrl(123 as any);
      expect(result).toBeNull();
    });

    it('should return null for URL without pull number', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world');
      expect(result).toBeNull();
    });

    it('should return null for URL with invalid pull number', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/abc');
      expect(result).toBeNull();
    });

    it('should return null for URL with zero pull number', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/0');
      expect(result).toBeNull();
    });

    it('should return null for URL with negative pull number', () => {
      const result = parseGitHubPRUrl('https://github.com/octocat/hello-world/pull/-1');
      expect(result).toBeNull();
    });

    it('should parse organization repo URL', () => {
      const result = parseGitHubPRUrl('https://github.com/microsoft/vscode/pull/123456');
      expect(result).toEqual({
        owner: 'microsoft',
        repo: 'vscode',
        pullNumber: 123456,
      });
    });

    it('should handle repo names with dashes', () => {
      const result = parseGitHubPRUrl('https://github.com/some-org/my-awesome-repo/pull/99');
      expect(result).toEqual({
        owner: 'some-org',
        repo: 'my-awesome-repo',
        pullNumber: 99,
      });
    });

    it('should handle repo names with numbers', () => {
      const result = parseGitHubPRUrl('https://github.com/user/repo123/pull/50');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo123',
        pullNumber: 50,
      });
    });
  });
});