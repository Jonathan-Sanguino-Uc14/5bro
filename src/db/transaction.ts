import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

let pending: Promise<unknown> = Promise.resolve();

/** Serialize writes; native transactions use their own connection so unrelated
 * queries cannot accidentally join a sale's stock update or rollback. */
export function writeTransaction<T>(db: SQLiteDatabase, work: (tx: SQLiteDatabase) => Promise<T>): Promise<T> {
  const task = pending.then(async () => {
    let result!: T;
    if (Platform.OS === 'web') {
      await db.withTransactionAsync(async () => { result = await work(db); });
    } else {
      await db.withExclusiveTransactionAsync(async tx => { result = await work(tx); });
    }
    return result;
  });
  pending = task.catch(() => {});
  return task;
}
