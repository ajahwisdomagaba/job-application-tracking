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
    },
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
    },
    salaryMax: {
      type: Number,
      required: true,
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

jobPostSchema.pre('validate', function (next) {
  if (
    this.salaryMin != null &&
    this.salaryMax != null &&
    this.salaryMax < this.salaryMin
  ) {
    this.invalidate('salaryMax', 'salaryMax must be greater than or equal to salaryMin');
  }
  next();
});

export default mongoose.model('JobPost', jobPostSchema);
