import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// =============================
// 🔹 Types
// =============================

interface ContactMailParams {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

// =============================
// 🔹 Read HTML Template
// =============================

function getContactMailHTML({
    name,
    email,
    phone,
    subject,
    message,
}: ContactMailParams): string {
    const filePath = path.join(
        process.cwd(),
        "src",
        "templates",
        "contactMail.html"
    );

    const html = fs.readFileSync(filePath, "utf-8");

    return html
        .replace("[UserName]", name)
        .replace("[UserEmail]", email)
        .replace("[UserPhone]", phone)
        .replace("[UserSubject]", subject)
        .replace("[UserMessage]", message);
}

// =============================
// 🔹 Nodemailer Transporter
// =============================

const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
        user: process.env.CONTACT_SENDER_EMAIL,
        pass: process.env.CONTACT_SENDER_PASSWORD,
    },
});

// =============================
// 🔹 Send Contact Mail Function
// =============================

export default async function sendContactMail(
    params: ContactMailParams
): Promise<{ success: boolean; response: string }> {
    try {
        const { name, subject } = params;

        const mailOptions = {
            from: `"${name}" <${process.env.CONTACT_SENDER_EMAIL}>`,
            to: process.env.ADMIN_EMAIL,
            subject: subject,
            html: getContactMailHTML(params),
        };

        const info = await transporter.sendMail(mailOptions);

        return {
            success: true,
            response: info.response,
        };

    } catch (error) {
        console.error(
            "Error in sending the contact email:",
            (error as Error).message
        );

        throw new Error((error as Error).message);
    }
}
