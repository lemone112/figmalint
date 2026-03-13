import { Hono } from 'hono';
import { runAnalysis, type AnalyzeRequest } from '../services/analyzer.js';
import {
  runExtendedAnalysis,
  type ExtendedAnalysisResult,
  type ExtendedFeatures,
} from '../services/extended-analyzer.js';

interface AnalyzeRequestBody extends AnalyzeRequest {
  features?: ExtendedFeatures;
}

const app = new Hono();

app.post('/analyze', async (c) => {
  try {
    let body: AnalyzeRequestBody;
    try {
      body = await c.req.json<AnalyzeRequestBody>();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body || typeof body !== 'object') {
      return c.json({ error: 'Request body must be a JSON object' }, 400);
    }
    if (!body.screenshot || typeof body.screenshot !== 'string') {
      return c.json({ error: 'screenshot is required and must be a string' }, 400);
    }
    if (!body.lintResult || typeof body.lintResult !== 'object') {
      return c.json({ error: 'lintResult is required' }, 400);
    }
    if (!body.extractedData || typeof body.extractedData !== 'object') {
      return c.json({ error: 'extractedData is required' }, 400);
    }
    if (!body.extractedData.componentName || typeof body.extractedData.componentName !== 'string') {
      return c.json({ error: 'extractedData.componentName is required' }, 400);
    }

    // Determine which extended features are requested
    const features: ExtendedFeatures = {
      attention: body.features?.attention === true,
      nielsen: body.features?.nielsen === true,
    };
    const hasExtended = features.attention || features.nielsen;

    // Run core analysis and extended analysis in parallel
    const [coreResult, extendedResult] = await Promise.all([
      runAnalysis(body),
      hasExtended
        ? runExtendedAnalysis(
            body.screenshot,
            body.lintResult,
            body.extractedData,
            body.sessionId ?? '',
            features,
          )
        : Promise.resolve(undefined as ExtendedAnalysisResult | undefined),
    ]);

    // Merge extended results into the response
    return c.json({
      ...coreResult,
      ...(extendedResult?.attention && { attention: extendedResult.attention }),
      ...(extendedResult?.nielsen && { nielsen: extendedResult.nielsen }),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return c.json({ error: 'Analysis failed. Please try again.' }, 500);
  }
});

export default app;
