import { Router } from "express";
import { Course, Blog, PricingPlan, ProjectLab, Review, Enquiry, Notification } from "../models/Content.js";
import { sendMail } from "../services/mail.js";

const r = Router();

r.get("/courses", async (_req, res, next) => {
  try { res.json(await Course.find({ active: true }).sort({ createdAt: -1 }).lean()); } catch (e) { next(e); }
});
r.get("/blogs", async (_req, res, next) => {
  try { res.json(await Blog.find({ published: true }).sort({ publishedAt: -1, createdAt: -1 }).lean()); } catch (e) { next(e); }
});
r.get("/blogs/:slug", async (req, res, next) => {
  try { const item = await Blog.findOne({ slug: req.params.slug, published: true }).lean(); if (!item) return res.status(404).json({ message: "Blog not found." }); res.json(item); } catch (e) { next(e); }
});
r.get("/pricing", async (_req, res, next) => {
  try { res.json(await PricingPlan.find({ active: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(3).lean()); } catch (e) { next(e); }
});
r.get("/projects", async (_req, res, next) => {
  try { res.json(await ProjectLab.find({ active: true }).sort({ createdAt: -1 }).lean()); } catch (e) { next(e); }
});
r.get("/reviews", async (_req, res, next) => {
  try { res.json(await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(3).lean()); } catch (e) { next(e); }
});

r.post("/whatsapp-click", async (req, res, next) => {
  try {
    const source = String(req.body?.source || "Unknown website section").slice(0, 120);
    const item = await Notification.create({
      type: "whatsapp_click",
      source,
      message: `Visitor clicked WhatsApp from ${source}. This records a click, not confirmation that a message was sent.`,
      metadata: { page: String(req.body?.page || "").slice(0, 200), item: String(req.body?.item || "").slice(0, 150) },
    });
    res.status(201).json({ ok: true, id: item._id });
  } catch (e) { next(e); }
});

r.post("/enquiries", async (req, res, next) => {
  try {
    const { parentName, childName, childAge, phone, email, course, message, source } = req.body || {};
    if (!parentName || !phone || !email || !course) return res.status(400).json({ message: "Parent name, phone, email and course are required." });
    if (!/^[6-9]\d{9}$/.test(String(phone))) return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ message: "Enter a valid email address." });
    const safeSource = String(source || "Contact form").slice(0, 120);
    const enquiry = await Enquiry.create({
      parentName: String(parentName).trim().slice(0, 120),
      childName: String(childName || "").trim().slice(0, 120),
      childAge: childAge ? Number(childAge) : undefined,
      phone: String(phone),
      email: normalizedEmail,
      course: String(course).trim().slice(0, 160),
      message: String(message || "").trim().slice(0, 3000),
      source: safeSource,
      channel: "website",
    });
    await Notification.create({
      type: "enquiry",
      source: safeSource,
      message: `New enquiry from ${enquiry.parentName} for ${enquiry.course}.`,
      phone: enquiry.phone,
      metadata: { enquiryId: String(enquiry._id), email: enquiry.email },
    });
    const summary = `New course enquiry\nSource section: ${safeSource}\nParent: ${enquiry.parentName}\nChild: ${enquiry.childName || "Not provided"}\nAge: ${childAge || "Not provided"}\nPhone: ${enquiry.phone}\nEmail: ${enquiry.email}\nCourse: ${enquiry.course}\nMessage: ${enquiry.message || "—"}\nEnquiry ID: ${enquiry._id}`;
    const mailTasks = [];
    if (process.env.ADMIN_EMAIL) mailTasks.push(sendMail({ to: process.env.ADMIN_EMAIL, subject: `New course enquiry: ${enquiry.course}`, text: summary }));
    mailTasks.push(sendMail({ to: enquiry.email, subject: "We received your course enquiry", text: `Hi ${enquiry.parentName},\n\nThank you for enquiring about ${enquiry.course}. Our team has received your details and will contact you soon.\n\nRegards,\nTechSprout Kids` }));
    await Promise.allSettled(mailTasks);
    res.status(201).json({ message: "Enquiry submitted successfully.", id: enquiry._id });
  } catch (e) { next(e); }
});

r.post("/reviews", async (req, res, next) => {
  try {
    const { name, role, rating, message } = req.body || {};
    const score = Number(rating);
    if (!name || !message || !Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ message: "Name, message and a rating from 1 to 5 are required." });
    const item = await Review.create({ name: String(name).trim().slice(0, 120), role: String(role || "Parent").slice(0, 80), rating: score, message: String(message).trim().slice(0, 2000), approved: false });
    res.status(201).json({ message: "Review submitted for approval.", id: item._id });
  } catch (e) { next(e); }
});
export default r;
