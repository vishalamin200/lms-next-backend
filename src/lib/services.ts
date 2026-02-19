

import { v2 as cloudinary } from "cloudinary";
import Razorpay from "razorpay";

// ✅ Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// ✅ Configure Razorpay



export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_SECRET_KEY!,
});

export { cloudinary };
