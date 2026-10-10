import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { CoverImageSchema } from "./store";

/* ------------------------------------------------------------------ */
/* University: Japanese universities, with verified program details     */
/* ------------------------------------------------------------------ */

const ProgramSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    degree: { type: String, enum: ["bachelor", "master", "phd", "research", "exchange"], default: "master" },
    field: { type: String, trim: true, maxlength: 80, default: "" },
    /** "english" = fully English-taught, "mixed" = partly, "japanese" = Japanese-taught */
    language: { type: String, enum: ["english", "mixed", "japanese"], default: "english" },
    intake: { type: String, trim: true, maxlength: 60, default: "" },
    url: { type: String, trim: true, maxlength: 2048, default: "" },
    notes: { type: String, trim: true, maxlength: 400, default: "" },
  },
  { _id: true },
);

const UniversitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 140 },
    nameJa: { type: String, trim: true, maxlength: 120, default: "" },
    type: { type: String, enum: ["national", "public", "private"], required: true },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    website: { type: String, trim: true, maxlength: 2048, default: "" },
    summary: { type: String, trim: true, maxlength: 400, default: "" },
    strengths: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    programs: { type: [ProgramSchema], default: [] },
    scholarships: { type: String, trim: true, maxlength: 3000, default: "" },
    coverImage: { type: CoverImageSchema, default: undefined },
    /** Set when an admin has checked the program details against official sources. */
    lastVerifiedAt: Date,
    status: { type: String, enum: ["draft", "published"], default: "published" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
UniversitySchema.index({ status: 1, type: 1, name: 1 });
export type UniversityDoc = InferSchemaType<typeof UniversitySchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const University: Model<InferSchemaType<typeof UniversitySchema>> = models.University || model("University", UniversitySchema);
