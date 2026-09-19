import { z } from "zod";
import { BRANCHES } from "../constants/branches";

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]*$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  department: z.string().trim().optional().or(z.literal("")),
  designation: z.string().trim().optional().or(z.literal("")),
  branch: z
    .enum(BRANCHES, {
      errorMap: () => ({ message: "Please select a valid branch" }),
    })
    .nullable()
    .optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});
