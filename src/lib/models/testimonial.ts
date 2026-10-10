import { Schema, model, models, type InferSchemaType, type Model, type Types } from "mongoose";

/* ------------------------------------------------------------------ */
/* Testimonial: kind words from viewers and students outside the       */
/* booking flow, e.g. YouTube comments or messages the creator received */
/* ------------------------------------------------------------------ */

const TestimonialSchema = new Schema(
  {
    source: { type: String, enum: ["youtube", "manual"], required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    /** Where it was said, shown under the name (e.g. "Instagram DM", "LinkedIn"). */
    via: { type: String, trim: true, maxlength: 60, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 1200 },
    rating: { type: Number, min: 1, max: 5 },
    videoId: { type: String, trim: true, match: /^[\w-]{11}$/ },
    videoTitle: { type: String, trim: true, maxlength: 200 },
    /** YouTube comment id, so an import never adds the same comment twice. */
    commentId: { type: String, trim: true, maxlength: 120 },
    likes: { type: Number, default: 0 },
    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);
TestimonialSchema.index({ commentId: 1 }, { unique: true, sparse: true });
TestimonialSchema.index({ status: 1, featured: -1, likes: -1 });
export type TestimonialDoc = InferSchemaType<typeof TestimonialSchema> & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Testimonial: Model<InferSchemaType<typeof TestimonialSchema>> = models.Testimonial || model("Testimonial", TestimonialSchema);
