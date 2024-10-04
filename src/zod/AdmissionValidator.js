import { z } from "zod";

export const AdmissionSchema = z.object({
	admissionYear: z.preprocess(
		(arg) => {
			if (typeof arg === "string") return parseInt(arg, 10);
			return arg;
		},
		z.number().refine((val) => Number.isInteger(val) && val > 0, {
			message: "Admission year must be a positive integer",
		})
	),
	branch: z.string().min(1),
	semester: z.string().min(1),
	admissionType: z.string().min(1), // Add validation for admissionType
	category: z.string().min(1), // Add validation for category
	usn: z.string().min(1),
	collegeID: z.preprocess(
		(arg) => {
			if (typeof arg === "string") return parseInt(arg, 10);
			return arg;
		},
		z.number().refine((val) => Number.isInteger(val) && val > 0, {
			message: "College ID must be a positive integer",
		})
	),
	documentsSubmitted: z.array(z.string()).optional(),
	changeOfBranch: z
		.object({
			year: z
				.preprocess(
					(arg) => {
						if (typeof arg === "string") return parseInt(arg, 10);
						return arg;
					},
					z.number().refine((val) => Number.isInteger(val) && val > 0, {
						message: "Year must be a positive integer",
					})
				)
				.optional(),
			newBranch: z.string().min(1).optional(),
			usn: z.string().min(1).optional(),
			collegeID: z
				.preprocess(
					(arg) => {
						if (typeof arg === "string") return parseInt(arg, 10);
						return arg;
					},
					z.number().refine((val) => Number.isInteger(val) && val > 0, {
						message: "College ID must be a positive integer",
					})
				)
				.optional(),
		})
		.optional(),
});

export default AdmissionSchema;
