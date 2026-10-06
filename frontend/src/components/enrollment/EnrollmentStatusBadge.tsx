import React from 'react';

interface EnrollmentStatusBadgeProps {
  status: 'PENDING' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'DROPPED';
}

const EnrollmentStatusBadge: React.FC<EnrollmentStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'ENROLLED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'WITHDRAWN':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DROPPED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'ENROLLED':
        return 'Enrolled';
      case 'WITHDRAWN':
        return 'Withdrawn';
      case 'COMPLETED':
        return 'Completed';
      case 'DROPPED':
        return 'Dropped';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  );
};

export default EnrollmentStatusBadge;
