/* Card templates — ported from app.jsx. */
import type { Priority } from "@/types";

export interface Template {
  id: string;
  name: string;
  icon: string;
  pri: Priority;
  title: string;
  desc: string;
  subs: string[];
}

export const TEMPLATES: Template[] = [
  { id: "bug", name: "Bug report", icon: "🐞", pri: "high", title: "Bug: ", desc: "**Steps to reproduce**\n1. \n2. \n\n**Expected:** \n**Actual:** ", subs: ["Reproduce", "Find root cause", "Fix", "Add a test", "Verify & close"] },
  { id: "feature", name: "Feature", icon: "✨", pri: "med", title: "Build: ", desc: "**Goal**\n\n**Acceptance criteria**\n- ", subs: ["Spec & design", "Implement", "Review", "QA", "Ship"] },
  { id: "meeting", name: "Meeting", icon: "📅", pri: "med", title: "Meeting: ", desc: "**Agenda**\n- \n\n**Notes**\n", subs: ["Set agenda", "Send invite", "Take notes", "Share action items"] },
  { id: "review", name: "Design review", icon: "🎨", pri: "med", title: "Review: ", desc: "**What to review**\n\n**Feedback**\n- ", subs: ["Collect material", "Gather feedback", "Summarize", "Follow up"] },
  { id: "content", name: "Content / post", icon: "✍️", pri: "low", title: "Write: ", desc: "**Outline**\n- \n\n**Draft**\n", subs: ["Outline", "Draft", "Edit", "Publish"] },
  { id: "errand", name: "Errand", icon: "🛒", pri: "low", title: "", desc: "", subs: [] },
  { id: "blank", name: "Blank task", icon: "➕", pri: "med", title: "", desc: "", subs: [] },
  { id: "doc", name: "Create a doc", icon: "📄", pri: "med", title: "Doc: ", desc: "**Purpose**\n\n**Outline**\n- \n\n**Owner / reviewers**\n", subs: ["Draft outline", "Write first pass", "Get review", "Finalize & share"] },
  { id: "access", name: "Request / access", icon: "🔑", pri: "med", title: "Request: ", desc: "**What's needed**\n\n**Why / context**\n\n**Approver**\n", subs: ["Submit request", "Await approval", "Confirm access works"] },
  { id: "decision", name: "Decision", icon: "⚖️", pri: "high", title: "Decide: ", desc: "**Decision to make**\n\n**Options**\n1. \n2. \n\n**Recommendation**\n", subs: ["Frame the question", "List options", "Gather input", "Decide & document"] },
  { id: "research", name: "Research / spike", icon: "🔎", pri: "med", title: "Research: ", desc: "**Question**\n\n**Findings**\n- \n\n**Conclusion**\n", subs: ["Define question", "Investigate", "Summarize findings", "Share recommendation"] },
];
