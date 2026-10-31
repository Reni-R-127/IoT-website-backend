/**
 * File: website-backend/src/routes/admin.js
 *
 * Purpose:
 * Admin APIs for managing IoT website content.
 *
 * APIs:
 * Overview, Courses, Products, Blogs,
 * Enquiries and Reviews.
 *
 * Authentication:
 * ADMIN_API_KEY
 *
 * Database:
 * MongoDB / Mongoose
 */

import { Router } from "express";

import {
  Course,
  Product,
  Blog,
  Review,
  Enquiry,
} from "../models/Content.js";

import { requireAdmin } from "../middleware/adminKey.js";

const r = Router();


// ======================================================
// AUTHENTICATION
// All routes require Super Admin API key.
// ======================================================

r.use(requireAdmin);


// ======================================================
// COMMON HELPERS
// ======================================================

const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};


function pickFields(body, allowedFields) {
  const result = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      result[field] = body[field];
    }
  }

  return result;
}


function handleDatabaseError(error, res) {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "A record with this value already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return null;
}


// ======================================================
// PRODUCT VALIDATION
// ======================================================

const PRODUCT_FIELDS = [
  "name",
  "slug",
  "category",
  "badge",
  "tone",
  "description",
  "features",
  "audience",
  "projects",
  "price",
  "image",
  "popular",
  "active",
  "sortOrder",
];


const PRODUCT_TONES = [
  "blue",
  "green",
  "purple",
  "orange",
];


function normalizeProductPayload(body) {
  const payload = pickFields(
    body || {},
    PRODUCT_FIELDS
  );

  // Allow frontend to send imageUrl as an alias.
  if (
    payload.image === undefined &&
    typeof body?.imageUrl === "string"
  ) {
    payload.image = body.imageUrl;
  }

  if (typeof payload.name === "string") {
    payload.name = payload.name.trim();
  }

  if (typeof payload.slug === "string") {
    payload.slug = payload.slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  if (typeof payload.category === "string") {
    payload.category = payload.category.trim();
  }

  if (typeof payload.badge === "string") {
    payload.badge = payload.badge.trim();
  }

  if (typeof payload.description === "string") {
    payload.description = payload.description.trim();
  }

  if (typeof payload.image === "string") {
    payload.image = payload.image.trim();
  }

  if (Array.isArray(payload.features)) {
    payload.features = payload.features
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    payload.sortOrder !== undefined
  ) {
    payload.sortOrder = Number(payload.sortOrder);
  }

  return payload;
}


function validateProductPayload(payload, requireAll = true) {
  if (
    requireAll &&
    (
      !payload.name ||
      !payload.slug ||
      !payload.category
    )
  ) {
    return "Product name, slug and category are required.";
  }

  if (
    payload.name !== undefined &&
    (
      typeof payload.name !== "string" ||
      !payload.name.trim()
    )
  ) {
    return "Enter a valid product name.";
  }

  if (
    payload.slug !== undefined &&
    (
      typeof payload.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)
    )
  ) {
    return "Enter a valid product slug.";
  }

  if (
    payload.category !== undefined &&
    (
      typeof payload.category !== "string" ||
      !payload.category.trim()
    )
  ) {
    return "Enter a valid product category.";
  }

  if (
    payload.tone !== undefined &&
    !PRODUCT_TONES.includes(payload.tone)
  ) {
    return "Invalid product tone.";
  }

  if (
    payload.features !== undefined &&
    !Array.isArray(payload.features)
  ) {
    return "Product features must be an array.";
  }

  if (
    payload.popular !== undefined &&
    typeof payload.popular !== "boolean"
  ) {
    return "Popular must be true or false.";
  }

  if (
    payload.active !== undefined &&
    typeof payload.active !== "boolean"
  ) {
    return "Active must be true or false.";
  }

  if (
    payload.sortOrder !== undefined &&
    (
      !Number.isFinite(payload.sortOrder) ||
      payload.sortOrder < 0
    )
  ) {
    return "Sort order must be a valid non-negative number.";
  }

  return null;
}


// ======================================================
// OVERVIEW
// GET /api/admin/overview
// ======================================================

r.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [
      courses,
      products,
      blogs,
      reviews,
      enquiries,
      newEnquiries,
      enrolled,
      ratings,
    ] = await Promise.all([
      Course.countDocuments(),
      Product.countDocuments(),
      Blog.countDocuments(),
      Review.countDocuments(),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: "new" }),
      Enquiry.countDocuments({ status: "enrolled" }),

      Review.aggregate([
        {
          $match: {
            approved: true,
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.json({
      courses,
      products,
      blogs,
      reviews,
      enquiries,
      newEnquiries,
      enrolled,
      averageRating: ratings[0]?.average || 0,
      approvedReviews: ratings[0]?.count || 0,
    });
  })
);


// ======================================================
// PRODUCTS
// GET /api/admin/products
// Fetch all products including inactive products.
// ======================================================

r.get(
  "/products",
  asyncHandler(async (_req, res) => {
    const products = await Product.find()
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .lean();

    return res.json(products);
  })
);


// ======================================================
// CREATE PRODUCT
// POST /api/admin/products
// ======================================================

r.post(
  "/products",
  asyncHandler(async (req, res) => {
    const payload = normalizeProductPayload(req.body);

    const validationError = validateProductPayload(
      payload,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const existing = await Product.findOne({
      slug: payload.slug,
    }).select("_id");

    if (existing) {
      return res.status(409).json({
        message: "Product slug already exists.",
      });
    }

    const product = await Product.create(payload);

    return res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  })
);


// ======================================================
// UPDATE PRODUCT
// PUT /api/admin/products/:id
// ======================================================

r.put(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const payload = normalizeProductPayload(req.body);

    // Merge existing values with new values.
    // This avoids accidentally removing fields
    // when the frontend sends a partial update.

    const merged = {
      name: payload.name ?? existing.name,
      slug: payload.slug ?? existing.slug,
      category: payload.category ?? existing.category,
      badge: payload.badge ?? existing.badge,
      tone: payload.tone ?? existing.tone,
      description: payload.description ?? existing.description,
      features: payload.features ?? existing.features,
      audience: payload.audience ?? existing.audience,
      projects: payload.projects ?? existing.projects,
      price: payload.price ?? existing.price,
      image: payload.image ?? existing.image,
      popular: payload.popular ?? existing.popular,
      active: payload.active ?? existing.active,
      sortOrder: payload.sortOrder ?? existing.sortOrder,
    };

    const validationError = validateProductPayload(
      merged,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const duplicate = await Product.findOne({
      slug: merged.slug,
      _id: { $ne: existing._id },
    }).select("_id");

    if (duplicate) {
      return res.status(409).json({
        message: "Another product already uses this slug.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: merged,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
      message: "Product updated successfully.",
      product,
    });
  })
);


// ======================================================
// UPDATE PRODUCT STATUS
// PATCH /api/admin/products/:id/status
// ======================================================

r.patch(
  "/products/:id/status",
  asyncHandler(async (req, res) => {
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({
        message: "Active status must be true or false.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          active: req.body.active,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.json({
      message: "Product status updated successfully.",
      product,
    });
  })
);


// ======================================================
// DELETE PRODUCT
// DELETE /api/admin/products/:id
// ======================================================

r.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.json({
      message: "Product deleted successfully.",
      id: product._id,
    });
  })
);


// ======================================================
// COURSES
// ======================================================

r.get(
  "/courses",
  asyncHandler(async (_req, res) => {
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json(courses);
  })
);


r.post(
  "/courses",
  asyncHandler(async (req, res) => {
    const item = await Course.create(req.body);

    return res.status(201).json({
      message: "Course created successfully.",
      item,
    });
  })
);


r.put(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    const item = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    return res.json(item);
  })
);


r.delete(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    const item = await Course.findByIdAndDelete(
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    return res.json({
      message: "Course deleted successfully.",
    });
  })
);


// ======================================================
// BLOGS
// ======================================================

r.get(
  "/blogs",
  asyncHandler(async (_req, res) => {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json(blogs);
  })
);


r.post(
  "/blogs",
  asyncHandler(async (req, res) => {
    const item = await Blog.create({
      ...req.body,
      publishedAt: req.body?.published
        ? new Date()
        : undefined,
    });

    return res.status(201).json({
      message: "Blog created successfully.",
      item,
    });
  })
);


r.put(
  "/blogs/:id",
  asyncHandler(async (req, res) => {
    const item = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        publishedAt: req.body?.published
          ? req.body.publishedAt || new Date()
          : null,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        message: "Blog not found.",
      });
    }

    return res.json(item);
  })
);


r.delete(
  "/blogs/:id",
  asyncHandler(async (req, res) => {
    const item = await Blog.findByIdAndDelete(
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        message: "Blog not found.",
      });
    }

    return res.json({
      message: "Blog deleted successfully.",
    });
  })
);


// ======================================================
// ENQUIRIES
// ======================================================

r.get(
  "/enquiries",
  asyncHandler(async (req, res) => {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 50
      )
    );

    const [items, total] = await Promise.all([
      Enquiry.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Enquiry.countDocuments(),
    ]);

    return res.json({
      items,
      total,
      page,
      limit,
    });
  })
);


r.patch(
  "/enquiries/:id",
  asyncHandler(async (req, res) => {
    const allowedStatuses = [
      "new",
      "contacted",
      "enrolled",
      "closed",
    ];

    if (!allowedStatuses.includes(req.body?.status)) {
      return res.status(400).json({
        message: "Invalid enquiry status.",
      });
    }

    const item = await Enquiry.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: req.body.status,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        message: "Enquiry not found.",
      });
    }

    return res.json(item);
  })
);


// ======================================================
// REVIEWS
// ======================================================

r.get(
  "/reviews",
  asyncHandler(async (_req, res) => {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json(reviews);
  })
);


r.post(
  "/reviews",
  asyncHandler(async (req, res) => {
    const {
      name,
      role,
      rating,
      message,
      approved,
    } = req.body || {};

    const numericRating = Number(rating);

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof message !== "string" ||
      !message.trim() ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Valid name, message and rating are required.",
      });
    }

    const review = await Review.create({
      name: name.trim(),
      studentName: name.trim(),
      role: String(role || "Parent").trim(),
      rating: numericRating,
      message: message.trim(),
      quote: message.trim(),
      approved: approved === true,
      published: approved === true,
    });

    return res.status(201).json({
      message: "Review created successfully.",
      review,
    });
  })
);


r.patch(
  "/reviews/:id",
  asyncHandler(async (req, res) => {
    if (typeof req.body?.approved !== "boolean") {
      return res.status(400).json({
        message: "Approval status must be true or false.",
      });
    }

    const item = await Review.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          approved: req.body.approved,
          published: req.body.approved,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        message: "Review not found.",
      });
    }

    return res.json(item);
  })
);


r.delete(
  "/reviews/:id",
  asyncHandler(async (req, res) => {
    const item = await Review.findByIdAndDelete(
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        message: "Review not found.",
      });
    }

    return res.json({
      message: "Review deleted successfully.",
    });
  })
);


// ======================================================
// ERROR HANDLER
// ======================================================

r.use((error, _req, res, _next) => {
  console.error("Admin route error:", error);

  const handled = handleDatabaseError(error, res);

  if (handled) {
    return handled;
  }

  return res.status(500).json({
    message: "Admin API operation failed.",
  });
});


// ======================================================
// EXPORT
// ======================================================

export default r;