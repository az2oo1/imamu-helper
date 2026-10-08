'use client';

import React, { ReactNode, useState } from 'react';
import { Button } from '../../components/ui/Button';

type AcademicTab = 'teachers' | 'subjects' | 'resources';

interface Props {
  teachersContent: ReactNode;
  subjectsContent: ReactNode;
  resourcesContent: ReactNode;
}

export default function AdminAcademicHubTab({
  teachersContent,
  subjectsContent,
  resourcesContent
}: Props) {
  const [activeTab, setActiveTab] = useState<AcademicTab>('subjects');
  const tabs: { id: AcademicTab; label: string }[] = [
    { id: 'teachers', label: 'الدكاترة والشعب' },
    { id: 'subjects', label: 'المواد والمقررات' },
    { id: 'resources', label: 'المصادر والروابط' }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>
          الأكاديميا الموحدة
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          إدارة الدكاترة والمواد والمصادر من صفحة واحدة
        </p>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-nowrap border-b overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        {tabs.map(tab => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'accent' : 'ghost'}
            size="sm"
            rounded="xl"
            className="min-w-0 flex-1 px-1 text-[9px] min-[380px]:text-[10px] sm:px-3 sm:text-xs"
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="truncate">{tab.label}</span>
          </Button>
        ))}
      </div>

      <div>
        {activeTab === 'teachers'
          ? teachersContent
          : activeTab === 'subjects'
            ? subjectsContent
            : resourcesContent}
      </div>
    </div>
  );
}
