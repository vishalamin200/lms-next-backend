import axios from "axios";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import User from "@/models/user.model";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code" }, { status: 400 });
    }

    try {
        // 1️⃣ Exchange code for access token
        const tokenRes = await axios.post(
            "https://oauth2.googleapis.com/token",
            {
                code,
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            }
        );

        const { access_token } = tokenRes.data;

        // 2️⃣ Get user info
        const userRes = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        const googleUser = userRes.data;

        await connectDB();

        // 3️⃣ Find or Create User
        let user = await User.findOne({ email: googleUser.email });

        if (!user) {
            user = await User.create({
                fullName: googleUser.name,
                email: googleUser.email,
                avatar:{
                    secure_url: googleUser.picture,
                    public_id:""
                },
                googleId: googleUser.id
                
            });
        }

        // 4️⃣ Create JWT
        const token = user.generateJwtToken();

        // 5️⃣ Set Cookie (CROSS ORIGIN IMPORTANT)
        (await cookies()).set("token", token, {
            httpOnly: true,
            secure: true,          // MUST be true in production (HTTPS)
            sameSite: "none",      // REQUIRED for cross-origin
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        // 6️⃣ Redirect back to React frontend
        return NextResponse.redirect(
            `${process.env.CLIENT_URL}/auth-login/success`
        );

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
    }
}