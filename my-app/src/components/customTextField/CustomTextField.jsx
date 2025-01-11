import { IconButton, InputAdornment, TextField } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useState } from "react";
export const CustomTextField = ({
  label,
  type = "text",
  value,
  setValue,
  valueError,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((prev) => !prev);

  return (
    <TextField
      label={label}
      type={type === "password" && !showPassword ? "password" : "text"}
      variant="outlined"
      required
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={!!valueError}
      helperText={valueError}
      slotProps={{
        input: {
          endAdornment:
            type === "password" ? (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickShowPassword}
                  edge="end"
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            ) : null,
          style: {
            direction: "rtl",
          },
        },
        inputLabel: {
          style: {
            textAlign: "right",
            width: "calc(100% - 28px)",
          },
        },
      }}
      sx={{
        "& .MuiOutlinedInput-notchedOutline": {
          textAlign: "right",
        },
        "& .MuiInputLabel-root": {
          transformOrigin: "right",
        },
        marginBottom: "10px"
      }}
    />
  );
};
