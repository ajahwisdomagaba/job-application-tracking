import mongoose from "mongoose";

import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
        select: false,
        },
    role: {
        type: String,
        enum: ["admin", "recruiter", "jobseeker"],
        default: "jobseeker",
    },
    companyName: {
        type: String,
        trim: true,
        required: [
            function () {
                return this.role === "recruiter";
            },
            "Company name is required",
        ],
    },
    isEmailConfirmed: {
        type: Boolean,
        default: false,
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: function () {
            return this.role === "recruiter" ? "pending" : undefined;
        },
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    verifiedAt: {
        type: Date,
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    rejectionReason: {
        type: String,
        default: null,
    },

}, { timestamps: true });


//Hash Password Before Saving

userSchema.pre('save', async function (next){
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);  
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

//Compare Password

userSchema.methods.comparePassword = async function (enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

export default mongoose.model("User", userSchema);