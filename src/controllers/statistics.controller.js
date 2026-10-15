import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Attachment from '../models/Attachment.js';
import {
  buildCreatedAtFilter,
  parseStatisticsQuery,
} from '../utils/statistics.js';

export const getJobseekerStatistics = async (req, res, next) => {
  try {
    const { from, to, groupBy } = parseStatisticsQuery(req.query);
    const match = {
      owner: new mongoose.Types.ObjectId(req.user._id),
    };
    const createdAt = buildCreatedAtFilter({ from, to });
    if (createdAt) match.createdAt = createdAt;

    const [statistics] = await Application.aggregate([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalApplications: { $sum: 1 },
                activeApplications: {
                  $sum: {
                    $cond: [
                      { $in: ['$currentStage', ['Applied', 'Interview']] },
                      1,
                      0,
                    ],
                  },
                },
                interviews: {
                  $sum: { $cond: [{ $eq: ['$currentStage', 'Interview'] }, 1, 0] },
                },
                offers: {
                  $sum: { $cond: [{ $eq: ['$currentStage', 'Offer'] }, 1, 0] },
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ['$currentStage', 'Rejected'] }, 1, 0] },
                },
                withdrawn: {
                  $sum: { $cond: [{ $eq: ['$currentStage', 'Withdrawn'] }, 1, 0] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalApplications: 1,
                activeApplications: 1,
                interviews: 1,
                offers: 1,
                rejected: 1,
                withdrawn: 1,
                offerRate: {
                  $cond: [
                    { $gt: ['$totalApplications', 0] },
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ['$offers', '$totalApplications'] },
                            100,
                          ],
                        },
                        2,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          ],
          byStage: [
            { $group: { _id: '$currentStage', count: { $sum: 1 } } },
            { $project: { _id: 0, stage: '$_id', count: 1 } },
            { $sort: { stage: 1 } },
          ],
          overTime: [
            {
              $group: {
                _id: {
                  $dateTrunc: { date: '$createdAt', unit: groupBy, timezone: 'UTC' },
                },
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, period: '$_id', count: 1 } },
            { $sort: { period: 1 } },
          ],
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: statistics.summary[0] || {
          totalApplications: 0,
          activeApplications: 0,
          interviews: 0,
          offers: 0,
          rejected: 0,
          withdrawn: 0,
          offerRate: 0,
        },
        byStage: statistics.byStage,
        overTime: statistics.overTime,
      },
      filters: {
        groupBy,
        from: from?.toISOString() || null,
        to: to?.toISOString() || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

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
