'use client';
import { RecordList } from '@/components/records';
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <RecordList kind="goals" emptyText="No goals found." />
    </div>
  );
}
