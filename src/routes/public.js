/**
 * File: website-backend/src/routes/public.js
 *
 * Purpose:
 * Public API routes for the IoT website.
 *
 * APIs:
 * Courses, products, blogs, pricing, projects,
 * reviews, testimonials, enquiries, WhatsApp tracking.
 *
 * Database:
 * MongoDB using Mongoose.
 *
 * Security:
 * - Only active products/courses/projects are public.
 * - Only published blogs are public.
 * - Only approved reviews/testimonials are public.
 * - Public submissions are validated.
 */

import { Router } from "express";

import {
  Course,
  Product,
  Blog,
  PricingPlan,
  ProjectLab,
  Review,
  Enquiry,
  Notification,
} from "../models/Content.js";

import { sendMail } from "../services/mail.js";

const r = Router();


// ======================================================
// COURSES
// GET /api/courses
// ======================================================

r.get("/courses", async (_req, res, next) => {
  try {
    const courses = await Course.find({
      active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(courses);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// PRODUCTS / IOT KITS
// GET /api/products
// ======================================================

r.get("/products", async (_req, res, next) => {
  try {
    const products = await Product.find({
      active: true,
    })
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// BLOGS
// GET /api/blogs
// ======================================================

r.get("/blogs", async (_req, res, next) => {
  try {
    const blogs = await Blog.find({
      published: true,
    })
      .sort({
        publishedAt: -1,
        createdAt: -1,
      })
      .lean();

    return res.json(blogs);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// SINGLE BLOG
// GET /api/blogs/:slug
// ======================================================

r.get("/blogs/:slug", async (req, res, next) => {
  try {
    const item = await Blog.findOne({
      slug: req.params.slug,
      published: true,
    }).lean();

    if (!item) {
      return res.status(404).json({
        message: "Blog not found.",
      });
    }

    return res.json(item);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// PRICING
// GET /api/pricing
// ======================================================

r.get("/pricing", async (_req, res, next) => {
  try {
    const plans = await PricingPlan.find({
      active: true,
    })
      .sort({
        order: 1,
        createdAt: -1,
      })
      .limit(3)
      .lean();

    return res.json(plans);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// PROJECTS
// GET /api/projects
// ======================================================

r.get("/projects", async (_req, res, next) => {
  try {
    const projects = await ProjectLab.find({
      active: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(projects);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// APPROVED REVIEWS
// GET /api/reviews
// ======================================================

r.get("/reviews", async (_req, res, next) => {
  try {
    const reviews = await Review.find({
      approved: true,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// APPROVED TESTIMONIALS
// GET /api/testimonials
// ======================================================

r.get("/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await Review.find({
      approved: true,
    })
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json(testimonials);
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// WHATSAPP CLICK TRACKING
// POST /api/whatsapp-click
// ======================================================

r.post("/whatsapp-click", async (req, res, next) => {
  try {
    const source = String(
      req.body?.source || "Unknown website section"
    )
      .trim()
      .slice(0, 120);

    const page = String(
      req.body?.page || ""
    ).slice(0, 200);

    const itemName = String(
      req.body?.item || ""
    ).slice(0, 150);

    const notification = await Notification.create({
      type: "whatsapp",
      title: "WhatsApp CTA clicked",
      source,
      message:
        `Visitor clicked WhatsApp from ${source}. ` +
        "This records a click, not confirmation that a message was sent.",

      metadata: {
        page,
        item: itemName,
      },
    });

    return res.status(201).json({
      ok: true,
      id: notification._id,
    });
  } catch (error) {
    return next(error);
  }
});


// ======================================================
// ENQUIRY SUBMISSION
// POST /api/enquiries
// ======================================================

r.post("/enquiries", async (req, res, next) => {
  try {
    const {
      parentName,
      childName,
      childAge,
      phone,
      email,
      course,
      message,
      source,
    } = req.body || {};


    // ----------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ----------------------------------------------

    if (
      !parentName ||
      !phone ||
      !email ||
      !course
    ) {
      return res.status(400).json({
        message:
          "Parent name, phone, email and course are required.",
      });
    }


    // ----------------------------------------------
    // PHONE VALIDATION
    // ----------------------------------------------

    const normalizedPhone = String(phone).trim();

    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        message:
          "Enter a valid 10-digit Indian mobile number.",
      });
    }


    // ----------------------------------------------
    // EMAIL VALIDATION
    // ----------------------------------------------

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }


    // ----------------------------------------------
    // CHILD AGE VALIDATION
    // ----------------------------------------------

    let normalizedAge;

    if (
      childAge !== undefined &&
      childAge !== null &&
      childAge !== ""
    ) {
      normalizedAge = Number(childAge);

      if (
        !Number.isInteger(normalizedAge) ||
        normalizedAge < 1 ||
        normalizedAge > 18
      ) {
        return res.status(400).json({
          message: "Child age must be between 1 and 18.",
        });
      }
    }


    // ----------------------------------------------
    // SAVE ENQUIRY
    // ----------------------------------------------

    const safeSource = String(
      source || "Contact form"
    ).slice(0, 120);

    const enquiry = await Enquiry.create({
      parentName: String(parentName)
        .trim()
        .slice(0, 120),

      childName: String(childName || "")
        .trim()
        .slice(0, 120),

      childAge: normalizedAge,

      phone: normalizedPhone,

      email: normalizedEmail,

      course: String(course)
        .trim()
        .slice(0, 160),

      message: String(message || "")
        .trim()
        .slice(0, 3000),

      source: safeSource,
    });


    // ----------------------------------------------
    // CREATE NOTIFICATION
    // ----------------------------------------------

    await Notification.create({
      type: "enquiry",
      title: "New course enquiry",
      source: safeSource,

      message:
        `New enquiry from ${enquiry.parentName} ` +
        `for ${enquiry.course}.`,

      metadata: {
        enquiryId: String(enquiry._id),
        email: enquiry.email,
        phone: enquiry.phone,
      },
    });


    // ----------------------------------------------
    // EMAIL NOTIFICATIONS
    // ----------------------------------------------

    const summary =
      `New course enquiry\n` +
      `Source section: ${safeSource}\n` +
      `Parent: ${enquiry.parentName}\n` +
      `Child: ${enquiry.childName || "Not provided"}\n` +
      `Age: ${normalizedAge || "Not provided"}\n` +
      `Phone: ${enquiry.phone}\n` +
      `Email: ${enquiry.email}\n` +
      `Course: ${enquiry.course}\n` +
      `Message: ${enquiry.message || "—"}\n` +
      `Enquiry ID: ${enquiry._id}`;

    const mailTasks = [];

    if (process.env.ADMIN_EMAIL) {
      mailTasks.push(
        sendMail({
          to: process.env.ADMIN_EMAIL,
          subject:
            `New course enquiry: ${enquiry.course}`,
          text: summary,
        })
      );
    }

    mailTasks.push(
      sendMail({
        to: enquiry.email,
        subject: "We received your course enquiry",

        text:
          `Hi ${enquiry.parentName},\n\n` +
          `Thank you for enquiring about ${enquiry.course}. ` +
          "Our team has received your details and will contact you soon.\n\n" +
          "Regards,\nTechSprout Kids",
      })
    );

    // Email failure should not undo a saved enquiry.
    await Promise.allSettled(mailTasks);


    // ----------------------------------------------
    // SUCCESS RESPONSE
    // ----------------------------------------------

    return res.status(201).json({
      message: "Enquiry submitted successfully.",
      id: enquiry._id,
    });

  } catch (error) {
    return next(error);
  }
});


// ======================================================
// PUBLIC REVIEW SUBMISSION
// POST /api/reviews
// New reviews require Admin approval.
// ======================================================

r.post("/reviews", async (req, res, next) => {
  try {
    const {
      name,
      role,
      rating,
      message,
    } = req.body || {};

    const score = Number(rating);

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof message !== "string" ||
      !message.trim() ||
      !Number.isInteger(score) ||
      score < 1 ||
      score > 5
    ) {
      return res.status(400).json({
        message:
          "Name, message and a rating from 1 to 5 are required.",
      });
    }

    const item = await Review.create({
      name: name.trim().slice(0, 120),

      studentName: name.trim().slice(0, 120),

      role: String(role || "Parent")
        .trim()
        .slice(0, 80),

      rating: score,

      message: message.trim().slice(0, 2000),

      quote: message.trim().slice(0, 2000),

      approved: false,
      published: false,
    });

    return res.status(201).json({
      message: "Review submitted for approval.",
      id: item._id,
    });

  } catch (error) {
    return next(error);
  }
});


export default r;