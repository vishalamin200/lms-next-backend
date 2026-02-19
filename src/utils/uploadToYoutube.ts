import { google } from "googleapis";
import { Readable } from "stream";
// ======================================================
// 🔹 OAuth2 Client Setup
// ======================================================

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_YOUTUBE_CLIENT_ID,
    process.env.GOOGLE_YOUTUBE_CLIENT_SECRET,
    process.env.GOOGLE_YOUTUBE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_YOUTUBE_REFRESH_TOKEN,
});

// ======================================================
// 🔹 YouTube Client
// ======================================================

const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
});

// ======================================================
// 🔹 Upload Video To YouTube
// ======================================================



export async function uploadToYoutube(
    buffer: Buffer,
    title: string
) {
    const response = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title,
            },
            status: {
                privacyStatus: "unlisted",
            },
        },
        media: {
            body: Readable.from(buffer),
        },
    });

    const videoId = response.data.id;

    return {
        public_id: videoId,
        secure_url: `https://www.youtube.com/watch?v=${videoId}`,
    };
}


// ======================================================
// 🔹 Delete Video From YouTube
// ======================================================

export async function deleteVideoFromYoutube(
    videoId: string
): Promise<void> {
    try {
        await youtube.videos.delete({
            id: videoId,
        });
    } catch (error) {
        console.error("Error deleting video:", error);
        throw error;
    }
}

// ======================================================
// 🔹 Update Video Title
// ======================================================

export async function updateVideoTitleFromYoutube(
    videoId: string,
    newTitle: string
): Promise<void> {
    try {
        const listResponse = await youtube.videos.list({
            part: ["snippet"],
            id: [videoId],
        });
        const { data } = listResponse;

        if (!data?.items || data.items.length === 0) {
            throw new Error("Video not found with this videoId");
        }

        const video = data.items[0];

        if (video.snippet?.title === newTitle.trim()) {
            return;
        }

        video.snippet!.title = newTitle;

        await youtube.videos.update({
            part: ["snippet"],
            requestBody: {
                id: videoId,
                snippet: video.snippet,
            },
        });

    } catch (error) {
        console.error("Error updating video title:", error);
        throw error;
    }
}
