import { z } from "zod";

const toPositiveInt = (value, fieldName) =>
	z.preprocess(
		(arg) => {
			if (typeof arg === "string") return parseInt(arg, 10);
			return arg;
		},
		z.number().refine((val) => Number.isInteger(val) && val > 0, {
			message: `${fieldName} must be a positive integer`,
		})
	);

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
	collegeId: toPositiveInt("collegeId", "College ID"),
	collegeCode: z.string().trim().toUpperCase().optional(),
	documentsSubmitted: z.array(z.string()).optional(),
	branchChange: z
		.object({
			year: toPositiveInt("year", "Year").optional(),
			branch: z.string().min(1).optional(),
			usn: z.string().min(1).optional(),
			collegeId: toPositiveInt("collegeId", "College ID").optional(),
			collegeCode: z.string().trim().toUpperCase().optional(),
		})
		.optional(),
});

export default AdmissionSchema;
