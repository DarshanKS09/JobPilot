import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const jobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    jobLink: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    normalizedJobLink: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 2048,
    },
    status: {
      type: String,
      enum: ["applied", "interview", "rejected"],
      default: "applied",
      index: true,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
  },
  {
    timestamps: true,
  },
);

jobSchema.index({ userId: 1, appliedDate: -1 });
jobSchema.index({ userId: 1, status: 1, appliedDate: -1 });
jobSchema.index(
  { userId: 1, normalizedJobLink: 1 },
  {
    unique: true,
  },
);

export type JobDocument = InferSchemaType<typeof jobSchema> & {
  _id: Types.ObjectId;
};

export const Job = models.Job || model("Job", jobSchema);
