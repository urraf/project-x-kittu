import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";
import { CoverImageSchema } from "./store";

/* ------------------------------------------------------------------ */
/* Opportunity: internships, scholarships, fellowships, programs…      */
/* ------------------------------------------------------------------ */

const OpportunitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 130 },
    type: { type: String, required: true, trim: true, maxlength: 40 },
    organization: { type: String, trim: true, maxlength: 140, default: "" },
    country: { type: String, trim: true, maxlength: 60, default: "Japan" },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    funding: { type: String, trim: true, maxlength: 40, default: "fully-funded" },
    /** End of the application window (stored as the end of that day in IST). Null = rolling / not announced. */
    deadline: Date,
    rolling: { type: Boolean, default: false },
    /** Free text, e.g. "June–August 2027" or "2 years". */
    period: { type: String, trim: true, maxlength: 80, default: "" },
    degreeLevels: { type: [{ type: String, trim: true, maxlength: 30 }], default: [] },
    fields: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    summary: { type: String, trim: true, maxlength: 320, default: "" },
    description: { type: String, trim: true, maxlength: 6000, default: "" },
    eligibility: { type: String, trim: true, maxlength: 3000, default: "" },
    benefits: { type: String, trim: true, maxlength: 3000, default: "" },
    applyUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    sourceUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    coverImage: { type: CoverImageSchema, default: undefined },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);
OpportunitySchema.index({ status: 1, deadline: 1 });
OpportunitySchema.index({ status: 1, type: 1, country: 1, funding: 1 });
export type OpportunityDoc = InferSchemaType<typeof OpportunitySchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Opportunity: Model<InferSchemaType<typeof OpportunitySchema>> = models.Opportunity || model("Opportunity", OpportunitySchema);
