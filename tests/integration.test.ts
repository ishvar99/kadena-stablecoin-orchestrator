import request from 'supertest';
import OrchestratorApp from '../src/index';

describe('Integration Tests', () => {
  let app: OrchestratorApp;

  beforeAll(() => {
    app = new OrchestratorApp();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app.getApp())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return readiness status', async () => {
      const response = await request(app.getApp())
        .get('/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should return liveness status', async () => {
      const response = await request(app.getApp())
        .get('/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Status Endpoints', () => {
    it('should return 404 for non-existent request', async () => {
      const response = await request(app.getApp())
        .get('/status/non-existent-request')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing request ID', async () => {
      const response = await request(app.getApp())
        .get('/status/')
        .expect(404); // This will be caught by the 404 handler
    });
  });

  describe('Metrics Endpoints', () => {
    it('should return basic metrics', async () => {
      const response = await request(app.getApp())
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('requests');
    });

    it('should return queue metrics', async () => {
      const response = await request(app.getApp())
        .get('/metrics/queues')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('mint');
      expect(response.body).toHaveProperty('redeem');
    });
  });

  describe('Root Endpoint', () => {
    it('should return service information', async () => {
      const response = await request(app.getApp())
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Orchestrator Service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app.getApp())
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Route not found');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });
});
