export class BatchProcessor {
  static async processInBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>,
    onBatchComplete?: (batchIndex: number, batchSize: number) => void
  ): Promise<{ results: R[]; errors: string[] }> {
    const results: R[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;

      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);

        if (onBatchComplete) {
          onBatchComplete(batchIndex, batch.length);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Batch ${batchIndex} failed: ${errorMessage}`);
      }
    }

    return { results, errors };
  }

  static chunk<T>(items: T[], batchSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      chunks.push(items.slice(i, i + batchSize));
    }

    return chunks;
  }
}

