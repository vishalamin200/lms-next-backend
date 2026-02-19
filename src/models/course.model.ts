import mongoose, {
    Schema,
    Document,
    Model,
    Types,
} from "mongoose";

// =============================
// 🔹 Interfaces
// =============================

interface IThumbnail {
    public_id?: string;
    secure_url?: string;
}

interface IVideo {
    public_id?: string | null;
    secure_url?: string | null;
}

interface ILecture {
    title: string;
    description: string;
    thumbnail?: IThumbnail;
    video?: IVideo;
    youtubeLink?: string;
}

interface IRating {
    userId: Types.ObjectId;
    value: number;
}

export interface ICourse extends Document {
    topic: string;
    description: string;
    category: string;
    rating: number;
    allRatings: IRating[];
    price: number;
    discount: number;
    level?: string;
    language?: string;
    thumbnail?: IThumbnail;
    lectures: ILecture[];
    noOfLectures: number;
    createdBy?: string;
    creatorEmail?: string;
}

// =============================
// 🔹 Schema
// =============================

const courseSchema = new Schema<ICourse>(
    {
        topic: {
            type: String,
            trim: true,
            required: [true, "Topic is Required"],
            minlength: [5, "Topic Should have atleast 5 Characters"],
            maxlength: [60, "Topic Must be Less than 60 Characters"],
        },

        description: {
            type: String,
            trim: true,
            required: [true, "Description is Required"],
            minlength: [10, "Description Should have atleast 10 characters"],
        },

        category: {
            type: String,
            required: [true, "Category is Required"],
        },

        rating: {
            type: Number,
            default: 0,
        },

        allRatings: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "users",
                    required: true,
                },
                value: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            },
        ],

        price: {
            type: Number,
            default: 0,
        },

        discount: {
            type: Number,
            default: 0,
        },

        level: {
            type: String,
        },

        language: {
            type: String,
        },

        thumbnail: {
            public_id: String,
            secure_url: String,
        },

        lectures: [
            {
                title: {
                    type: String,
                    trim: true,
                    required: [true, "Title is Required"],
                },
                description: {
                    type: String,
                    trim: true,
                },
                thumbnail: {
                    public_id: String,
                    secure_url: String,
                },
                video: {
                    public_id: {
                        type: String,
                        default: null,
                    },
                    secure_url: {
                        type: String,
                        default: null,
                    },
                },
                youtubeLink: {
                    type: String,
                    default: "",
                    trim: true,
                },
            },
        ],

        noOfLectures: {
            type: Number,
            default: 0,
        },

        createdBy: {
            type: String,
            trim: true,
        },

        creatorEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
    },
    {
        timestamps: true,
        autoIndex: false,
    }
);

// =============================
// 🔹 Pre Save Middleware
// =============================

courseSchema.pre<ICourse>("save", function () {
    this.noOfLectures = this.lectures?.length || 0;

    if (this.category) {
        this.category = this.category
            .trim()
            .replace(/\s+/g, "-")
            .toLowerCase();
    }
});


// =============================
// 🔹 Post Save Middleware (Recalculate Rating)
// =============================

courseSchema.post("save", async function (document: ICourse, next) {
    try {
        const numberOfRatings = document.allRatings.length;

        const sumOfAllRatings = document.allRatings.reduce(
            (sum, rating) => sum + rating.value,
            0
        );

        const newAverageRating =
            Math.round(
                (numberOfRatings > 0
                    ? sumOfAllRatings / numberOfRatings
                    : 0) * 10
            ) / 10;

        if (document.rating !== newAverageRating) {
            document.rating = newAverageRating;
            await document.save();
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

// =============================
// 🔹 Safe Model Export (IMPORTANT for Next.js)
// =============================

const courseModel: Model<ICourse> =
    mongoose.models.Courses ||
    mongoose.model<ICourse>("Courses", courseSchema);

export default courseModel;
