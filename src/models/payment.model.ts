import mongoose, { Schema, Document, Model } from "mongoose";

// =============================
// 🔹 Interface
// =============================

export interface IPayment extends Document {
    payment_id: string;
    subscription_id: string;
    signature: string;
    createdAt: Date;
    updatedAt: Date;
}

// =============================
// 🔹 Schema
// =============================

const paymentSchema = new Schema<IPayment>(
    {
        payment_id: {
            type: String,
            required: [true, "Payment Id Required"],
        },

        subscription_id: {
            type: String,
            required: [true, "Subscription Id Required"],
        },

        signature: {
            type: String,
            required: [true, "Signature Required"],
        },
    },
    {
        timestamps: true,
        autoIndex: false,
    }
);

// =============================
// 🔹 Safe Model Export (Next.js Important)
// =============================

const paymentModel: Model<IPayment> =
    mongoose.models.Payments ||
    mongoose.model<IPayment>("Payments", paymentSchema);

export default paymentModel;
