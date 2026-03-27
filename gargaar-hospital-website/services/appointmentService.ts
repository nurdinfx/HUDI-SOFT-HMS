import api from "./api";

export interface AppointmentData {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type?: string;
  notes?: string;
}

export interface PatientData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string;
}

export const createPatient = async (data: PatientData) => {
  try {
    const response = await api.post("/patients", data);
    return response.data;
  } catch (error) {
    console.error("Error creating patient:", error);
    throw error;
  }
};

export const createAppointment = async (data: AppointmentData) => {
  try {
    const response = await api.post("/appointments", data);
    return response.data;
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

/**
 * Public function to book an appointment.
 * 1. Creates a patient record.
 * 2. Uses the new patient ID to create an appointment.
 */
export const bookPublicAppointment = async (
  patientInfo: PatientData,
  appointmentInfo: Omit<AppointmentData, "patientId">
) => {
  try {
    // Step 1: Create Patient
    const patient = await createPatient(patientInfo);
    
    // Step 2: Create Appointment
    const appointment = await createAppointment({
      ...appointmentInfo,
      patientId: patient.id,
    });
    
    return appointment;
  } catch (error) {
    console.error("Public booking failed:", error);
    throw error;
  }
};
