import Project from "../../models/Placement/Project.js";

export const createOrUpdateProjects = async (req, res) => {
  try {
    const { userId, projects } = req.body;

    const existingRecord = await Project.findOne({ userId });

    if (existingRecord) {
      existingRecord.projects = projects;
      await existingRecord.save();
    } else {
      await Project.create({ userId, projects }); // Fix: Use projects as a key
    }

    res.status(200).json({ status: "success", message: "Projects saved!" });
  } catch (err) {
    console.error("Error saving projects:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to save projects",
      error: err.message,
    });
  }
};

export const getProjectsByUserId = async (req, res) => {
  try {
    const { menteeId } = req.params;
    const projectData = await Project.findOne({ userId: menteeId });

    res.status(200).json({
      status: "success",
      data: projectData ? projectData : null,
    });
  } catch (err) {
    console.error("Error fetching projects by userId:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch project data",
      error: err.message,
    });
  }
};
