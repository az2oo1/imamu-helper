'use client';

import React from 'react';
import { Calculator, FileText, ArrowRight, LayoutGrid } from 'lucide-react';
import Link from 'next/link';

export function Tools() {
  const toolCategories = [
    {
      title: "Academic Calculations",
      tools: [
        {
          id: "gpa",
          name: "GPA Calculator",
          description: "Estimate your semester GPA and see your cumulative academic standing.",
          icon: <Calculator className="w-6 h-6 text-[var(--color-imamu-blue)]" />,
          link: "/tools/gpa",
        }
      ]
    },
    {
      title: "Planning & Registration",
      tools: [
        {
          id: "plans",
          name: "Study Plans",
          description: "Download official major study plans and course prerequisite trees.",
          icon: <FileText className="w-6 h-6 text-emerald-500" />,
          link: "/tools/plans",
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24">
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Academic Tools</h1>
        <p className="text-gray-500 max-w-xl">A collection of utilities to help you manage your academic life at IMAMU.</p>
      </div>

      <div className="space-y-12">
        {toolCategories.map(category => (
          <div key={category.title}>
            <h2 className="text-xl font-display font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-gray-400" />
              {category.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.tools.map(tool => (
                <Link 
                  key={tool.id} 
                  href={tool.link}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition group flex flex-col h-full"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {tool.icon}
                  </div>
                  <h3 className="text-lg font-display font-semibold text-gray-900 mb-2">{tool.name}</h3>
                  <p className="text-sm text-gray-500 mb-6 flex-1 leading-relaxed">{tool.description}</p>
                  <div className="flex items-center text-sm font-medium text-[var(--color-imamu-blue)] group-hover:translate-x-1 transition-transform">
                    Open Tool <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

