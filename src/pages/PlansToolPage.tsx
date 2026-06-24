import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FileText, ArrowLeft, BookOpen, GraduationCap, Clock, ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlansToolPage() {
  const { user } = useAuth();
  const [majors, setMajors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const headers = user ? { Authorization: `Bearer ${user.accessToken}` } : {};

    Promise.all([
      fetch('/api/majors', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/subjects', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([m, s]) => {
      setMajors(m);
      setSubjects(s);
    }).catch(err => {
      console.error("Error fetching data:", err);
    });
  }, [user]);

  const filteredMajors = majors.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderStudyPlan = () => {
    if (!selectedMajor) return null;

    // Group courses by batch/optionalGroup
    const groups: Record<string, { reqCount: number, courses: any[] }> = {};
    
    selectedMajor.courses?.forEach((c: any) => {
      const groupName = c.optionalGroup || 'General Requirements';
      if (!groups[groupName]) {
        groups[groupName] = {
          reqCount: c.optionalGroupReqCount || 1,
          courses: []
        };
      }
      const subjectDetail = subjects.find(s => s.id === c.subjectId);
      if (subjectDetail) {
        groups[groupName].courses.push(subjectDetail);
      }
    });

    const groupKeys = Object.keys(groups);

    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <GraduationCap className="w-4 h-4" /> Official Plan
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-900">{selectedMajor.name}</h2>
            <p className="text-gray-500 mt-1">Review the curriculum structure and required courses.</p>
          </div>
          {selectedMajor.pdfUrl && (
            <a href={selectedMajor.pdfUrl} target="_blank" rel="noreferrer" className="shrink-0 bg-white text-indigo-600 font-medium px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition border border-indigo-100 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Download PDF
            </a>
          )}
        </div>

        {/* Batches / Groups */}
        <div className="p-6 md:p-8 flex-1 bg-gray-50/50">
          {groupKeys.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
              {groupKeys.map(groupName => {
                const group = groups[groupName];
                return (
                  <div key={groupName} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                        {groupName}
                      </h3>
                      {group.reqCount > 0 && (
                        <span className="text-sm font-medium bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
                          Requires {group.reqCount}
                        </span>
                      )}
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
                      {group.courses.map((subj, idx) => (
                        <div key={idx} className="group p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all duration-200 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                              <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded break-all max-w-[65%] leading-tight">{subj.code}</span>
                              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                                <Clock className="w-3 h-3" /> {subj.creditHours} hrs
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2" title={subj.name}>{subj.name}</h4>
                          </div>
                          {(subj.driveLink || subj.whatsappLink) && (
                            <div className="mt-4 pt-3 border-t border-gray-200 flex gap-3">
                              {subj.driveLink && (
                                <a href={subj.driveLink} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition">
                                  Drive <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {subj.whatsappLink && (
                                <a href={subj.whatsappLink} target="_blank" rel="noreferrer" className="text-xs font-medium text-green-600 hover:text-green-800 flex items-center gap-1 transition">
                                  WhatsApp <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center">
              <BookOpen className="w-12 h-12 mb-3 text-gray-300" />
              <p>No courses mapped for this major.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full mx-auto pb-24">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-8 w-fit transition">
        <ArrowLeft className="w-4 h-4" /> Back to Tools
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Study Plans</h1>
        <p className="text-gray-500 max-w-2xl">Browse available majors to view their detailed study plans, course requirements, and resources.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Left Column: Major Selection (Grid/List) */}
        <div className="w-full xl:w-1/3 shrink-0 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search majors..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm text-sm"
            />
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 max-h-[60vh] xl:max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
            {filteredMajors.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filteredMajors.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMajor(m)}
                    className={`text-left px-4 py-3 rounded-xl transition flex items-center justify-between group ${selectedMajor?.id === m.id ? 'bg-indigo-50 border-transparent text-indigo-900' : 'hover:bg-gray-50 border-transparent text-gray-700'}`}
                  >
                    <span className={`font-medium text-sm ${selectedMajor?.id === m.id ? 'text-indigo-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {m.name}
                    </span>
                    {selectedMajor?.id === m.id && <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No majors found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Study Plan Details */}
        <div className="flex-1 w-full min-w-0">
          {selectedMajor ? (
            renderStudyPlan()
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-gray-50/50 rounded-3xl border border-gray-100 border-dashed p-8 text-center">
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-indigo-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Major Selected</h3>
                <p className="text-sm text-gray-500">Choose a major from the list to explore its detailed study plan, course batches, and provided resources.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

