import { Router } from 'express';
import { Request, Response } from 'express';
import { dbService } from '../db';
import logger from '../logger';

const router = Router();

/**
 * Get status of a specific request
 */
router.get('/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const request = await dbService.getRequest(requestId);
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      requestId: request.requestId,
      type: request.type,
      status: request.status,
      userAddress: request.userAddress,
      amount: request.amount,
      chainId: request.chainId,
      txHash: request.txHash,
      errorMessage: request.errorMessage,
      fiatRef: request.fiatRef,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  } catch (error) {
    logger.error('Error getting request status', { error: error.message, requestId: req.params.requestId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recent requests (for debugging/monitoring)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const status = req.query.status as string;

    // Build where clause
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    // This would need to be implemented in the database service
    // For now, return a simple response
    res.json({
      message: 'Recent requests endpoint - implementation needed',
      limit,
      offset,
      filters: { type, status },
    });
  } catch (error) {
    logger.error('Error getting recent requests', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
