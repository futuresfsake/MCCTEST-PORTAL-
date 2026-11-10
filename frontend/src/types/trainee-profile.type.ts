export interface TraineeProfile {
  id: string
  system_id: string | null
  email: string | null
  first_name: string
  middle_name: string
  last_name: string
  role: string
  avatar_url: string | null
  is_active: boolean
  trainee: {
    contact_number: string
    street_address: string
    barangay: string
    municipality: string
    district: string
    province: string
    gender: string
    date_of_birth: string
    place_of_birth: string
    citizenship: string
    mother_name: string
    father_name: string
    civil_status: string
    highest_education: string
    pwd: boolean
    employment_status: string
    employment_type: string
  }
}

export interface UpdateTraineeProfile {
  contactNumber: string
  streetAddress: string
  barangay: string
  municipality: string
  district: string
  province: string
}
