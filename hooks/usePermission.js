import { useAuth } from "../context/AuthContext";

export const usePermission = (permission) => {
  const { user } = useAuth();
  return user?.permissions?.includes(permission);
};