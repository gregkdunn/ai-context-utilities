import { QueueConfig, RequestQueueItem } from '../../types/analysis';

/**
 * Priority-based request queue with rate limiting and retry logic
 * for managing Copilot API calls efficiently
 */
export class PriorityRequestQueue {
  private queue: RequestQueueItem<any>[] = [];
  private processing = new Set<string>();
  private lastRequestTime = 0;
  private isProcessing = false;

  constructor(private config: QueueConfig) {
    this.startProcessing();
  }

  /**
   * Add a request to the priority queue
   */
  async add<T>(
    request: () => Promise<T>,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: RequestQueueItem<T> = {
        id: this.generateId(),
        request,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject
      };

      this.insertByPriority(item);
    });
  }

  /**
   * Start the queue processing loop
   */
  private startProcessing(): void {
    if (this.isProcessing) {return;}
    
    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Main queue processing loop with concurrency control
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      // Wait if we're at max concurrency
      if (this.processing.size >= this.config.maxConcurrent) {
        await this.sleep(100);
        continue;
      }

      // Get next item from queue
      const item = this.getNextItem();
      if (!item) {
        await this.sleep(100);
        continue;
      }

      // Respect rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.config.minInterval) {
        const waitTime = this.config.minInterval - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      // Process the request
      this.processItem(item);
      this.lastRequestTime = Date.now();
    }
  }

  /**
   * Process individual queue item with retry logic
   */
  private async processItem<T>(item: RequestQueueItem<T>): Promise<void> {
    this.processing.add(item.id);

    try {
      // Create timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
      });

      // Race between request and timeout
      const result = await Promise.race([
        item.request(),
        timeoutPromise
      ]);

      item.resolve(result);
    } catch (error) {
      await this.handleRequestError(item, error as Error);
    } finally {
      this.processing.delete(item.id);
    }
  }

  /**
   * Handle request errors with exponential backoff retry
   */
  private async handleRequestError<T>(
    item: RequestQueueItem<T>, 
    error: Error
  ): Promise<void> {
    item.retryCount++;

    if (item.retryCount <= this.config.maxRetries) {
      // Exponential backoff
      const backoffTime = Math.pow(this.config.backoffMultiplier, item.retryCount) * 1000;
      
      console.warn(
        `Request ${item.id} failed (attempt ${item.retryCount}/${this.config.maxRetries}). ` +
        `Retrying in ${backoffTime}ms. Error:`, error.message
      );

      // Add back to queue after delay
      setTimeout(() => {
        this.insertByPriority(item);
      }, backoffTime);
    } else {
      console.error(
        `Request ${item.id} failed permanently after ${this.config.maxRetries} retries.`,
        error
      );
      item.reject(new Error(
        `Request failed after ${this.config.maxRetries} retries: ${error.message}`
      ));
    }
  }

  /**
   * Insert item into queue maintaining priority order
   */
  private insertByPriority<T>(item: RequestQueueItem<T>): void {
    const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };
    const itemPriority = priorityValues[item.priority];

    // Find insertion point
    let insertIndex = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const queueItemPriority = priorityValues[this.queue[i].priority];
      if (queueItemPriority < itemPriority) {
        break;
      }
      if (queueItemPriority === itemPriority && this.queue[i].timestamp > item.timestamp) {
        break;
      }
      insertIndex = i + 1;
    }

    this.queue.splice(insertIndex, 0, item);
  }

  /**
   * Get the next item to process from the queue
   */
  private getNextItem(): RequestQueueItem<any> | null {
    return this.queue.shift() || null;
  }

  /**
   * Generate unique ID for queue items
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue statistics
   */
  getStats(): {
    queueSize: number;
    processing: number;
    totalProcessed: number;
    totalFailed: number;
  } {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      totalProcessed: 0, // Would need to track this
      totalFailed: 0     // Would need to track this
    };
  }

  /**
   * Clear the queue and stop processing
   */
  dispose(): void {
    this.isProcessing = false;
    this.queue.length = 0;
    this.processing.clear();
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isProcessing = false;
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }
}