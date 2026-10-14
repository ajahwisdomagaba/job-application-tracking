import mongoose from 'mongoose';
import Application from '../models/Application.js';
import StatusHistory from '../models/statusHistory.js';

// @desc    Apply for a job posting
// @route   POST /api/v1/jobs/:jobId/apply
// @access  Private (Job seeker)
export const applyToJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id;

    // Dynamically retrieve JobPost model from mongoose registry
    const JobPost = mongoose.model('JobPost');

    // 1. Find the job posting
    const job = await JobPost.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    // 2. Check if the job is open and not past its closing date
    const now = new Date();
    if (job.status === 'Closed' || (job.closingDate && new Date(job.closingDate) < now)) {
      return res.status(400).json({
        success: false,
        message: 'This job posting is closed or past its closing date',
      });
    }

    // 3. Check for existing application (prevents duplicate applications)
    const existingApplication = await Application.findOne({
      owner: userId,
      job: jobId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }

    // 4. Create the application
    const application = await Application.create({
      owner: userId,
      job: job._id,
      recruiter: job.recruiter,
      companyName: job.companyName,
      jobTitle: job.title,
      currentStage: 'Applied',
    });

    // 5. Create initial audit status history record
    await StatusHistory.create({
      application: application._id,
      oldStage: null,
      newStage: 'Applied',
      changedBy: userId,
      changedAt: Date.now(),
    });

    // 6. Notify the recruiter (if Notification model is registered)
    if (mongoose.models.Notification) {
      await mongoose.model('Notification').create({
        recipient: job.recruiter,
        application: application._id,
        type: 'New application',
        message: `A new application has been submitted for ${job.title}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in job seeker's applications
// @route   GET /api/v1/applications
// @access  Private (Job seeker)
export const getApplications = async (req, res, next) => {
  try {
    const { stage, company, sort } = req.query;

    // Build filter strictly scoped to the logged-in job seeker
    const filter = { owner: req.user._id };

    if (stage) {
      filter.currentStage = stage;
    }

    if (company) {
      filter.companyName = { $regex: company,$options: 'i' };
    }

    // Sorting option (default: newest first)
    let sortOptions = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const applications = await Application.find(filter)
      .populate('job', 'title salaryMin salaryMax salaryCurrency location status')
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job seeker application detail view
// @route   GET /api/v1/applications/:applicationId
// @access  Private (Job seeker)
export const getJobseekerApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findOne({
      _id: applicationId,
      owner: req.user._id,
    })
      .populate('recruiter', 'name companyName')
      .populate('job');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    let interviews = [];
    if (mongoose.models.Interview) {
      interviews = await mongoose.model('Interview')
        .find({ application: application._id })
        .sort({ roundNumber: 1 })
        .populate('setBy', 'name companyName');
    }

    res.status(200).json({
      success: true,
      message: 'Application details fetched successfully.',
      data: { ...application.toObject(), interviews },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw an active application
// @route   PATCH /api/v1/applications/:applicationId/withdraw
// @access  Private (Job seeker)
export const withdrawApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user._id;

    // Find application and ensure ownership
    const application = await Application.findOne({
      _id: applicationId,
      owner: userId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Enforce allowed stage move rule (Can only withdraw from Applied or Interview)
    if (!['Applied', 'Interview'].includes(application.currentStage)) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw an application at stage '${application.currentStage}'`,
      });
    }

    const oldStage = application.currentStage;
    application.currentStage = 'Withdrawn';
    await application.save();

    // Record the status change in audit history
    await StatusHistory.create({
      application: application._id,
      oldStage,
      newStage: 'Withdrawn',
      changedBy: userId,
      changedAt: Date.now(),
    });

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application deadline (Recruiter)
// @route   PATCH /api/v1/recruiter/applications/:applicationId/deadline
// @access  Private (Recruiter)
export const updateApplicationDeadline = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { deadline } = req.body;

    if (!deadline) {
      return res.status(400).json({
        success: false,
        message: 'Deadline field is required.',
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or unauthorized.',
      });
    }

    application.deadline = new Date(deadline);
    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application deadline updated successfully.',
      data: { deadline: application.deadline },
    });
  } catch (error) {
    next(error);
  }
};