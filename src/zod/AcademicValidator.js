import { z } from "zod";

export const sslcSchema = z.object({
	school: z.string().min(1, "School name is required"),
	percentage: z.number().positive().max(100),
	yearOfPassing: z.number().positive().int(),
	schoolAddress: z.string().min(1, "School address is required"),
	board: z.string().min(1, "Board name is required"),
});

export const pucSchema = z.object({
	college: z.string().min(1, "College name is required"),
	percentage: z.number().positive().max(100),
	yearOfPassing: z.number().positive().int(),
	collegeAddress: z.string().min(1, "College address is required"),
	board: z.string().min(1, "Board name is required"),
});

export const localEntrySchema = z.object({
	college: z.string().min(1, "College name is required"),
	percentage: z.number().positive().max(100),
	yearOfPassing: z.number().positive().int(),
	collegeAddress: z.string().min(1, "College address is required"),
	board: z.string().min(1, "Board name is required"),
});

export const AcademicSchema = z.object({
	sslc: sslcSchema,
	puc: pucSchema,
	localEntry: localEntrySchema.optional(),
});
