import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/apiError.js";
// @desc Register a user
// @route POST api/user/register
// @access Public

async function generateAccessAndRefreshToken(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = await user.generateAccessToken();
    console.log(accessToken);
    const refreshToken = await user.generateRefreshToken();
    console.log(refreshToken);
    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "Token generation failed");
  }
}

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw new ApiError(400, "All fields are required");
    }
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      throw new ApiError(400, "User already exists");
    }
    const user = await User.create({
      username: username,
      email: email,
      password: password,
    });
    const registeredUser = await User.findById(user._id).select("-password");
    if (registeredUser) {
      return res
        .status(201)
        .json(
          new ApiResponse(201, "User registered successfully", registeredUser)
        );
    } else {
      throw new ApiError(500, "User registration failed");
    }
  } catch (err) {
    console.log(err);
    return res
      .status(err.statusCode || 500)
      .json(
        new ApiResponse(
          err.statusCode || 500,
          err.message || "Internal Server Error",
          null
        )
      );
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Please provide email and password");
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    if (!user.comparePassword(password)) {
      throw new ApiError(400, "Invalid password");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    console.log(accessToken, refreshToken);
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken -accessToken"
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, "Login successful", {
          user: loggedInUser,
          accessToken,
          refreshToken,
        })
      );
  } catch (err) {
    console.log(err);
    return res
      .status(err.statusCode || 500)
      .json(
        new ApiResponse(
          err.statusCode || 500,
          err.message || "Internal Server Error",
          null
        )
      );
  }
};

export { registerUser, loginUser };