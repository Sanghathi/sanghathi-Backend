import { ParentDetails } from '../../models/Student/ParentDetails.js'; // Named import

export const createParentDetails = async (req, res) => {
    try {
        const parentDetails = new ParentDetails(req.body);
        await parentDetails.save();
        return res.status(201).json({ message: 'Parent details saved successfully!', parentDetails });
    } catch (error) {
        console.error('Error saving parent details:', error); // Log the full error for debugging
        return res.status(500).json({ message: 'An error occurred while saving parent details', error: error.message });
    }
    
};
