import { z } from "zod";

export const createMuseumSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  username: z.string().trim().toLowerCase().min(3, "Username must be at least 3 characters").max(32, "Username is too long").regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  title: z.string().trim().min(2, "Enter a museum title").max(100, "Title is too long"),
  requiredExhibits: z.coerce.number().int().min(1, "At least 1 exhibit is required").max(100, "Maximum is 100 exhibits").default(5),
});

export const updateMuseumDetailsSchema = createMuseumSchema.pick({
  name: true,
  username: true,
  title: true,
}).strict();

export type CreateMuseumInput = z.infer<typeof createMuseumSchema>;
export type UpdateMuseumDetailsInput = z.infer<typeof updateMuseumDetailsSchema>;
