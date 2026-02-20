import { enrichReportWithAI } from './aiEnhancer.js';
import { buildLocalReport } from './localAnalyzer.js';

export async function buildRepositoryReport(snapshot) {
  const localReport = buildLocalReport(snapshot);
  const enhancedReport = await enrichReportWithAI(snapshot, localReport);

  return {
    ...enhancedReport,
    reportVersion: '2.0',
    generatedAt: new Date().toISOString(),
  };
}
