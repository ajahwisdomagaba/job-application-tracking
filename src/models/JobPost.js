import mongoose from 'mongoose';

const jobPostSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    // Copied from the recruiter's account in the pre-validate hook below
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    field: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requirements: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    salaryMin: {
      type: Number,
      required: true,
      min: 0,
    },
    salaryMax: {
      type: Number,
      required: true,
      min: 0,
    },
    salaryCurrency: {
      type: String,
      required: true,
      default: 'Naira',
      trim: true,
    },
    salaryPeriod: {
      type: String,
      required: true,
      enum: ['per month', 'per year'],
    },
    // The last moment applications are accepted. Seed data should use the end of the closing day.
    closingDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
  },
  { timestamps: true },
);

// Supports the public listing: Open + not expired, newest first
jobPostSchema.index({ status: 1, closingDate: 1, createdAt: -1 });

jobPostSchema.pre('validate', async function () {
  // 1) Salary range (the teammate's rule, kept as is)
  if (this.salaryMin != null && this.salaryMax != null && this.salaryMax < this.salaryMin) {
    this.invalidate('salaryMax', 'salaryMax must be greater than or equal to salaryMin');
  }

  // 2) Recruiter rule: must be a verified recruiter. Also copies companyName from their account.
  if (!this.isNew && !this.isModified('recruiter')) return;

  const User = mongoose.model('User');
  const recruiter = await User.findById(this.recruiter)
    .select('role verificationStatus companyName')
    .lean();

  if (!recruiter || recruiter.role !== 'recruiter') {
    this.invalidate('recruiter', 'Job postings can only belong to a recruiter account');
    return;
  }
  if (recruiter.verificationStatus !== 'verified') {
    this.invalidate('recruiter', 'Only verified recruiters can post jobs');
    return;
  }
  this.companyName = recruiter.companyName;
});

// ---- Shared "is this job visible / open for applications?" rule ----
// Used by GET /jobs, GET /jobs/:jobId and the apply route (closed-job check).

/** Mongo filter for postings that are Open and not past their closing date. */
jobPostSchema.statics.openFilter = function (now = new Date()) {
  return { status: 'Open', closingDate: { $gte: now } };
};

/** True if applications are currently accepted for this posting. */
jobPostSchema.methods.isAcceptingApplications = function (now = new Date()) {
  return this.status === 'Open' && this.closingDate >= now;
};

export default mongoose.model('JobPost', jobPostSchema);