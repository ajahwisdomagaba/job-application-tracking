import mongoose from 'mongoose';
import Attachment from '../models/Attachment.js';
import {
  buildCreatedAtFilter,
  parseStatisticsQuery,
} from '../utils/statistics.js';

export const getAttachmentStatistics = async (req, res, next) => {
  try {
    const { from, to, groupBy } = parseStatisticsQuery(req.query);
    if (req.query.scope && !['mine', 'all'].includes(req.query.scope)) {
      return res.status(400).json({
        success: false,
        message: 'scope must be one of: mine, all',
      });
    }
    const globalScope = req.query.scope === 'all';

    if (globalScope && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can request global statistics',
      });
    }

    const match = {};
    if (!globalScope) match.owner = new mongoose.Types.ObjectId(req.user._id);
    const createdAt = buildCreatedAtFilter({ from, to });
    if (createdAt) match.createdAt = createdAt;

    const [statistics] = await Attachment.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalFiles: { $sum: 1 },
                totalBytes: { $sum: '$bytes' },
                averageBytes: { $avg: '$bytes' },
              },
            },
            { $project: { _id: 0 } },
          ],
          byPurpose: [
            { $group: { _id: '$purpose', count: { $sum: 1 }, bytes: { $sum: '$bytes' } } },
            { $project: { _id: 0, purpose: '$_id', count: 1, bytes: 1 } },
            { $sort: { count: -1 } },
          ],
          byMimeType: [
            { $group: { _id: '$mimeType', count: { $sum: 1 }, bytes: { $sum: '$bytes' } } },
            { $project: { _id: 0, mimeType: '$_id', count: 1, bytes: 1 } },
            { $sort: { count: -1 } },
          ],
          overTime: [
            {
              $group: {
                _id: {
                  $dateTrunc: { date: '$createdAt', unit: groupBy, timezone: 'UTC' },
                },
                count: { $sum: 1 },
                bytes: { $sum: '$bytes' },
              },
            },
            { $project: { _id: 0, period: '$_id', count: 1, bytes: 1 } },
            { $sort: { period: 1 } },
          ],
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: statistics.summary[0] || {
          totalFiles: 0,
          totalBytes: 0,
          averageBytes: 0,
        },
        byPurpose: statistics.byPurpose,
        byMimeType: statistics.byMimeType,
        overTime: statistics.overTime,
      },
      filters: {
        scope: globalScope ? 'all' : 'mine',
        groupBy,
        from: from?.toISOString() || null,
        to: to?.toISOString() || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};
