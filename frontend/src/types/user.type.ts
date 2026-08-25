// types/

// What: TypeScript interfaces and types shared across the whole app.

// types/
// ├── user.types.ts
// ├── enrollment.types.ts
// ├── batch.types.ts
// └── ...

// Example:

// typescript
// // enrollment.types.ts
// export interface Enrollment {
//   id: string;
//   trainee_id: string;
//   batch_id: string;
//   enrollment_status: 'PENDING' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'DROPPED';
//   uniform_size?: string;
//   id_card_number?: string;
// }

// Rule: If you use the same shape of data in more than one place → define it here once.