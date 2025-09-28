import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { contractManager } from '../contracts';
import { dbService } from '../db';
import { config } from '../config';
import logger from '../logger';

const router = Router();

/**
 * Get relayer status and balance
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const wallet = new ethers.Wallet(config.relayerPrivateKey);
    const balance = ethers.formatEther(await contractManager.getProvider().getBalance(wallet.address));
    const balanceWei = await contractManager.getProvider().getBalance(wallet.address);
    
    // Get deployed contracts count
    const deployedContracts = await dbService.getAllActiveStablecoins();
    
    const relayerStatus = {
      address: wallet.address,
      balance: balance,
      balanceWei: balanceWei.toString(),
      chainId: 5920,
      deployedContracts: deployedContracts.length,
      isActive: true,
      timestamp: Date.now()
    };

    res.status(200).json(relayerStatus);
  } catch (error) {
    logger.error('Error getting relayer status', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get deployed contracts by relayer
 */
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const deployedContracts = await dbService.getAllActiveStablecoins();
    
    res.status(200).json({
      contracts: deployedContracts,
      count: deployedContracts.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting deployed contracts', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get relayer transaction history
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Get recent transactions from the database
    const transactions = await dbService.getRecentRequests(limit, offset);

    res.status(200).json({
      transactions,
      count: transactions.length,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error getting relayer transactions', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
