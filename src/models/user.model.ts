import bcrypt from "bcrypt";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import mongoose, { Schema, Document, Model } from "mongoose";
import courseModel from "./course.model";

// =============================
// 🔹 Interfaces
// =============================

interface IAvatar {
    public_id: string;
    secure_url: string;
}

interface ISubscription {
    courseId: string;
    courseTitle?: string;
    subscription_id?: string;
    order_id?: string;
    subscription_status?: string;
    purchaseAt?: Date;
    expiresAt?: Date;
    paymentDetails?: Record<string, unknown>;
}

interface ICreatedCourse {
    courseId: mongoose.Types.ObjectId;
    createdAt: Date;
}

export interface IUser extends Document {
    googleId?: string;
    fullName: string;
    email: string;
    contact?: string;
    linkedin?: string;
    address?: string;
    password?: string;
    role: "USER" | "INSTRUCTOR" | "ADMIN";
    avatar: IAvatar;
    subscriptions: ISubscription[];
    createdCourses: ICreatedCourse[];
    forgetPasswordToken?: string;
    forgetPasswordExpiry?: Date;

    comparePassword(textPassword: string): Promise<boolean>;
    generateJwtToken(): string;
    resetPasswordToken(): Promise<string>;
    validateToken(token: string): Promise<boolean>;
}

// =============================
// 🔹 Schema
// =============================

const userSchema = new Schema<IUser>(
    {
        googleId: {
            type: String,
            unique: true,
        },

        fullName: {
            type: String,
            trim: true,
            minlength: [2, "Name is too short"],
            maxlength: [30, "Name is too long"],
            required: true,
        },

        email: {
            type: String,
            trim: true,
            unique: true,
            required: true,
            lowercase: true,
            match: [
                /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
                "Enter valid Email",
            ],
        },

        contact: {
            type: String,
            trim: true,
            default: "",
        },

        linkedin: {
            type: String,
            trim: true,
            default: "",
        },

        address: {
            type: String,
            trim: true,
            default: "",
        },

        password: {
            type: String,
            minlength: [6, "Password should have atleast 6 characters"],
            select: false,
        },

        role: {
            type: String,
            enum: ["USER", "INSTRUCTOR", "ADMIN"],
            default: "USER",
        },

        avatar: {
            public_id: {
                type: String,
                default: "",
            },
            secure_url: {
                type: String,
                default:
                    "https://res.cloudinary.com/dqtkulbwd/image/upload/v1723902171/Profile%20Picture/accfigp4wynlmdz9zajd.webp",
            },
        },

        subscriptions: [
            {
                courseId: {
                    type: String,
                    unique: true,
                },
                courseTitle: String,
                subscription_id: {
                    type: String,
                    default: "",
                },
                order_id: {
                    type: String,
                    default: "",
                },
                subscription_status: {
                    type: String,
                    default: "Inactive",
                },
                purchaseAt: Date,
                expiresAt: Date,
                paymentDetails: Object,
            },
        ],

        createdCourses: [
            {
                courseId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: courseModel,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        forgetPasswordToken: String,
        forgetPasswordExpiry: Date,
    },
    {
        timestamps: true,
        autoIndex: false,
    }
);

// =============================
// 🔹 Middleware
// =============================

userSchema.pre<IUser>("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password!, salt);
});


// =============================
// 🔹 Methods
// =============================

userSchema.methods.comparePassword = async function (
    textPassword: string
): Promise<boolean> {
    if (!this.password) return false;

    return await bcrypt.compare(textPassword, this.password);
};

userSchema.methods.generateJwtToken = function (): string {
    return JWT.sign(
        {
            id: this._id,
            fullName: this.fullName,
            email: this.email,
            role: this.role,
        },
        process.env.JWT_SECRET_KEY as string,
        {
            expiresIn: "3 days",
        }
    );
};

userSchema.methods.resetPasswordToken = async function (): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");

    const salt = await bcrypt.genSalt(10);
    this.forgetPasswordToken = await bcrypt.hash(token, salt);
    this.forgetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.save();

    return token;
};

userSchema.methods.validateToken = async function (
    token: string
): Promise<boolean> {
    const isValidToken = await bcrypt.compare(
        token,
        this.forgetPasswordToken!
    );

    const isTokenExpired =
        this.forgetPasswordExpiry &&
        this.forgetPasswordExpiry.getTime() > Date.now();

    return Boolean(isValidToken && isTokenExpired);
};

// =============================
// 🔹 Model Export (Next.js Safe)
// =============================

const userModel: Model<IUser> =
    mongoose.models.users || mongoose.model<IUser>("users", userSchema);

export default userModel;
