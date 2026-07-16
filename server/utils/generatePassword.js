// Generate Random Temporary Password
const generatePassword = () => {

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  let password = "";

  for (let i = 0; i < 8; i++) {

    const randomIndex = Math.floor(Math.random() * chars.length);

    password += chars[randomIndex];

  }

  return password;

};

export default generatePassword;