'use client';
import { RecordList } from '@/components/records';
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <RecordList kind="projects" emptyText="No projects found." />
    </div>
  );
}
