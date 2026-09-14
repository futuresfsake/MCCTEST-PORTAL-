import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const registrarApi: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/registrar`,
});

registrarApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  const sessionToken = localStorage.getItem('sessionToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (sessionToken) {
    config.headers['X-Session-Token'] = sessionToken;
  }

  return config;
});

registrarApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/landing' && window.location.pathname !== '/') {
        window.location.assign('/landing');
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Search for existing trainees by name or contact number
 */
export async function searchTrainees(query: string) {
  try {
    const response = await registrarApi.get('/trainees/search', {
      params: { q: query },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error searching trainees:', error);
    throw error;
  }
}

/**
 * Get available batches for enrollment
 */
export async function getAvailableBatches(traineeId?: string) {
  try {
    const response = await registrarApi.get('/enrollments/available/batches', {
        params: traineeId ? { traineeId } : undefined,
    });
    return (response.data || []).map((batch: any) => ({
        id: batch.id,
        batchName: batch.batch_name,
        programId: batch.program_id,
        programName: batch.programs?.name || 'Unknown program',
        startDate: batch.start_date,
        endDate: batch.end_date,
        capacity: batch.capacity,
        remainingCapacity: batch.remainingCapacity ?? (batch.capacity - (batch._count?.enrollments || 0)),
        batchStatus: batch.batch_status,
    }));
  } catch (error) {
    console.error('Error fetching available batches:', error);
    throw error;
  }
}

/**
 * Get all programs
 */
export async function getPrograms() {
  try {
    const response = await registrarApi.get('/enrollments/programs');
    return response.data;
  } catch (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }
}

/**
 * Get all enrollments with optional filters
 */
export async function getEnrollments(filters?: {
  search?: string;
  batchId?: string;
  programId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}) {
  try {
    const response = await registrarApi.get('/enrollments', {
      params: filters,
    });
    const payload = response.data || {};
    return {
      ...payload,
      data: (payload.data || []).map((enrollment: any) => ({
        ...enrollment,
        enrollmentStatus: enrollment.enrollment_status,
        uniformSize: enrollment.uniform_size,
        idCardNumber: enrollment.id_card_number,
        enrolledAt: enrollment.enrolled_at,
      })),
    };
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    throw error;
  }
}

/**
 * Get enrollment detail
 */
export async function getEnrollmentDetail(enrollmentId: string) {
  try {
    const response = await registrarApi.get(`/enrollments/${enrollmentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching enrollment detail:', error);
    throw error;
  }
}

/**
 * Create a new enrollment
 */
export async function createEnrollment(enrollmentData: {
  trainee: {
    id?: string; // UUID if existing trainee
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    contactNumber: string;
    streetAddress: string;
    barangay: string;
    municipality: string;
    district: string;
    province: string;
    placeOfBirth: string;
    citizenship?: string;
    motherName: string;
    fatherName: string;
    civilStatus: string;
    highestEducation: string;
    pwd: boolean;
    employmentStatus: string;
    employmentType: string;
    isExistingTrainee: boolean;
  };
  batchId: string;
  requirementChecklist: {
    bcNsoPsaCopy: boolean;
    diplomaTor: boolean;
    brgyClearance: boolean;
    oneByOnePic: boolean;
    twoByTwoPic: boolean;
    passportSize: boolean;
    remarks?: string;
  };
  uniformSize: string;
  uniformGiven: boolean;
  remarks?: string;
  payment: {
    processPayment: boolean;
    amount?: number;
    paymentMethod?: string;
    reasonOfDues?: string;
    remarks?: string;
  };
}) {
  try {
    const response = await registrarApi.post('/enrollments', enrollmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating enrollment:', error);
    throw error;
  }
}

/**
 * Update enrollment status
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: string,
  remarks?: string,
) {
  try {
    const response = await registrarApi.patch(
      `/enrollments/${enrollmentId}/status`,
      {
        status,
        remarks,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    throw error;
  }
}
