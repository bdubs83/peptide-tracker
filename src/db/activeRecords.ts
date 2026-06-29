export type SoftDeletedRecord = {
  deletedAt?: string;
};

export const isActiveRecord = <T extends SoftDeletedRecord>(record: T) => !record.deletedAt;

export const activeRecords = <T extends SoftDeletedRecord>(records: T[] = []) => records.filter(isActiveRecord);
