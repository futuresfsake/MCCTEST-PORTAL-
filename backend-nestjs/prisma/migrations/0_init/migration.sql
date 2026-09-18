-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."announcement_scope_enum" AS ENUM ('GLOBAL', 'PROGRAM', 'BATCH');

-- CreateEnum
CREATE TYPE "public"."approval_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."attendance_status_enum" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "public"."batch_status_enum" AS ENUM ('OPEN', 'ONGOING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."certificate_type_enum" AS ENUM ('COC', 'COT', 'NC', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."civil_status_enum" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'DIVORCED');

-- CreateEnum
CREATE TYPE "public"."clearance_status_enum" AS ENUM ('NOT_CLEARED', 'PENDING', 'CLEARED');

-- CreateEnum
CREATE TYPE "public"."competency_category_enum" AS ENUM ('BASIC', 'COMMON', 'CORE');

-- CreateEnum
CREATE TYPE "public"."day_enum" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "public"."employment_status_enum" AS ENUM ('EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'NA');

-- CreateEnum
CREATE TYPE "public"."employment_type_enum" AS ENUM ('FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTUAL', 'SEASONAL', 'NA');

-- CreateEnum
CREATE TYPE "public"."enrollment_status_enum" AS ENUM ('PENDING', 'ENROLLED', 'WITHDRAWN', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."highest_education_enum" AS ENUM ('ELEMENTARY', 'HIGH_SCHOOL', 'VOCATIONAL', 'COLLEGE', 'POST_GRADUATE', 'NA');

-- CreateEnum
CREATE TYPE "public"."outcome_status_enum" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'NOT_YET_ASSESSED');

-- CreateEnum
CREATE TYPE "public"."payment_method_enum" AS ENUM ('CASH', 'GCASH', 'BANK_TRANSFER', 'CHECK');

-- CreateEnum
CREATE TYPE "public"."payment_reason_enum" AS ENUM ('ENROLLMENT', 'PROCESSING_FEE', 'UNIFORM_ID_FEE', 'ASSESSMENT_DEPOSIT', 'EXTERNAL_FEES');

-- CreateEnum
CREATE TYPE "public"."release_status_enum" AS ENUM ('PENDING', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."request_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."size_enum" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL');

-- CreateEnum
CREATE TYPE "public"."user_role_enum" AS ENUM ('ADMIN', 'REGISTRAR', 'TRAINER', 'TRAINEE', 'ENCODER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "posted_by" UUID NOT NULL,
    "scope" "public"."announcement_scope_enum" NOT NULL DEFAULT 'GLOBAL',
    "batch_id" UUID,
    "program_id" UUID,
    "content" TEXT NOT NULL,
    "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" "public"."attendance_status_enum" NOT NULL,
    "recorded_by" UUID NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "batch_name" VARCHAR(100) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "batch_status" "public"."batch_status_enum" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batch_seq" (
    "program_id" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "batch_seq_pkey" PRIMARY KEY ("program_id","year")
);

-- CreateTable
CREATE TABLE "public"."batch_student_seq" (
    "batch_id" UUID NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "batch_student_seq_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "public"."certificate_type" (
    "certificate_type_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "public"."certificate_type_enum" NOT NULL,
    "description" TEXT,

    CONSTRAINT "certificate_type_pkey" PRIMARY KEY ("certificate_type_id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "template_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_type_id" UUID NOT NULL,
    "template_image" TEXT NOT NULL,
    "template_name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "public"."clearance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_form_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "clearance_status" "public"."clearance_status_enum" NOT NULL DEFAULT 'NOT_CLEARED',
    "surrendered_id" BOOLEAN NOT NULL DEFAULT false,
    "schedule" DATE,
    "release_date" DATE,
    "released_by" UUID,
    "date_released" DATE,
    "remarks" TEXT,

    CONSTRAINT "clearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clearance_approval" (
    "approval_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clearance_id" UUID NOT NULL,
    "office_role_id" UUID NOT NULL,
    "signed_by" UUID,
    "approval_status" "public"."approval_status_enum" NOT NULL DEFAULT 'PENDING',
    "date_signed" DATE,
    "remarks" TEXT,

    CONSTRAINT "clearance_approval_pkey" PRIMARY KEY ("approval_id")
);

-- CreateTable
CREATE TABLE "public"."clearance_certificate" (
    "clearance_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "other_specify" TEXT,

    CONSTRAINT "clearance_certificate_pkey" PRIMARY KEY ("clearance_id","certificate_type_id")
);

-- CreateTable
CREATE TABLE "public"."competency" (
    "competency_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "competency_code" VARCHAR(10) NOT NULL,
    "competency_title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "competency_pkey" PRIMARY KEY ("competency_id")
);

-- CreateTable
CREATE TABLE "public"."competency_category" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_name" "public"."competency_category_enum" NOT NULL,

    CONSTRAINT "competency_category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "public"."ctrl_num_seq" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "sequence_type" VARCHAR(20) NOT NULL DEFAULT 'CERTIFICATE',
    "last_sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ctrl_num_seq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."distribution_checklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "inventory_id" UUID,
    "uniform_given" BOOLEAN NOT NULL DEFAULT false,
    "size_issued" "public"."size_enum",
    "id_card_given" BOOLEAN NOT NULL DEFAULT false,
    "date_distributed" DATE,
    "distributed_by" UUID,
    "remarks" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainee_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "enrollment_status" "public"."enrollment_status_enum" NOT NULL DEFAULT 'PENDING',
    "uniform_size" "public"."size_enum",
    "id_card_number" VARCHAR(50),
    "exit_reason" TEXT,
    "remarks" TEXT,
    "enrolled_by" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."generated_certificate" (
    "generated_certificate_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clearance_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "date_generated" DATE DEFAULT CURRENT_DATE,
    "date_released" DATE,
    "released_by" UUID,
    "release_status" "public"."release_status_enum" NOT NULL DEFAULT 'PENDING',
    "control_number" VARCHAR(50) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "generated_certificate_pkey" PRIMARY KEY ("generated_certificate_id")
);

-- CreateTable
CREATE TABLE "public"."insurance_coverage" (
    "coverage_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainee_id" UUID NOT NULL,
    "effective_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "official_receipt_id" UUID NOT NULL,

    CONSTRAINT "insurance_coverage_pkey" PRIMARY KEY ("coverage_id")
);

-- CreateTable
CREATE TABLE "public"."inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "sizes" "public"."size_enum" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."learning_outcome" (
    "learning_outcome_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "competency_id" UUID NOT NULL,
    "outcome_number" SMALLINT NOT NULL,
    "outcome_description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learning_outcome_pkey" PRIMARY KEY ("learning_outcome_id")
);

-- CreateTable
CREATE TABLE "public"."office_role" (
    "office_role_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_name" VARCHAR(50) NOT NULL,

    CONSTRAINT "office_role_pkey" PRIMARY KEY ("office_role_id")
);

-- CreateTable
CREATE TABLE "public"."official_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "or_number" VARCHAR(50) NOT NULL,
    "base_fee" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" "public"."payment_method_enum" NOT NULL,
    "reason_of_dues" "public"."payment_reason_enum" NOT NULL,
    "remarks" TEXT,
    "confirmed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "official_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "is_accredited" BOOLEAN NOT NULL DEFAULT false,
    "schedule" "public"."day_enum"[],
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_training_hours" DECIMAL(6,2),
    "approx_months" VARCHAR(50),
    "control_number_prefix" VARCHAR(20) NOT NULL,
    "id_card_prefix" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "other_specify" TEXT,
    "purpose_of_request" TEXT NOT NULL,
    "request_status" "public"."request_status_enum" NOT NULL DEFAULT 'PENDING',
    "is_window_open" BOOLEAN NOT NULL DEFAULT false,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "request_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."requirement_checklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "checked_by" UUID NOT NULL,
    "bc_nso_psa_copy" BOOLEAN NOT NULL DEFAULT false,
    "diploma_tor" BOOLEAN NOT NULL DEFAULT false,
    "brgy_clearance" BOOLEAN NOT NULL DEFAULT false,
    "one_by_one_pic" BOOLEAN NOT NULL DEFAULT false,
    "two_by_two_pic" BOOLEAN NOT NULL DEFAULT false,
    "passport_size" BOOLEAN NOT NULL DEFAULT false,
    "commitment_fee" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "session_token" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trainee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID,
    "contact_number" VARCHAR(15) NOT NULL,
    "street_address" VARCHAR(100) NOT NULL,
    "barangay" VARCHAR(100) NOT NULL,
    "municipality" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "gender" "public"."gender_enum" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "place_of_birth" VARCHAR(100) NOT NULL,
    "citizenship" VARCHAR(100) NOT NULL DEFAULT 'FILIPINO',
    "mother_name" VARCHAR(100) NOT NULL,
    "father_name" VARCHAR(100) NOT NULL,
    "civil_status" "public"."civil_status_enum" NOT NULL,
    "highest_education" "public"."highest_education_enum" NOT NULL,
    "pwd" BOOLEAN NOT NULL DEFAULT false,
    "employment_status" "public"."employment_status_enum" NOT NULL,
    "employment_type" "public"."employment_type_enum" NOT NULL,

    CONSTRAINT "trainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trainee_beneficiaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trainee_id" UUID NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "middle_name" VARCHAR(50) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,
    "id_number" VARCHAR(50) NOT NULL,
    "address" VARCHAR(100) NOT NULL,

    CONSTRAINT "trainee_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trainee_outcome_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "learning_outcome_id" UUID NOT NULL,
    "status" "public"."outcome_status_enum" NOT NULL DEFAULT 'PENDING',
    "date_checked" DATE,
    "remarks" TEXT,
    "checked_by" UUID,

    CONSTRAINT "trainee_outcome_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trainer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "gender" "public"."gender_enum" NOT NULL,
    "complete_address" TEXT NOT NULL,
    "highest_education" "public"."highest_education_enum" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,

    CONSTRAINT "trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."training_session" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "topics_covered" TEXT,
    "created_by" UUID NOT NULL,

    CONSTRAINT "training_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "public"."user_role" (
    "users_id" UUID NOT NULL,
    "office_role_id" UUID NOT NULL,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("users_id","office_role_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."user_role_enum" NOT NULL,
    "avatar_url" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "system_id" VARCHAR(30),
    "email" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."withdrawal_request" (
    "withdrawal_request_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "requested_reason" TEXT NOT NULL,
    "date_requested" DATE NOT NULL,
    "flagged_by_system" BOOLEAN NOT NULL DEFAULT false,
    "request_status" "public"."request_status_enum" NOT NULL DEFAULT 'PENDING',
    "surrendered_id" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" UUID,
    "date_reviewed" DATE,
    "remarks" TEXT,

    CONSTRAINT "withdrawal_request_pkey" PRIMARY KEY ("withdrawal_request_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "idx_announcements_posted" ON "public"."announcements"("posted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_attendance_enrollment" ON "public"."attendance"("enrollment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_attendance_session" ON "public"."attendance"("session_id" ASC);

-- CreateIndex
CREATE INDEX "idx_batch_program" ON "public"."batch"("program_id" ASC);

-- CreateIndex
CREATE INDEX "idx_batch_status" ON "public"."batch"("batch_status" ASC);

-- CreateIndex
CREATE INDEX "idx_batch_trainer" ON "public"."batch"("trainer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_type_type_key" ON "public"."certificate_type"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "clearance_request_form_id_key" ON "public"."clearance"("request_form_id" ASC);

-- CreateIndex
CREATE INDEX "idx_clearance_request" ON "public"."clearance"("request_form_id" ASC);

-- CreateIndex
CREATE INDEX "idx_clearance_status" ON "public"."clearance"("clearance_status" ASC);

-- CreateIndex
CREATE INDEX "idx_clearance_approval_clearance" ON "public"."clearance_approval"("clearance_id" ASC);

-- CreateIndex
CREATE INDEX "idx_competency_program" ON "public"."competency"("program_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ctrl_num_seq_program_id_year_sequence_type_key" ON "public"."ctrl_num_seq"("program_id" ASC, "year" ASC, "sequence_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_checklist_enrollment_id_key" ON "public"."distribution_checklist"("enrollment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_distribution_checklist_enrollment" ON "public"."distribution_checklist"("enrollment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_id_card_number_key" ON "public"."enrollments"("id_card_number" ASC);

-- CreateIndex
CREATE INDEX "idx_enrollments_batch" ON "public"."enrollments"("batch_id" ASC);

-- CreateIndex
CREATE INDEX "idx_enrollments_status" ON "public"."enrollments"("enrollment_status" ASC);

-- CreateIndex
CREATE INDEX "idx_enrollments_trainee" ON "public"."enrollments"("trainee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "generated_certificate_control_number_key" ON "public"."generated_certificate"("control_number" ASC);

-- CreateIndex
CREATE INDEX "idx_generated_cert_clearance" ON "public"."generated_certificate"("clearance_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_generated_cert_ctrl_num" ON "public"."generated_certificate"("control_number" ASC);

-- CreateIndex
CREATE INDEX "idx_generated_cert_enrollment" ON "public"."generated_certificate"("enrollment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_inventory_program" ON "public"."inventory"("program_id" ASC);

-- CreateIndex
CREATE INDEX "idx_learning_outcome_competency" ON "public"."learning_outcome"("competency_id" ASC);

-- CreateIndex
CREATE INDEX "idx_official_receipts_enrollment" ON "public"."official_receipts"("enrollment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "official_receipts_or_number_key" ON "public"."official_receipts"("or_number" ASC);

-- CreateIndex
CREATE INDEX "idx_programs_active" ON "public"."programs"("is_active" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "programs_name_key" ON "public"."programs"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_request_form_enrollment" ON "public"."request_form"("enrollment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_request_form_status" ON "public"."request_form"("request_status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "requirement_checklist_enrollment_id_key" ON "public"."requirement_checklist"("enrollment_id" ASC);

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "public"."sessions"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token" ASC);

-- CreateIndex
CREATE INDEX "idx_beneficiaries_trainee" ON "public"."trainee_beneficiaries"("trainee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "trainee_beneficiaries_contact_number_key" ON "public"."trainee_beneficiaries"("contact_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "trainee_beneficiaries_id_number_key" ON "public"."trainee_beneficiaries"("id_number" ASC);

-- CreateIndex
CREATE INDEX "idx_outcome_enrollment" ON "public"."trainee_outcome_status"("enrollment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_user_id_key" ON "public"."trainer"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_training_session_batch" ON "public"."training_session"("batch_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_system_id_key" ON "public"."users"("system_id" ASC);

-- CreateIndex
CREATE INDEX "idx_withdrawal_enrollment" ON "public"."withdrawal_request"("enrollment_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."training_session"("session_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."batch" ADD CONSTRAINT "batch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."batch" ADD CONSTRAINT "batch_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."batch" ADD CONSTRAINT "batch_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."batch_seq" ADD CONSTRAINT "batch_seq_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."batch_student_seq" ADD CONSTRAINT "batch_student_seq_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "public"."certificate_type"("certificate_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance" ADD CONSTRAINT "clearance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance" ADD CONSTRAINT "clearance_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance" ADD CONSTRAINT "clearance_request_form_id_fkey" FOREIGN KEY ("request_form_id") REFERENCES "public"."request_form"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance_approval" ADD CONSTRAINT "clearance_approval_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "public"."clearance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance_approval" ADD CONSTRAINT "clearance_approval_office_role_id_fkey" FOREIGN KEY ("office_role_id") REFERENCES "public"."office_role"("office_role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance_approval" ADD CONSTRAINT "clearance_approval_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance_certificate" ADD CONSTRAINT "clearance_certificate_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "public"."certificate_type"("certificate_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."clearance_certificate" ADD CONSTRAINT "clearance_certificate_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "public"."clearance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."competency" ADD CONSTRAINT "competency_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."competency_category"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."competency" ADD CONSTRAINT "competency_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ctrl_num_seq" ADD CONSTRAINT "ctrl_num_seq_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."distribution_checklist" ADD CONSTRAINT "distribution_checklist_distributed_by_fkey" FOREIGN KEY ("distributed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."distribution_checklist" ADD CONSTRAINT "distribution_checklist_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."distribution_checklist" ADD CONSTRAINT "distribution_checklist_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_enrolled_by_fkey" FOREIGN KEY ("enrolled_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "public"."trainee"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."generated_certificate" ADD CONSTRAINT "generated_certificate_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "public"."certificate_type"("certificate_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."generated_certificate" ADD CONSTRAINT "generated_certificate_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "public"."clearance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."generated_certificate" ADD CONSTRAINT "generated_certificate_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."generated_certificate" ADD CONSTRAINT "generated_certificate_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."generated_certificate" ADD CONSTRAINT "generated_certificate_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."certificates"("template_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_coverage" ADD CONSTRAINT "insurance_coverage_official_receipt_id_fkey" FOREIGN KEY ("official_receipt_id") REFERENCES "public"."official_receipts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_coverage" ADD CONSTRAINT "insurance_coverage_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "public"."trainee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."learning_outcome" ADD CONSTRAINT "learning_outcome_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "public"."competency"("competency_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."official_receipts" ADD CONSTRAINT "official_receipts_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."official_receipts" ADD CONSTRAINT "official_receipts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_form" ADD CONSTRAINT "request_form_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "public"."certificate_type"("certificate_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_form" ADD CONSTRAINT "request_form_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requirement_checklist" ADD CONSTRAINT "requirement_checklist_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requirement_checklist" ADD CONSTRAINT "requirement_checklist_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainee" ADD CONSTRAINT "trainee_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainee_beneficiaries" ADD CONSTRAINT "trainee_beneficiaries_trainee_id_fkey" FOREIGN KEY ("trainee_id") REFERENCES "public"."trainee"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainee_outcome_status" ADD CONSTRAINT "trainee_outcome_status_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainee_outcome_status" ADD CONSTRAINT "trainee_outcome_status_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainee_outcome_status" ADD CONSTRAINT "trainee_outcome_status_learning_outcome_id_fkey" FOREIGN KEY ("learning_outcome_id") REFERENCES "public"."learning_outcome"("learning_outcome_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trainer" ADD CONSTRAINT "trainer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."training_session" ADD CONSTRAINT "training_session_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."training_session" ADD CONSTRAINT "training_session_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_role" ADD CONSTRAINT "user_role_office_role_id_fkey" FOREIGN KEY ("office_role_id") REFERENCES "public"."office_role"("office_role_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_role" ADD CONSTRAINT "user_role_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_request" ADD CONSTRAINT "withdrawal_request_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."withdrawal_request" ADD CONSTRAINT "withdrawal_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

