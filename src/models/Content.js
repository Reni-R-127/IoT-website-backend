/**
 * File: website-backend/src/models/Content.js
 *
 * Purpose:
 * Mongoose schemas and model exports for website content.
 *
 * Models:
 * Course, Product, Blog, PricingPlan, ProjectLab,
 * Review, Enquiry, Notification.
 *
 * Database:
 * MongoDB
 *
 * Security:
 * Private fields must not be exposed through public APIs.
 */

import mongoose from "mongoose";


// ======================================================
// COURSE MODEL
// ======================================================

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
    },

    ageRange: {
      type: String,
      default: "",
    },

    duration: {
      type: String,
      default: "",
    },

    level: {
      type: String,
      default: "Beginner",
    },

    price: {
      type: String,
      default: "Contact us",
    },

    image: {
      type: String,
      default: "",
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


// ======================================================
// PRODUCT / IOT KIT MODEL
// ======================================================

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      default: "Other",
    },

    badge: {
      type: String,
      default: "",
      trim: true,
    },

    tone: {
      type: String,
      enum: ["blue", "green", "purple", "orange"],
      default: "blue",
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    features: {
      type: [String],
      default: [],
    },

    audience: {
      type: String,
      default: "",
      trim: true,
    },

    projects: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: String,
      default: "Contact us",
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    popular: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// ======================================================
// BLOG MODEL
// ======================================================

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      default: "IoT",
    },

    excerpt: {
      type: String,
      default: "",
    },

    content: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    published: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);


// ======================================================
// PRICING PLAN MODEL
// ======================================================

const pricingPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: String,
      required: true,
    },

    features: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// ======================================================
// PROJECT LAB MODEL
// ======================================================

const projectLabSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    technologies: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


// ======================================================
// REVIEW / STUDENT TESTIMONIAL MODEL
// ======================================================

const reviewSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      trim: true,
      default: "",
    },

    course: {
      type: String,
      trim: true,
      default: "",
    },

    kit: {
      type: String,
      trim: true,
      default: "",
    },

    quote: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },

    duration: {
      type: String,
      trim: true,
      default: "",
    },

    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Legacy compatibility fields
    videoURL: {
      type: String,
      trim: true,
      default: "",
    },

    video: {
      type: String,
      trim: true,
      default: "",
    },

    thumbnailImage: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    approved: {
      type: Boolean,
      default: false,
    },

    published: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


// ======================================================
// ENQUIRY MODEL
// ======================================================

const enquirySchema = new mongoose.Schema(
  {
    parentName: {
      type: String,
      required: true,
      trim: true,
    },

    childName: {
      type: String,
      default: "",
    },

    childAge: {
      type: Number,
      min: 1,
      max: 18,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["new", "contacted", "enrolled", "closed"],
      default: "new",
    },

    source: {
      type: String,
      default: "website",
    },
  },
  { timestamps: true }
);


// ======================================================
// NOTIFICATION MODEL
// ======================================================

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["enquiry", "whatsapp", "system"],
      default: "enquiry",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      default: "website",
    },

    section: {
      type: String,
      default: "",
    },

    read: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);


// ======================================================
// MODEL EXPORTS
// Reuse existing models to avoid OverwriteModelError.
// ======================================================

export const Course =
  mongoose.models.Course ||
  mongoose.model("Course", courseSchema);

export const Product =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export const Blog =
  mongoose.models.Blog ||
  mongoose.model("Blog", blogSchema);

export const PricingPlan =
  mongoose.models.PricingPlan ||
  mongoose.model("PricingPlan", pricingPlanSchema);

export const ProjectLab =
  mongoose.models.ProjectLab ||
  mongoose.model("ProjectLab", projectLabSchema);

export const Review =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);

export const Enquiry =
  mongoose.models.Enquiry ||
  mongoose.model("Enquiry", enquirySchema);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);