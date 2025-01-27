import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import { Box } from "@mui/material";
const ProtectedRoute = () => {
  const [logged] = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!logged) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
