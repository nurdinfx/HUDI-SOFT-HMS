import api from "./api";

export interface Doctor {
  id: string;
  doctorId: string;
  name: string;
  specialization: string;
  department: string;
  qualification?: string;
  experience?: number;
  status: "available" | "on-leave" | "busy";
  avatar?: string;
  availableDays?: string[];
  availableTimeStart?: string;
  availableTimeEnd?: string;
}

export const getDoctors = async (params?: { department?: string; search?: string }) => {
  try {
    const response = await api.get<Doctor[]>("/doctors", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching doctors:", error);
    // Return mock data if API fails (unauthorized or network error)
    return [];
  }
};

export const getDoctorById = async (id: string) => {
  try {
    const response = await api.get<Doctor>(`/doctors/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching doctor ${id}:`, error);
    return null;
  }
};
