import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * The role whose backend routes the enrollment screens call. Each role has its
 * own guarded prefix (/api/registrar, /api/admin) over the same enrollment
 * routes, so the shared components only differ by this value.
 */
export type EnrollmentScope = 'registrar' | 'admin';

/**
 * Builds the HTTP client for one role's routes (e.g. /api/admin).
 * Every request carries the login tokens; a 401 response means the session
 * ended, so the tokens are cleared and the user is sent to the landing page.
 */
function createClient(scope: EnrollmentScope): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api/${scope}`,
  });

  // Attach the access token and session token to every request
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
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

  // Log the user out when the backend rejects the session
  client.interceptors.response.use(
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

  return client;
}

/**
 * Enrollment API calls for one role. Use it through useEnrollmentApi() inside
 * an EnrollmentApiProvider rather than calling it directly.
 */
export function createEnrollmentApi(scope: EnrollmentScope) {
  const client = createClient(scope);

  /**
   * Search for existing trainees by name or contact number
   */
  async function searchTrainees(query: string) {
    try {
      const response = await client.get('/enrollments/search/trainees', {
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
  async function getAvailableBatches(traineeId?: string) {
    try {
      const response = await client.get('/enrollments/available/batches', {
          params: traineeId ? { traineeId } : undefined,
      });
      return (response.data || []).map((batch: any) => ({
          id: batch.id,
          batchName: batch.batch_name,
          programId: batch.program_id,
          programName: batch.programs?.name || 'Unknown program',
          programIsAccredited: Boolean(batch.programs?.is_accredited),
          programPrefix: batch.programs?.control_number_prefix || '',
          // TIME columns arrive as ISO strings on 1970-01-01, e.g. 1970-01-01T08:00:00.000Z
          schedules: (batch.programs?.program_schedule || []).map((schedule: any) => ({
            days: schedule.days || [],
            startTime: String(schedule.start_time).slice(11, 16),
            endTime: String(schedule.end_time).slice(11, 16),
          })),
          startDate: batch.start_date,
          endDate: batch.end_date,
          datesConfirmed: Boolean(batch.start_date_confirmed_at),
          capacity: batch.capacity,
          remainingCapacity: batch.remainingCapacity ?? (batch.capacity - (batch._count?.enrollments || 0)),
          batchStatus: batch.batch_status,
          eligible: batch.eligible ?? true,
          blockedReason: batch.blockedReason ?? null,
      }));
    } catch (error) {
      console.error('Error fetching available batches:', error);
      throw error;
    }
  }

  /**
   * Get all programs
   */
  async function getPrograms() {
    try {
      const response = await client.get('/enrollments/programs');
      return response.data;
    } catch (error) {
      console.error('Error fetching programs:', error);
      throw error;
    }
  }

  /**
   * Get all enrollments with optional filters
   */
  async function getEnrollments(filters?: {
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
      const response = await client.get('/enrollments', {
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
  async function getEnrollmentDetail(enrollmentId: string) {
    try {
      const response = await client.get(`/enrollments/${enrollmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollment detail:', error);
      throw error;
    }
  }

  /**
   * Create a new enrollment
   */
  async function createEnrollment(enrollmentData: {
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
      beneficiary: {
        firstName: string;
        middleName: string;
        lastName: string;
        relationship: string;
        contactNumber: string;
        address: string;
        idNumber: string;
      };
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
      const response = await client.post('/enrollments', enrollmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw error;
    }
  }

  /**
   * Save an edit of an enrollment's submitted documents
   */
  async function updateRequirementChecklist(
    enrollmentId: string,
    checklist: {
      bcNsoPsaCopy: boolean;
      diplomaTor: boolean;
      brgyClearance: boolean;
      oneByOnePic: boolean;
      twoByTwoPic: boolean;
      passportSize: boolean;
    },
  ) {
    try {
      const response = await client.patch(
        `/enrollments/${enrollmentId}/requirements`,
        checklist,
      );
      return response.data;
    } catch (error) {
      console.error('Error updating submitted documents:', error);
      throw error;
    }
  }

  /**
   * Update enrollment status
   */
  async function updateEnrollmentStatus(
    enrollmentId: string,
    status: string,
    remarks?: string,
  ) {
    try {
      const response = await client.patch(
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

  // The calls the enrollment components use
  return {
    searchTrainees,
    getAvailableBatches,
    getPrograms,
    getEnrollments,
    getEnrollmentDetail,
    createEnrollment,
    updateRequirementChecklist,
    updateEnrollmentStatus,
  };
}

/** The set of enrollment calls for one role */
export type EnrollmentApi = ReturnType<typeof createEnrollmentApi>;
