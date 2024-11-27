// // src/controllers/Student/contactDetailsController.js
// import ContactDetails from '../../models/Student/contactDetails.js';

// // Function to create a contact detail
// export const createContactDetail = async (req, res) => {
//   try {
//     const contactDetail = new ContactDetails(req.body);
//     await contactDetail.save();
//     res.status(201).json(contactDetail);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// // Function to get all contact details
// export const getContactDetails = async (req, res) => {
//   try {
//     const contactDetails = await ContactDetails.find();
//     res.status(200).json(contactDetails);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


// src/controllers/Student/contactDetailsController.js
import ContactDetails from '../../models/Student/contactDetails.js';

// Function to create or update a contact detail
export const createContactDetail = async (req, res) => {
  const { userId, line1, line2, country, state, city, district, taluka, pincode } = req.body;

  try {
    // Check if a contact detail already exists for this user
    let contactDetail = await ContactDetails.findOne({ userId });

    if (contactDetail) {
      // If it exists, update the existing record
      contactDetail.line1 = line1;
      contactDetail.line2 = line2;
      contactDetail.country = country;
      contactDetail.state = state;
      contactDetail.city = city;
      contactDetail.district = district;
      contactDetail.taluka = taluka;
      contactDetail.pincode = pincode;

      await contactDetail.save();
      return res.status(200).json(contactDetail); // Return updated contact detail
    } else {
      // If it doesn't exist, create a new record
      contactDetail = new ContactDetails({ // Make sure you include userId in the new record
        line1,
        line2,
        country,
        state,
        city,
        district,
        taluka,
        pincode,
      });

      await contactDetail.save();
      return res.status(201).json(contactDetail); // Return newly created contact detail
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Function to get all contact details
export const getContactDetails = async (req, res) => {
  try {
    const contactDetails = await ContactDetails.find();
    res.status(200).json(contactDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
