import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import JobPost from '../models/JobPost.js';

const SEED_RECRUITER_PASSWORD = process.env.SEED_RECRUITER_PASSWORD;

const recruiterSeeds = [
  {
    name: 'Ada Okafor',
    email: 'ada.recruiter@example.com',
    companyName: 'Northstar Digital',
  },
  {
    name: 'Tunde Balogun',
    email: 'tunde.recruiter@example.com',
    companyName: 'Greenfield Technologies',
  },
];

function makeJobSeeds(recruiters) {
  const northstar = recruiters[0];
  const greenfield = recruiters[1];
  const closingDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  return [
    {
      recruiter: northstar._id,
      title: 'Junior Frontend Developer',
      companyName: northstar.companyName,
      field: 'Software Development',
      description:
        'Work with the product team to build accessible, responsive web interfaces and improve the experience of our users.',
      requirements: ['HTML and CSS fundamentals', 'JavaScript fundamentals', 'Git basics', 'Willingness to learn'],
      location: 'Lagos, Nigeria (Hybrid)',
      salaryMin: 180000,
      salaryMax: 300000,
      salaryCurrency: 'NGN',
      salaryPeriod: 'per month',
      closingDate: closingDate(30),
      status: 'Open',
    },
    {
      recruiter: northstar._id,
      title: 'Backend Developer Intern',
      companyName: northstar.companyName,
      field: 'Software Development',
      description:
        'Assist in building and testing REST APIs, working with databases, and documenting backend services under the guidance of experienced engineers.',
      requirements: ['Basic JavaScript or Node.js', 'Basic REST API knowledge', 'Problem-solving skills'],
      location: 'Lagos, Nigeria (Remote)',
      salaryMin: 100000,
      salaryMax: 160000,
      salaryCurrency: 'NGN',
      salaryPeriod: 'per month',
      closingDate: closingDate(21),
      status: 'Open',
    },
    {
      recruiter: greenfield._id,
      title: 'IT Support Officer',
      companyName: greenfield.companyName,
      field: 'IT Support',
      description:
        'Provide first-line technical support, troubleshoot end-user issues, and assist with device and account administration.',
      requirements: ['Computer troubleshooting', 'Clear communication', 'Basic networking knowledge'],
      location: 'Abuja, Nigeria (On-site)',
      salaryMin: 200000,
      salaryMax: 320000,
      salaryCurrency: 'NGN',
      salaryPeriod: 'per month',
      closingDate: closingDate(28),
      status: 'Open',
    },
    {
      recruiter: greenfield._id,
      title: 'Product Design Associate',
      companyName: greenfield.companyName,
      field: 'Product Design',
      description:
        'Support user research, wireframing, prototyping, and design handoffs for web and mobile products.',
      requirements: ['Figma or a similar design tool', 'Portfolio or sample projects', 'Attention to detail'],
      location: 'Remote, Nigeria',
      salaryMin: 220000,
      salaryMax: 350000,
      salaryCurrency: 'NGN',
      salaryPeriod: 'per month',
      closingDate: closingDate(35),
      status: 'Open',
    },
  ];
}

async function getOrCreateRecruiter(seed) {
  const email = seed.email.toLowerCase();
  let recruiter = await User.findOne({ email });

  if (!recruiter) {
    recruiter = new User({
      ...seed,
      email,
      password: SEED_RECRUITER_PASSWORD,
      role: 'recruiter',
      isEmailConfirmed: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    });
    // User.js hashes the password in its pre-save hook.
    await recruiter.save();
    console.log(`Created sample recruiter: ${email}`);
    return recruiter;
  }

  if (recruiter.role !== 'recruiter') {
    throw new Error(
      `Seed email ${email} already belongs to a ${recruiter.role} account. No role changes were made.`,
    );
  }

  // These reserved example.com accounts are seed fixtures. Keep them usable on reruns.
  let changed = false;
  if (!recruiter.isEmailConfirmed) {
    recruiter.isEmailConfirmed = true;
    changed = true;
  }
  if (recruiter.verificationStatus !== 'verified') {
    recruiter.verificationStatus = 'verified';
    changed = true;
  }
  if (!recruiter.verifiedAt) {
    recruiter.verifiedAt = new Date();
    changed = true;
  }
  if (recruiter.companyName !== seed.companyName) {
    recruiter.companyName = seed.companyName;
    changed = true;
  }
  if (changed) await recruiter.save();
  console.log(`Reused sample recruiter: ${email}`);
  return recruiter;
}

async function getOrCreateJob(jobSeed) {
  const existingJob = await JobPost.findOne({
    recruiter: jobSeed.recruiter,
    title: jobSeed.title,
    companyName: jobSeed.companyName,
  });

  if (existingJob) {
    console.log(`Reused sample job: ${jobSeed.title}`);
    return existingJob;
  }

  const job = await JobPost.create(jobSeed);
  console.log(`Created sample job: ${jobSeed.title}`);
  return job;
}

async function seed() {
  if (!SEED_RECRUITER_PASSWORD || SEED_RECRUITER_PASSWORD.length < 8) {
    throw new Error('Set SEED_RECRUITER_PASSWORD in .env to a password of at least 8 characters.');
  }

  await connectDB();

  const recruiters = [];
  for (const recruiterSeed of recruiterSeeds) {
    recruiters.push(await getOrCreateRecruiter(recruiterSeed));
  }

  const jobs = makeJobSeeds(recruiters);
  for (const jobSeed of jobs) {
    await getOrCreateJob(jobSeed);
  }

  console.log(`Seeding complete: ${recruiters.length} sample recruiters and ${jobs.length} sample jobs checked.`);
}

try {
  await seed();
} catch (error) {
  console.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
