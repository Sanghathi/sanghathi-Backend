import Placement from "../../models/Placement/Placement.js";
export const createOrUpdatePlacements = async (req, res) => {
  try {
    //const { userId } = req.params;
    const { userId, placements } = req.body;

    const existingRecord = await Placement.findOne({ userId });

    if (existingRecord) {
      existingRecord.placements = placements;
      await existingRecord.save();
    } else {
      await Placement.create({ userId, placements });
    }

    res.status(200).json({ status: "success", message: "Placements saved!" });
  } catch (err) {
    console.error("Error saving placements:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to save placements",
      error: err.message,
    });
  }
};

export const getPlacementsByUserId = async (req, res, next) => {
  try {
    const { menteeId } = req.params;
    const placementData = await Placement.findOne({ userId: menteeId });

    res.status(200).json({
      status: "success",
      data: placementData ? placementData.placements : [],
    });
  } catch (err) {
    console.error("Error fetching placements by userId:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch placement data",
      error: err.message,
    });
  }
};
