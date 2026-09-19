import { z } from "zod";
import { ITEM_TYPES } from "../constants/status";
import { BRANCHES } from "../constants/branches";

export const orderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Customer name is required"),
    contactNo: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]*$/, "Invalid contact number format")
      .optional()
      .or(z.literal("")),
    itemType: z
      .string({ required_error: "Please select or enter an item type" })
      .trim()
      .min(1, "Item type is required"),
    description: z.string().trim().optional().or(z.literal("")),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1"),
    totalPrice: z.coerce
      .number()
      .min(0, "Total price cannot be negative"),
    advancePaid: z.coerce
      .number()
      .min(0, "Advance paid cannot be negative")
      .default(0),
    orderDate: z.string().optional(),
    deliveryDeadline: z.string().min(1, "Delivery deadline is required"),
    branch: z.enum(BRANCHES).default("Main Office"),
    mainOfficeShare: z.coerce.number().min(0).optional(),
    branchShare: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.advancePaid <= data.totalPrice, {
    message: "Advance paid cannot exceed total price",
    path: ["advancePaid"],
  });
