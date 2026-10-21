'use client';
import { RecordList } from '@/components/records';
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Learning</h1>
      <RecordList kind="learning" emptyText="No learning records found." />
    </div>
  );
}
