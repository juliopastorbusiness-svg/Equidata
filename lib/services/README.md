# Center Modules Architecture

## Recommended folders

- `lib/services/types.ts`
- `lib/services/firestoreTypes.ts`
- `lib/services/mappers.ts`
- `lib/services/shared.ts`
- `lib/services/paddockService.ts`
- `lib/services/medicationService.ts`
- `lib/services/calendarService.ts`
- `lib/services/classService.ts`
- `lib/services/trainingService.ts`
- `lib/services/competitionService.ts`
- `lib/services/studentService.ts`
- `lib/services/paymentService.ts`

## Firestore schema

All new data hangs from:

`centers/{centerId}`

Collections:

- `paddocks`
- `paddockAssignments`
- `medications`
- `horseTreatments`
- `events`
- `classes`
- `trainings`
- `competitions`
- `students`
- `classReservations`
- `studentPayments`

## Domain references

- `paddockAssignments.paddockId -> paddocks/{paddockId}`
- `paddockAssignments.horseId -> horses/{horseId}`
- `horseTreatments.medicationId -> medications/{medicationId}`
- `horseTreatments.horseId -> horses/{horseId}`
- `events.classId -> classes/{classId}`
- `events.trainingId -> trainings/{trainingId}`
- `events.competitionId -> competitions/{competitionId}`
- `classes.arenaId -> arenas/{arenaId}`
- `trainings.arenaId -> arenas/{arenaId}`
- `students.horseId -> horses/{horseId}`
- `classReservations.classId -> classes/{classId}`
- `classReservations.studentId -> students/{studentId}`
- `studentPayments.studentId -> students/{studentId}`
- `studentPayments.reservationId -> classReservations/{reservationId}`

## Notes

- Keep `centerId` explicit in every service call.
- Reuse ids from existing modules instead of duplicating horse, trainer or arena data.
- Prefer adding UI later on top of these services without moving files again.

