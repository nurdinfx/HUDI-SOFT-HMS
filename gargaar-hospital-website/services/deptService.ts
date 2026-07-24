import api from "./api";

export interface DepartmentInfo {
  department: string;
  count: number;
}

export interface DoctorStats {
  totalDoctors: number;
  availableNow: number;
  departmentBreakdown: DepartmentInfo[];
  onLeave: number;
}

export const getDepartments = async () => {
  try {
    const response = await api.get<DoctorStats>("/doctors/stats");
    return response.data.departmentBreakdown.map((d) => ({
      name: d.department,
      doctorCount: d.count,
      description: `Comprehensive services in ${d.department}.`,
    }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    // Mock data for initial development
    return [
      { name: "General Medicine", doctorCount: 5, description: "Preventative and primary healthcare for adults." },
      { name: "Pediatrics", doctorCount: 3, description: "Expert medical care for infants, children, and adolescents." },
      { name: "Cardiology", doctorCount: 2, description: "Diagnosis and treatment of heart and cardiovascular conditions." },
      { name: "Surgery", doctorCount: 4, description: "Advanced surgical procedures with precision and care." },
      { name: "Laboratory", doctorCount: 0, description: "State-of-the-art diagnostic and testing services." },
    ];
  }
};
