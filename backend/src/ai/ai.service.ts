import { Injectable, Logger } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private extractor: any = null;

  async onModuleInit() {
    this.logger.log('Loading local AI embedding model...');
    // We use all-MiniLM-L6-v2 which generates 384-dimensional vectors
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Keep it fast and lightweight for Node.js
    });
    this.logger.log('AI embedding model loaded successfully!');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error('AI Model not initialized yet');
    }
    
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    // Convert Float32Array to standard JS Array
    return Array.from(output.data);
  }
}
