import jwt from "jsonwebtoken";

// Generate JWT Token after successful login
const generateToken = (id) => {

  return jwt.sign(
    { id }, // Payload (User ID)
    process.env.JWT_SECRET, // Secret Key from .env
    {
      expiresIn: "7d", // Token validity
    }
  );

};

export default generateToken;