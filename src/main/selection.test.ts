import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('selection module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSelectedText', () => {
    it('should return text from clipboard using pbpaste', async () => {
      const { getSelectedText } = await import('./selection');
      (execSync as any).mockReturnValue('Hello World');

      const result = await getSelectedText();

      expect(result.success).toBe(true);
      expect((result as any).text).toBe('Hello World');
      expect(execSync).toHaveBeenCalledWith('pbpaste', expect.any(Object));
    });

    it('should trim whitespace from clipboard text', async () => {
      const { getSelectedText } = await import('./selection');
      (execSync as any).mockReturnValue('  Hello World  ');

      const result = await getSelectedText();

      expect(result.success).toBe(true);
      expect((result as any).text).toBe('Hello World');
    });

    it('should return error when clipboard is empty', async () => {
      const { getSelectedText } = await import('./selection');
      (execSync as any).mockReturnValue('');

      const result = await getSelectedText();

      expect(result.success).toBe(false);
      expect((result as any).error).toBe('剪贴板为空 / Clipboard is empty');
    });

    it('should return error when pbpaste fails', async () => {
      const { getSelectedText } = await import('./selection');
      (execSync as any).mockImplementation(() => {
        throw new Error('pbpaste failed');
      });

      const result = await getSelectedText();

      expect(result.success).toBe(false);
      expect((result as any).error).toBe('无法读取剪贴板 / Failed to read clipboard');
    });
  });

  describe('checkAccessibilityPermission', () => {
    it('should always return true since no accessibility API is used', async () => {
      const { checkAccessibilityPermission } = await import('./selection');
      expect(checkAccessibilityPermission()).toBe(true);
    });
  });
});
