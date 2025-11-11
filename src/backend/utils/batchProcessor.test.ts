import { BatchProcessor } from './batchProcessor';

describe('BatchProcessor', () => {
  describe('processInBatches', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn().mockImplementation(async (batch: number[]) => {
        return batch.map(x => x * 2);
      });

      const result = await BatchProcessor.processInBatches(items, 2, processor);

      expect(result.results).toEqual([2, 4, 6, 8, 10]);
      expect(result.errors).toHaveLength(0);
      expect(processor).toHaveBeenCalledTimes(3);
      expect(processor).toHaveBeenNthCalledWith(1, [1, 2]);
      expect(processor).toHaveBeenNthCalledWith(2, [3, 4]);
      expect(processor).toHaveBeenNthCalledWith(3, [5]);
    });

    it('should call onBatchComplete callback for each batch', async () => {
      const items = [1, 2, 3, 4];
      const processor = jest.fn().mockImplementation(async (batch: number[]) => batch);
      const onBatchComplete = jest.fn();

      await BatchProcessor.processInBatches(items, 2, processor, onBatchComplete);

      expect(onBatchComplete).toHaveBeenCalledTimes(2);
      expect(onBatchComplete).toHaveBeenNthCalledWith(1, 1, 2);
      expect(onBatchComplete).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it('should handle batch processing errors', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const processor = jest.fn()
        .mockResolvedValueOnce([2, 4])
        .mockRejectedValueOnce(new Error('Batch 2 failed'))
        .mockResolvedValueOnce([10, 12]);

      const result = await BatchProcessor.processInBatches(items, 2, processor);

      expect(result.results).toEqual([2, 4, 10, 12]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Batch 2 failed');
    });

    it('should handle all batches failing', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockRejectedValue(new Error('All failed'));

      const result = await BatchProcessor.processInBatches(items, 1, processor);

      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.every(e => e.includes('All failed'))).toBe(true);
    });

    it('should handle empty items array', async () => {
      const processor = jest.fn();
      const onBatchComplete = jest.fn();

      const result = await BatchProcessor.processInBatches([], 10, processor, onBatchComplete);

      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
      expect(onBatchComplete).not.toHaveBeenCalled();
    });

    it('should handle single item', async () => {
      const items = [1];
      const processor = jest.fn().mockImplementation(async (batch: number[]) => batch);

      const result = await BatchProcessor.processInBatches(items, 10, processor);

      expect(result.results).toEqual([1]);
      expect(result.errors).toHaveLength(0);
      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1]);
    });

    it('should handle batch size larger than items', async () => {
      const items = [1, 2, 3];
      const processor = jest.fn().mockImplementation(async (batch: number[]) => batch);

      const result = await BatchProcessor.processInBatches(items, 10, processor);

      expect(result.results).toEqual([1, 2, 3]);
      expect(result.errors).toHaveLength(0);
      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should handle string errors', async () => {
      const items = [1, 2];
      const processor = jest.fn().mockRejectedValue('String error');

      const result = await BatchProcessor.processInBatches(items, 1, processor);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('String error');
    });

    it('should handle non-Error objects as errors', async () => {
      const items = [1];
      const processor = jest.fn().mockRejectedValue({ message: 'Object error' });

      const result = await BatchProcessor.processInBatches(items, 1, processor);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('[object Object]');
    });
  });

  describe('chunk', () => {
    it('should split array into chunks', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const chunks = BatchProcessor.chunk(items, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      const chunks = BatchProcessor.chunk([], 3);

      expect(chunks).toEqual([]);
    });

    it('should handle single chunk', () => {
      const items = [1, 2, 3];
      const chunks = BatchProcessor.chunk(items, 10);

      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it('should handle batch size of 1', () => {
      const items = [1, 2, 3];
      const chunks = BatchProcessor.chunk(items, 1);

      expect(chunks).toEqual([[1], [2], [3]]);
    });

    it('should handle exact division', () => {
      const items = [1, 2, 3, 4, 5, 6];
      const chunks = BatchProcessor.chunk(items, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6]]);
    });
  });
});

