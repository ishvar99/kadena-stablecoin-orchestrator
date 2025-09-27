import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import statusRoutes from './routes/status';
import metricsRoutes from './routes/metrics';
import { KuroListener } from './listeners/KuroListener';
import { EVMListener } from './listeners/EVMListener';
import { MintService } from './services/MintService';
import { RedeemService } from './services/RedeemService';
import { QueueService } from './services/QueueService';
import { dbService } from './db';

class OrchestratorApp {
  private app: express.Application;
  private server: any;
  private mintService: MintService;
  private redeemService: RedeemService;
  private queueService: QueueService;
  private kuroListener: KuroListener;
  private evmListener: EVMListener;

  constructor() {
    this.app = express();
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeServices(): void {
    // Initialize queue service first
    this.queueService = new QueueService(null, null); // Will be injected later
    
    // Initialize services
    this.mintService = new MintService(this.queueService);
    this.redeemService = new RedeemService(this.queueService);
    
    // Update queue service with service references
    (this.queueService as any).mintService = this.mintService;
    (this.queueService as any).redeemService = this.redeemService;
    
    // Initialize listeners
    this.kuroListener = new KuroListener(this.mintService);
    this.evmListener = new EVMListener(this.redeemService);
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.nodeEnv === 'production' ? false : true,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use(limiter);

    // Request logging
    this.app.use(requestLogger);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health endpoints
    this.app.use('/health', healthRoutes);
    
    // Status endpoints
    this.app.use('/status', statusRoutes);
    
    // Metrics endpoints
    this.app.use('/metrics', metricsRoutes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Orchestrator Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      // Start listeners
      logger.info('Starting event listeners...');
      await this.kuroListener.start();
      await this.evmListener.start();
      
      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Orchestrator service started on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info('Service is ready to process mint and redeem requests');
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start orchestrator service', { error: error.message });
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close();
        }
        
        // Stop listeners
        this.kuroListener.stop();
        await this.evmListener.stop();
        
        // Stop queue service
        await this.queueService.shutdown();
        
        // Close database connection
        await dbService.disconnect();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  }

  /**
   * Get the Express app (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Start the application
if (require.main === module) {
  const app = new OrchestratorApp();
  app.start().catch((error) => {
    logger.error('Failed to start application', { error: error.message });
    process.exit(1);
  });
}

export default OrchestratorApp;
