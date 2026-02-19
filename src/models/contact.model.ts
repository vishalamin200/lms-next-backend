import mongoose, { Schema, Document, Model } from "mongoose";

// =============================
// 🔹 Interface
// =============================

export interface IContact extends Document {
    name?: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// =============================
// 🔹 Schema
// =============================

const contactSchema = new Schema<IContact>(
    {
        name: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            lowercase: true,
            required: true,
            match: [
                /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
                "Enter valid Email",
            ],
        },

        phone: {
            type: String,
            required: true,
        },

        subject: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
            trim: true,
        },

        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// =============================
// 🔹 Safe Model Export (IMPORTANT for Next.js)
// =============================

const contactModel: Model<IContact> =
    mongoose.models.Contacts ||
    mongoose.model<IContact>("Contacts", contactSchema);

export default contactModel;
