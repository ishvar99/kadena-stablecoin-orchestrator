import WebSocket from 'ws';
import axios from 'axios';
import { config } from '../config';
import logger from '../logger';
import { KuroMintEvent } from '../types';
import { MintService } from '../services/MintService';

export class KuroListener {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private mintService: MintService;

  constructor(mintService: MintService) {
    this.mintService = mintService;
  }

  /**
   * Start listening to Kuro WebSocket events
   */
  async start(): Promise<void> {
    logger.info('Starting Kuro WebSocket listener', { url: config.kuroWebSocketUrl });
    
    try {
      await this.connect();
    } catch (error) {
      logger.error('Failed to start Kuro listener', { error: error.message });
      throw error;
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(config.kuroWebSocketUrl);

        this.ws.on('open', () => {
          logger.info('Connected to Kuro WebSocket');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', async (data) => {
          try {
            const event = JSON.parse(data.toString()) as KuroMintEvent;
            await this.handleMintEvent(event);
          } catch (error) {
            logger.error('Error processing Kuro message', { error: error.message, data: data.toString() });
          }
        });

        this.ws.on('close', (code, reason) => {
          logger.warn('Kuro WebSocket connection closed', { code, reason: reason.toString() });
          this.handleReconnect();
        });

        this.ws.on('error', (error) => {
          logger.error('Kuro WebSocket error', { error: error.message });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleMintEvent(event: KuroMintEvent): Promise<void> {
    logger.info('Received mint event from Kuro', { requestId: event.requestId, user: event.user, amount: event.amount });

    try {
      // Process the mint request
      await this.mintService.processMintRequest({
        requestId: event.requestId,
        user: event.user,
        amount: event.amount,
        fiatRef: event.fiatRef,
      });
    } catch (error) {
      logger.error('Error processing mint event', { 
        requestId: event.requestId, 
        error: error.message 
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.info(`Attempting to reconnect to Kuro WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, { 
        delay 
      });

      setTimeout(() => {
        this.connect().catch((error) => {
          logger.error('Reconnection attempt failed', { error: error.message });
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached for Kuro WebSocket');
    }
  }

  /**
   * Fallback: Poll Kuro REST API for events
   */
  async pollRestAPI(): Promise<void> {
    try {
      const response = await axios.get(`${config.kuroRestUrl}/mint-requests/pending`);
      const events = response.data as KuroMintEvent[];

      for (const event of events) {
        await this.handleMintEvent(event);
      }
    } catch (error) {
      logger.error('Error polling Kuro REST API', { error: error.message });
    }
  }

  /**
   * Stop the listener
   */
  stop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Health check
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
