-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('starter', 'growth', 'business', 'enterprise');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('active', 'suspended', 'trial');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'org_admin', 'employee');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'exited');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'half_day', 'absent', 'weekend', 'holiday');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "brand_colour" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "plan" "Plan" NOT NULL DEFAULT 'starter',
    "status" "OrgStatus" NOT NULL DEFAULT 'trial',
    "subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "employee_id" TEXT,
    "designation" TEXT,
    "department" TEXT,
    "shift" TEXT,
    "reporting_manager_id" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "check_in_lat" DOUBLE PRECISION,
    "check_in_lng" DOUBLE PRECISION,
    "check_out_lat" DOUBLE PRECISION,
    "check_out_lng" DOUBLE PRECISION,
    "check_in_selfie_url" TEXT,
    "total_hours" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_org_id_employee_id_key" ON "users"("org_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_org_id_user_id_date_key" ON "attendance"("org_id", "user_id", "date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
