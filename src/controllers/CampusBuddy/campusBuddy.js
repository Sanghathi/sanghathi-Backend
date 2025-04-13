import catchAsync from "../../utils/catchAsync.js";
import campusBuddy from "../../services/campusBuddy.js";

const handleUserQuery = catchAsync(async (req, res, next) => {
  const { query } = req.body;
  const response = await campusBuddy.generateResponse(query);
  res.status(200).json({
    status: "success",
    data: {
      output: response,
    },
  });
});

export default handleUserQuery;