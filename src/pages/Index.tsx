import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { isReady, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;
    navigate(user ? "/dashboard" : "/login", { replace: true });
  }, [isReady, user, navigate]);

  return null;
};

export default Index;
