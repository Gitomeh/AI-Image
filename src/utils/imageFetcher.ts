/**
 * Utility for fetching images from URLs
 * Supports both local files and remote URLs
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export class ImageFetcher {
  /**
   * Fetch an image from a URL and return it as a Buffer
   */
  static async fetchFromUrl(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            return this.fetchFromUrl(redirectUrl).then(resolve).catch(reject);
          }
        }

        // Check for error status
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });

        response.on('error', (error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Load an image from a local file path
   */
  static async loadFromFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Determine MIME type from file extension or URL
   */
  static getMimeType(urlOrPath: string): string {
    const ext = path.extname(urlOrPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };

    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Fetch image from either URL or local path
   */
  static async fetch(source: string): Promise<{ buffer: Buffer; mimeType: string }> {
    // Check if it's a URL
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const buffer = await this.fetchFromUrl(source);
      const mimeType = this.getMimeType(source);
      return { buffer, mimeType };
    }

    // Otherwise, treat as local file path
    const buffer = await this.loadFromFile(source);
    const mimeType = this.getMimeType(source);
    return { buffer, mimeType };
  }
}
