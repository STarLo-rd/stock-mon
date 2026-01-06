import { Router, Request, Response } from 'express';
import express from 'express';
import { razorpayService } from '../services/payment/razorpay.service';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/webhooks/razorpay
 * Razorpay webhook handler
 * No authentication required - uses signature verification instead
 * 
 * IMPORTANT: Razorpay requires raw body for signature verification
 * We use express.raw() middleware to get raw body before JSON parsing
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      logger.warn('Razorpay webhook received without signature', {
        headers: req.headers,
        bodyLength: req.body?.length,
      });
      return res.status(400).json({
        success: false,
        error: 'Missing signature',
      });
    }

    // Get raw body as string for signature verification
    const rawBody = req.body.toString('utf8');

    // Parse JSON payload
    const payload = JSON.parse(rawBody);

    logger.info('Razorpay webhook received', {
      event: payload.event,
      subscriptionId: payload.payload?.subscription?.entity?.id,
      paymentId: payload.payload?.payment?.entity?.id,
    });

    // Handle webhook with raw body string for signature verification
    await razorpayService.handleWebhook(payload, signature, rawBody);

    logger.info('Razorpay webhook processed successfully', {
      event: payload.event,
    });

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    logger.error('Error processing Razorpay webhook', {
      error: error.message,
      stack: error.stack,
      event: req.body ? JSON.parse(req.body.toString('utf8')).event : 'unknown',
    });

    // Still return 200 to prevent Razorpay from retrying
    // But log the error for investigation
    res.status(200).json({
      success: false,
      error: 'Webhook processing failed, but acknowledged',
    });
  }
});

export default router;

