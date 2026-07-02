import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { ShieldAlert, Plus, ShieldCheck, Twitter, Calendar, BookOpen, FileText, Trash2, Link as LinkIcon, Download, Sparkles, Upload } from 'lucide-react';
import { format } from 'date-fns';

type Tab = 'news_sources' | 'majors' | 'events' | 'subjects' | 'settings';

function AiImporter({ 
  prompt, 
  type, 
  onParsed 
}: { 
  prompt: string, 
  type: string, 
  onParsed: (data: any[]) => void 
}) {
  const [loading, setLoading] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const { user } = useAuth();
  
  const handleParse = async (payload: { file?: File, text?: string }) => {
    setLoading(true);
    try {
      const data = new FormData();
      if (payload.file) data.append('file', payload.file);
      if (payload.text) data.append('text', payload.text);
      data.append('prompt', prompt);
      data.append('type', type);
      
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/ai_parse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });
      const textRes = await res.text();
      let json;
      try {
        json = JSON.parse(textRes);
      } catch (e) {
        console.error("Failed to parse JSON response:", textRes);
        throw new Error("Invalid format returned from server");
      }
      if(json.success) {
        onParsed(json.data);
        setShowPaste(false);
        setPasteText('');
      }
      else alert("Parse failed: " + (json.message || json.error));
    } catch(err) {
      console.error(err);
      alert("Error parsing AI Request. See console.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;

    if (file.name.endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (Array.isArray(json)) {
            onParsed(json);
          } else {
            alert("The uploaded JSON must be an array of objects.");
          }
        } catch (err) {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // reset
      return;
    }

    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').filter(row => row.trim().length > 0);
          const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const data = rows.slice(1).map(row => {
            const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ""; });
            return obj;
          });
          
          if (type === 'majors') {
             // Basic transform for majors from CSV (assuming columns: majorName, courseCode, batchName, batchReqCount)
             const majorMap = new Map<string, any>();
             data.forEach(row => {
                if (!row.majorName) return;
                if (!majorMap.has(row.majorName)) {
                   majorMap.set(row.majorName, { name: row.majorName, batches: [], courses: [] });
                }
                const m = majorMap.get(row.majorName);
                if (row.batchName && !m.batches.find((b:any) => b.name === row.batchName)) {
                   m.batches.push({ name: row.batchName, reqCount: parseInt(row.batchReqCount) || 1 });
                }
                if (row.courseCode) {
                   m.courses.push({ subjectCode: row.courseCode, optionalGroup: row.batchName || "", optionalGroupReqCount: parseInt(row.batchReqCount) || 1 });
                }
             });
             onParsed(Array.from(majorMap.values()));
          } else {
            onParsed(data);
          }
        } catch(err) { alert("Failed to parse CSV locally"); }
      };
      reader.readAsText(file);
      e.target.value = '';
      return;
    }

    handleParse({ file });
    e.target.value = ''; // reset
  };
  
  return (
    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex flex-col gap-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Bulk Importer</h4>
            <p className="text-xs text-gray-600">Choose an import method. Offline CSV/JSON imports are free and do not use AI.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowPaste(!showPaste)}
            className="bg-white border border-purple-200 text-purple-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-purple-100 transition shadow-sm"
          >
            Paste Text (AI)
          </button>
          
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
            <><Upload className="w-4 h-4" /> CSV/JSON (No AI)</>
            <input type="file" className="hidden" accept=".csv,.json" onChange={handleFile} disabled={loading} />
          </label>

          <label className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition flex items-center gap-2 shadow-sm">
            {loading && !showPaste ? "Processing..." : <><Sparkles className="w-4 h-4" /> PDF/Image (AI)</>}
            <input type="file" className="hidden" accept=".txt,.pdf,.png,.jpg,.jpeg" onChange={handleFile} disabled={loading} />
          </label>
        </div>
      </div>
      {showPaste && (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full h-32 p-3 text-sm rounded-lg border border-purple-200 outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            placeholder="Paste your raw text or table data here..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          ></textarea>
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={() => handleParse({ text: pasteText })}
              disabled={loading || !pasteText.trim()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {loading ? "Processing..." : "Parse Text"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminPage() {
  const { user, dbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('news_sources');

  // Data states
  const [newsSources, setNewsSources] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<{fetchRangeDays: number, autoDeleteDays: number, smtpHost?: string, smtpPort?: number, smtpUser?: string, smtpPass?: string, semesterStartDate?: string, semesterEndDate?: string, apiToken?: string}>({ fetchRangeDays: 30, autoDeleteDays: 30 });

  // Forms
  const [sourceForm, setSourceForm] = useState<{id?:number, handle:string}>({ handle: ''});
  const [majorForm, setMajorForm] = useState<{id?:number, name:string, pdfUrl:string, courses: {subjectId: number, optionalGroup: string, optionalGroupReqCount: string}[], batches: {name: string, reqCount: string}[]}>({ name: '', pdfUrl: '', courses: [], batches: [] });
  const [draggedSubjectId, setDraggedSubjectId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<{id?:number, title:string, date:string, description:string}>({ title: '', date: '', description: '' });
  const [subjectForm, setSubjectForm] = useState<{id?:number, code:string, name:string, driveLink:string, whatsappLink:string, creditHours:string, level:string}>({ code: '', name: '', driveLink: '', whatsappLink: '', creditHours: '3', level: '' });
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [includedCoursesSearch, setIncludedCoursesSearch] = useState('');

  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectLimit, setSubjectLimit] = useState(20);

  const [majorSearch, setMajorSearch] = useState('');
  const [majorLimit, setMajorLimit] = useState(10);

  const [eventSearch, setEventSearch] = useState('');
  const [eventLimit, setEventLimit] = useState(20);

  // Native Delete Modal
  const [deleteModal, setDeleteModal] = useState<{url: string, message: string} | null>(null);
  
  // AI Preview Modal
  const [aiPreview, setAiPreview] = useState<{type: string, data: any[]} | null>(null);

  const handleAiParsed = (type: string, data: any[]) => {
    setAiPreview({ type, data });
  };

  const confirmDelete = async () => {
    if(!deleteModal) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(deleteModal.url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if(res.ok) fetchData();
    } catch(e) { console.error(e); }
    setDeleteModal(null);
  };

  const fetchData = async () => {
    if (!user) return;
    const t = await user.getIdToken();
    const opts = { headers: { Authorization: `Bearer ${t}` } };
    
    Promise.all([
      fetch('/api/admin/news_sources', opts).then(r => r.ok && r.json()),
      fetch('/api/majors', opts).then(r => r.ok && r.json()),
      fetch('/api/events', opts).then(r => r.ok && r.json()),
      fetch('/api/subjects', opts).then(r => r.ok && r.json()),
      fetch('/api/admin/global_settings', opts).then(r => r.ok ? r.json() : { fetchRangeDays: 30, autoDeleteDays: 30 })
    ]).then(([ns, m, e, s, gs]) => {
      if (ns) setNewsSources(ns);
      if (m) setMajors(m);
      if (e) setEvents(e);
      if (s) setSubjects(s);
      if (gs) setGlobalSettings(gs);
    }).catch(console.error);
  };

  useEffect(() => {
    if (user && dbUser?.isAdmin) {
      fetchData();
    }
  }, [user, dbUser]);

  if (!user || !dbUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">You must be an administrator to view this page.</p>
      </div>
    );
  }

  const handlePostWithMethod = async (url: string, method: string, data: any, resetCb: () => void) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if(res.ok) {
        resetCb();
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.message || err.error || 'Failed to save record'}`);
      }
    } catch(e) { console.error(e); }
  };

  const handlePost = async (url: string, data: any, resetCb: () => void) => {
    return handlePostWithMethod(url, 'POST', data, resetCb);
  };

  const handleDelete = (url: string, prefix: string = 'this') => {
    setDeleteModal({url, message: `Are you sure you want to delete ${prefix}? This action cannot be undone.`});
  };

  const handleFetchPosts = async (handle: string, fetchAll: boolean = false) => {
    try {
      const token = await user?.getIdToken();
      const url = fetchAll ? `/api/admin/news_sources/fetch-all` : `/api/admin/news_sources/${handle}/fetch`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully fetched ${data.fetchedCount} recent posts.`);
        fetchData();
      } else {
        alert("Failed to fetch posts. " + (data.message || ""));
      }
    } catch(e) { console.error(e); }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'news_sources':
        return (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">Add Twitter/X News Source</h3>
                <p className="text-sm text-gray-500">Track handles to fetch announcements</p>
              </div>
              <button
                onClick={() => handleFetchPosts('', true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Fetch All Now
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <span className="absolute left-4 top-3 text-gray-400">@</span>
                <input 
                  type="text" 
                  placeholder="IMAMU_News" 
                  value={sourceForm.handle} 
                  onChange={e => setSourceForm({...sourceForm, handle: e.target.value.replace('@','')})}
                  className="w-full bg-white border border-gray-200 py-2.5 pl-8 pr-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                />
              </div>
              <button 
                onClick={() => handlePost('/api/admin/news_sources', sourceForm, () => setSourceForm({handle:''}))}
                className="bg-[var(--color-imamu-blue)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition shrink-0 w-full sm:w-auto"
              >
                Add Source
              </button>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                 <div className="flex flex-col">
                   <label className="text-sm text-gray-600 mb-1">Fetch Range (Days)</label>
                   <input 
                     type="number" min="1"
                     value={globalSettings.fetchRangeDays}
                     onChange={e => setGlobalSettings(s => ({...s, fetchRangeDays: parseInt(e.target.value) || 30}))}
                     className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                   />
                 </div>
                 <div className="flex flex-col">
                   <label className="text-sm text-gray-600 mb-1">Auto-Delete Older Than (Days)</label>
                   <input 
                     type="number" min="1"
                     value={globalSettings.autoDeleteDays}
                     onChange={e => setGlobalSettings(s => ({...s, autoDeleteDays: parseInt(e.target.value) || 30}))}
                     className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                   />
                 </div>
               </div>

               <div className="mt-6 flex justify-end">
                 <button 
                   className="bg-[var(--color-imamu-blue)] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition"
                   onClick={() => handlePostWithMethod('/api/admin/global_settings', 'PUT', globalSettings, () => alert('Settings saved!'))}
                 >
                   Save Settings
                 </button>
               </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Sources</h3>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                {newsSources.map(s => (
                  <div key={s.id} className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 group hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1DA1F2]/10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                         {s.profilePicUrl ? <img src={s.profilePicUrl} className="w-full h-full object-cover" /> : <Twitter className="w-5 h-5 text-[#1DA1F2]" />}
                      </div>
                      <div>
                         <div className="font-semibold text-gray-900 leading-tight text-lg">@{s.handle}</div>
                         <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{s.newsCount || 0} posts</span>
                            <span className="text-gray-300">•</span>
                            <span>Last fetched: {s.lastFetched ? new Date(s.lastFetched).toLocaleString() : 'Never'}</span>
                         </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                       <button 
                        onClick={() => handleFetchPosts(s.handle, false)}
                        className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-100 transition whitespace-nowrap"
                      >
                        Fetch Now
                      </button>
                      <button 
                        onClick={() => handleDelete(`/api/admin/news_sources/${s.handle}/posts`, 'all posts from @' + s.handle)}
                        className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition whitespace-nowrap"
                        title="Delete All Posts from Source"
                      >
                        Empty Posts
                      </button>
                      <button 
                        onClick={() => handleDelete(`/api/admin/news_sources/${s.id}`, '@' + s.handle)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete Source"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {newsSources.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">No sources added yet.</div>}
              </div>
            </div>
          </div>
        );
      
      case 'majors':
        return (
          <div className="space-y-8">
            <AiImporter prompt="Extract university academic majors. CRITICAL: Do NOT extract 'levels' (المستويات) or 'optional batches' (حزم اختيارية) or 'university requirements' (متطلب جامعي) as separate major objects! They belong INSIDE the 'batches' array of the parent degree program. If the document contains multiple different degrees (e.g., 'بكا-عال تقني' vs 'تج-عال تقني'), ONLY THEN extract them as separate major objects. For each major, extract EVERY associated course code in the entire plan. Extract ALL distinct groupings (levels/blocks/packages) like 'المستوى الأول', 'متطلب جامعي اجباري', 'اختياري-الحوسبة', 'المهارات المهنية وسوق العمل', 'مقررات حرة لكلية' as distinct batches. Map each course to its exact level/batch name." type="majors" onParsed={(data) => handleAiParsed('majors', data)} />
            <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-4">{majorForm.id ? "Edit Major" : "Add New Major"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="Major Name (e.g. Computer Science)" 
                  value={majorForm.name} onChange={e=>setMajorForm(s=>({...s,name:e.target.value}))} 
                  className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" 
                />
                <input 
                  type="text" placeholder="PDF Plan URL" 
                  value={majorForm.pdfUrl} onChange={e=>setMajorForm(s=>({...s,pdfUrl:e.target.value}))} 
                  className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" 
                />
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="block text-sm font-medium text-gray-700">Plan Levels & Batches (المستويات والحزم):</span>
                    <button type="button" onClick={() => setMajorForm(f => ({...f, batches: [...f.batches, {name: `Batch ${f.batches.length + 1}`, reqCount: '1'}]}))} className="text-xs text-[var(--color-imamu-blue)] font-medium hover:underline">+ Add Batch</button>
                  </div>
                  {majorForm.batches.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
                      {majorForm.batches.map((b, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            value={b.name} 
                            placeholder="Batch Name (e.g. حزمة اختيارية 1)"
                            onChange={e => {
                               const newName = e.target.value;
                               const oldName = b.name;
                               setMajorForm(f => ({
                                  ...f,
                                  batches: f.batches.map((batch, idx) => idx === i ? {...batch, name: newName} : batch),
                                  courses: f.courses.map(c => c.optionalGroup === oldName ? {...c, optionalGroup: newName} : c)
                               }))
                            }} 
                            className="flex-1 bg-white border border-gray-200 py-1.5 px-3 rounded outline-none text-sm" 
                          />
                          <input 
                            type="number" 
                            min="1"
                            value={b.reqCount} 
                            placeholder="Req Count"
                            title="Required Courses Count from this batch"
                            onChange={e => setMajorForm(f => ({
                              ...f, 
                              batches: f.batches.map((batch, idx) => idx === i ? {...batch, reqCount: e.target.value} : batch),
                              courses: f.courses.map(c => c.optionalGroup === b.name ? {...c, optionalGroupReqCount: e.target.value} : c)
                            }))} 
                            className="w-24 bg-white border border-gray-200 py-1.5 px-3 rounded outline-none text-sm" 
                          />
                          <button 
                            type="button"
                            onClick={() => setMajorForm(f => ({
                              ...f, 
                              batches: f.batches.filter((_, idx) => idx !== i),
                              courses: f.courses.map(c => c.optionalGroup === b.name ? {...c, optionalGroup: '', optionalGroupReqCount: '1'} : c)
                            }))} 
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                    <span className="block text-sm font-medium text-gray-700">Select Included Courses:</span>
                    <input
                      type="text"
                      placeholder="Search courses to include..."
                      value={includedCoursesSearch}
                      onChange={(e) => setIncludedCoursesSearch(e.target.value)}
                      className="bg-white border border-gray-200 py-1.5 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] w-full sm:w-64"
                    />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {subjects.filter(s => {
                      if (!includedCoursesSearch) return true;
                      const term = includedCoursesSearch.toLowerCase();
                      return s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term);
                    }).map(subj => {
                      const selectedCourse = majorForm.courses.find(c => c.subjectId === subj.id);
                      const isSelected = !!selectedCourse;
                      return (
                        <div key={subj.id} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-100">
                          <label className="flex flex-1 items-center gap-2 text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setMajorForm(f => ({...f, courses: [...f.courses, {subjectId: subj.id, optionalGroup: '', optionalGroupReqCount: '1'}]}));
                                else setMajorForm(f => ({...f, courses: f.courses.filter(c => c.subjectId !== subj.id)}));
                              }}
                            /> <span className="font-medium text-gray-900">{subj.code}</span> <span className="truncate">{subj.name}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {majorForm.courses.length > 0 && (
                    <div className="mt-6">
                      <span className="block text-sm font-medium text-gray-700 mb-2">Drag & Drop Courses into Batches/Levels:</span>
                      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                        {[{ name: '', title: 'Unassigned (Default)' }, ...majorForm.batches.map(b => ({ name: b.name, title: b.name }))].map(batch => (
                          <div 
                            key={batch.name || 'unassigned'}
                            className="flex-shrink-0 w-64 sm:w-72 bg-gray-50/50 border border-gray-200 rounded-xl p-3 flex flex-col min-h-[120px] max-h-[60vh] h-[600px]"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedSubjectId) {
                                const newBatch = majorForm.batches.find(b => b.name === batch.name);
                                setMajorForm(f => ({
                                  ...f,
                                  courses: f.courses.map(c => c.subjectId === draggedSubjectId ? {...c, optionalGroup: batch.name, optionalGroupReqCount: newBatch ? newBatch.reqCount : '1'} : c)
                                }));
                                setDraggedSubjectId(null);
                              }
                            }}
                          >
                            <h4 className="font-semibold text-gray-700 text-sm border-b border-gray-200 pb-2 mb-2 flex justify-between items-center shrink-0">
                              <span>{batch.title}</span>
                              {batch.name && <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">{majorForm.batches.find(b=>b.name===batch.name)?.reqCount} Req</span>}
                            </h4>
                            
                            {!batch.name && (
                              <input 
                                type="text" 
                                placeholder="Search courses..." 
                                value={unassignedSearch}
                                onChange={(e) => setUnassignedSearch(e.target.value)}
                                className="mb-3 w-full bg-white border border-gray-200 py-1.5 px-3 rounded text-sm outline-none shrink-0"
                              />
                            )}

                            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-2">
                              {majorForm.courses.filter(c => {
                                if ((c.optionalGroup || '') !== batch.name) return false;
                                if (!batch.name && unassignedSearch) {
                                  const subj = subjects.find(s => s.id === c.subjectId);
                                  if (!subj) return false;
                                  const term = unassignedSearch.toLowerCase();
                                  return subj.name.toLowerCase().includes(term) || subj.code.toLowerCase().includes(term);
                                }
                                return true;
                              }).map(c => {
                                const subj = subjects.find(s => s.id === c.subjectId);
                                if (!subj) return null;
                                return (
                                  <div 
                                    key={c.subjectId}
                                    draggable
                                    onDragStart={(e) => {
                                      setDraggedSubjectId(c.subjectId);
                                      e.dataTransfer.setData('text/plain', c.subjectId.toString());
                                    }}
                                    className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm text-sm cursor-grab active:cursor-grabbing hover:border-[var(--color-imamu-blue)] hover:shadow transition-all group shrink-0"
                                  >
                                    <div className="font-semibold text-gray-900 group-hover:text-[var(--color-imamu-blue)] transition-colors">{subj.code}</div>
                                    <div className="text-gray-500 text-xs mt-0.5 break-words">{subj.name}</div>
                                  </div>
                                )
                              })}
                              {majorForm.courses.filter(c => (c.optionalGroup || '') === batch.name).length === 0 && (
                                <div className="text-gray-400 text-xs italic flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg min-h-[100px]">Drop here</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button 
                    onClick={() => {
                      const url = majorForm.id ? `/api/admin/majors/${majorForm.id}` : '/api/admin/majors';
                      const method = majorForm.id ? 'PUT' : 'POST';
                      handlePostWithMethod(url, method, majorForm, () => setMajorForm({id:undefined, name:'', pdfUrl:'', courses: [], batches: []}))
                    }}
                    className="flex-1 bg-[var(--color-imamu-blue)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition"
                  >
                    {majorForm.id ? "Update Major" : "Add Major"}
                  </button>
                  {majorForm.id && (
                    <button onClick={() => setMajorForm({id:undefined, name:'', pdfUrl:'', courses: [], batches: []})} className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-900 transition">Cancel</button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium text-gray-900">Current Majors ({majors.length})</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search majors..."
                    value={majorSearch}
                    onChange={(e) => setMajorSearch(e.target.value)}
                    className="flex-1 sm:w-64 bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  />
                  <select
                    value={majorLimit}
                    onChange={(e) => setMajorLimit(Number(e.target.value))}
                    className="bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {majors
                  .filter(m => m.name?.toLowerCase().includes(majorSearch.toLowerCase()))
                  .slice(0, majorLimit)
                  .map(m => (
                  <div key={m.id} className="py-4 flex items-center justify-between group">
                    <div>
                      <div className="font-medium text-gray-900">{m.name}</div>
                      {m.pdfUrl && <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-imamu-blue)] font-medium hover:text-[var(--color-imamu-gold)] hover:underline flex items-center gap-1 mt-1"><LinkIcon className="w-3 h-3" /> PDF Plan</a>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const courses = m.courses?.map((c:any) => ({...c, optionalGroupReqCount: c.optionalGroupReqCount?.toString() || '1'})) || [];
                          const bMap = new Map();
                          courses.forEach((c:any) => {
                            if (c.optionalGroup) bMap.set(c.optionalGroup, c.optionalGroupReqCount);
                          });
                          const batches = Array.from(bMap.entries()).map(([name, reqCount]) => ({ name, reqCount }));
                          setMajorForm({ ...m, courses, batches });
                        }} 
                        className="p-2 text-gray-400 hover:text-[var(--color-imamu-blue)] hover:bg-[rgba(11,50,96,0.06)] rounded-lg transition text-sm font-medium"
                      >Edit</button>
                      <button 
                        onClick={() => handleDelete(`/api/admin/majors/${m.id}`, m.name)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'events':
        return (
          <div className="space-y-8">
            <AiImporter prompt="Extract a list of academic calendar events. Find title, date (YYYY-MM-DD), and description." type="events" onParsed={(data) => handleAiParsed('events', data)} />
            <div className="flex items-center justify-between gap-4 bg-[rgba(11,50,96,0.04)] p-4 rounded-xl border border-[rgba(11,50,96,0.12)] mb-6">
              <div>
                <h4 className="font-semibold text-gray-900">Calendar Subscriptions</h4>
                <p className="text-sm text-gray-500">Users can sync this calendar using the ICS feed.</p>
              </div>
              <a href="/api/calendar.ics" download className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm">
                <Download className="w-4 h-4" /> Download .ics
              </a>
            </div>
            
            <div className="flex items-center justify-between gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
              <div>
                <h4 className="font-semibold text-emerald-900">Mokafaa (Student Allowance)</h4>
                <p className="text-sm text-emerald-700">Automatically generate Mokafaa events on the 25th of every month for the next 12 months.</p>
              </div>
              <button
                onClick={() => {
                  handlePost('/api/admin/events/generate-mokafaa', {}, () => {
                    alert('Generated 12 Mokafaa events successfully!');
                    fetchData();
                  });
                }}
                className="flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm text-sm whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" /> Generate Mokafaa Dates
              </button>
            </div>

            <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-4">{eventForm.id ? "Edit Calendar Event" : "Add Calendar Event"}</h3>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" placeholder="Event Title (e.g. Final Exams Begin)" 
                    value={eventForm.title} onChange={e=>setEventForm(s=>({...s,title:e.target.value}))} 
                    className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" 
                  />
                  <input 
                    type="date" 
                    value={eventForm.date} onChange={e=>setEventForm(s=>({...s,date:e.target.value}))} 
                    className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" 
                  />
                </div>
                <textarea 
                  placeholder="Event Description (optional)" 
                  value={eventForm.description} onChange={e=>setEventForm(s=>({...s,description:e.target.value}))} 
                  className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] min-h-[100px]" 
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const url = eventForm.id ? `/api/admin/events/${eventForm.id}` : '/api/admin/events';
                      const method = eventForm.id ? 'PUT' : 'POST';
                      handlePostWithMethod(url, method, eventForm, () => setEventForm({id:undefined, title:'', date:'', description:''}))
                    }}
                    className="flex-1 bg-[var(--color-imamu-blue)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition"
                  >
                    {eventForm.id ? "Update Event" : "Add Event"}
                  </button>
                  {eventForm.id && (
                    <button onClick={() => setEventForm({id:undefined, title:'', date:'', description:''})} className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-900 transition">Cancel</button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upcoming Events ({events.length})</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="flex-1 sm:w-64 bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  />
                  <select
                    value={eventLimit}
                    onChange={(e) => setEventLimit(Number(e.target.value))}
                    className="bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {events
                  .filter(e => e.title?.toLowerCase().includes(eventSearch.toLowerCase()) || e.description?.toLowerCase().includes(eventSearch.toLowerCase()))
                  .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, eventLimit)
                  .map(e => (
                  <div key={e.id} className="py-4 flex items-center justify-between group">
                    <div>
                      <div className="font-medium text-gray-900">{e.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{format(new Date(e.date), 'MMM dd, yyyy')} • {e.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEventForm(e)} className="p-2 text-gray-400 hover:text-[var(--color-imamu-blue)] hover:bg-[rgba(11,50,96,0.06)] rounded-lg transition text-sm font-medium">Edit</button>
                      <button 
                        onClick={() => handleDelete(`/api/admin/events/${e.id}`, e.title)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'subjects':
        return (
          <div className="space-y-8">
            <AiImporter prompt="Extract a list of university courses from the provided text. Include course code (e.g., CS101 or تال١٣٨٤), name, and credit hours. Make sure to carefully process right-to-left Arabic course codes like تال١٣٨٤ and try to infer their names if omitted or separate them correctly from the grid structure." type="subjects" onParsed={(data) => handleAiParsed('subjects', data)} />
            <div>
              <h3 className="text-xl font-display font-semibold text-gray-900 mb-4">{subjectForm.id ? "Edit Course Resource" : "Add Course Resource"}</h3>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input type="text" placeholder="Code (e.g. CS101)" value={subjectForm.code} onChange={e=>setSubjectForm(s=>({...s,code:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                  <input type="text" placeholder="Name (e.g. Intro to CS)" value={subjectForm.name} onChange={e=>setSubjectForm(s=>({...s,name:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                  <input type="number" placeholder="Credit Hours" value={subjectForm.creditHours} onChange={e=>setSubjectForm(s=>({...s,creditHours:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                  <input type="number" placeholder="Level (e.g. 1)" value={subjectForm.level} onChange={e=>setSubjectForm(s=>({...s,level:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                  <input type="text" placeholder="Drive Link" value={subjectForm.driveLink} onChange={e=>setSubjectForm(s=>({...s,driveLink:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                  <input type="text" placeholder="WhatsApp Link" value={subjectForm.whatsappLink} onChange={e=>setSubjectForm(s=>({...s,whatsappLink:e.target.value}))} className="bg-white border border-gray-200 py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]" />
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>{
                    const url = subjectForm.id ? `/api/admin/subjects/${subjectForm.id}` : '/api/admin/subjects';
                    const method = subjectForm.id ? 'PUT' : 'POST';
                    return handlePostWithMethod(url, method, subjectForm, () => setSubjectForm({id:undefined, code:'',name:'',driveLink:'',whatsappLink:'', creditHours:'3', level:''}));
                  }} className="bg-[var(--color-imamu-blue)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition">{subjectForm.id ? "Update Subject" : "Add Subject"}</button>
                  {subjectForm.id && (
                    <button onClick={() => setSubjectForm({id:undefined, code:'',name:'',driveLink:'',whatsappLink:'', creditHours:'3', level:''})} className="px-6 py-2.5 text-gray-500 font-medium hover:text-gray-900 transition">Cancel</button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-medium text-gray-900">Current Subjects ({subjects.length})</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="flex-1 sm:w-64 bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  />
                  <select
                    value={subjectLimit}
                    onChange={(e) => setSubjectLimit(Number(e.target.value))}
                    className="bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={1000}>All</option>
                  </select>
                  <button
                    onClick={() => {
                      if(confirm("Are you sure you want to deduplicate subjects? This will keep only the best one per course code.")) {
                        handlePost('/api/admin/subjects/deduplicate', {}, () => alert('Duplicates removed!'));
                      }
                    }}
                    className="px-3 py-2 text-sm bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg font-medium transition flex items-center gap-1 whitespace-nowrap"
                    title="Clean Duplicates"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-zinc-800 border-t border-zinc-800">
                {subjects
                  .filter(s => s.code?.toLowerCase().includes(subjectSearch.toLowerCase()) || s.name?.toLowerCase().includes(subjectSearch.toLowerCase()))
                  .slice(0, subjectLimit)
                  .map(s => (
                  <div key={s.id} className="py-4 flex items-center justify-between group">
                    <div className="flex gap-4">
                      <div className="font-mono text-sm bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 self-start">{s.code}</div>
                      <div className="flex-1">
                        <div className="font-medium text-zinc-100">
                          {s.name}
                        </div>
                        <div className="flex gap-4 mt-2">
                          {s.driveLink && <a href={s.driveLink} target="_blank" rel="noreferrer" className="text-xs text-blue-400 font-medium hover:underline flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Drive</a>}
                          {s.whatsappLink && <a href={s.whatsappLink} target="_blank" rel="noreferrer" className="text-xs text-green-500 hover:underline flex items-center gap-1"><LinkIcon className="w-3 h-3"/> WhatsApp</a>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSubjectForm({
                        id: s.id,
                        code: s.code || '',
                        name: s.name || '',
                        driveLink: s.driveLink || '',
                        whatsappLink: s.whatsappLink || '',
                        creditHours: s.creditHours ? s.creditHours.toString() : '3',
                        level: s.level ? s.level.toString() : ''
                      })} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/45 rounded-lg transition text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(`/api/admin/subjects/${s.id}`)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900/40 rounded-lg transition"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-display font-semibold text-gray-900 mb-1">Global Settings</h3>
                <p className="text-sm text-gray-500">Configure global application settings</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="bg-[var(--color-imamu-blue)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Import Database
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!window.confirm('WARNING: This will overwrite the current database. Are you sure?')) return;
                      
                      try {
                        const token = await user?.getIdToken();
                        const fileContent = await file.text();
                        const payload = JSON.parse(fileContent);
                        
                        const res = await fetch('/api/admin/import-db', {
                          method: 'POST',
                          headers: { 
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(payload.data || payload)
                        });
                        
                        if (!res.ok) throw new Error('Failed to import DB');
                        alert('Database imported successfully! Please reload the page.');
                        window.location.reload();
                      } catch(err) {
                        alert('Error importing database. Invalid file or server error.');
                        console.error(err);
                      }
                      e.target.value = ''; // Reset file input
                    }}
                  />
                </label>
                <button
                  onClick={async () => {
                    try {
                      const token = await user?.getIdToken();
                      const res = await fetch('/api/admin/export-db', {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!res.ok) throw new Error('Failed to export DB');
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `imamu_db_export_${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch(e) {
                      alert('Error exporting database');
                    }
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export Database
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
               <h4 className="text-lg font-medium text-gray-900 mb-4">Semester Countdowns</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                 <div className="flex flex-col">
                   <label className="text-sm text-gray-600 mb-1">Semester Start Date</label>
                   <input 
                     type="date"
                     value={globalSettings.semesterStartDate || ''}
                     onChange={e => setGlobalSettings(s => ({...s, semesterStartDate: e.target.value}))}
                     className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                   />
                 </div>
                 <div className="flex flex-col">
                   <label className="text-sm text-gray-600 mb-1">Semester End Date</label>
                   <input 
                     type="date"
                     value={globalSettings.semesterEndDate || ''}
                     onChange={e => setGlobalSettings(s => ({...s, semesterEndDate: e.target.value}))}
                     className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                   />
                 </div>
               </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
               <h4 className="text-lg font-medium text-gray-900 mb-4">External API Settings</h4>
               <div className="grid grid-cols-1 gap-5">
                 <div className="flex flex-col">
                   <label className="text-sm text-gray-600 mb-1">API Token (Used for /api/external endpoints)</label>
                   <input 
                     type="text"
                     value={globalSettings.apiToken || ''}
                     onChange={e => setGlobalSettings(s => ({...s, apiToken: e.target.value}))}
                     placeholder="super_secret_token_123"
                     className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                   />
                 </div>
               </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
               <h4 className="text-lg font-medium text-gray-900 mb-4">IMAP & SMTP Settings</h4>
               
               <div className="mb-6">
                 <h5 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">IMAP Settings (Direct Authentication)</h5>
                 <p className="text-xs text-gray-500 mb-4">If configured, users can log in using their university email and password without needing a verification code.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">IMAP Host</label>
                     <input 
                       type="text"
                       value={globalSettings.imapHost || ''}
                       onChange={e => setGlobalSettings(s => ({...s, imapHost: e.target.value}))}
                       placeholder="outlook.office365.com"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">IMAP Port</label>
                     <input 
                       type="number"
                       value={globalSettings.imapPort || ''}
                       onChange={e => setGlobalSettings(s => ({...s, imapPort: parseInt(e.target.value) || undefined}))}
                       placeholder="993"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                   <div className="flex flex-col justify-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                       <input 
                         type="checkbox"
                         checked={globalSettings.imapSecure !== false}
                         onChange={e => setGlobalSettings(s => ({...s, imapSecure: e.target.checked}))}
                         className="rounded text-[var(--color-imamu-blue)] focus:ring-[var(--color-imamu-blue)]"
                       />
                       <span>Use Secure TLS (Recommended)</span>
                     </label>
                   </div>
                 </div>
               </div>

               <div>
                 <h5 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">SMTP Settings (Verification Codes)</h5>
                 <p className="text-xs text-gray-500 mb-4">Used for email verification during sign-up and password reset (if IMAP is not used).</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">SMTP Host</label>
                     <input 
                       type="text"
                       value={globalSettings.smtpHost || ''}
                       onChange={e => setGlobalSettings(s => ({...s, smtpHost: e.target.value}))}
                       placeholder="smtp.gmail.com"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">SMTP Port</label>
                     <input 
                       type="number"
                       value={globalSettings.smtpPort || ''}
                       onChange={e => setGlobalSettings(s => ({...s, smtpPort: parseInt(e.target.value) || undefined}))}
                       placeholder="587"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">SMTP Username</label>
                     <input 
                       type="text"
                       value={globalSettings.smtpUser || ''}
                       onChange={e => setGlobalSettings(s => ({...s, smtpUser: e.target.value}))}
                       placeholder="example@gmail.com"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                   <div className="flex flex-col">
                     <label className="text-sm text-gray-600 mb-1">SMTP Password</label>
                     <input 
                       type="password"
                       value={globalSettings.smtpPass || ''}
                       onChange={e => setGlobalSettings(s => ({...s, smtpPass: e.target.value}))}
                       placeholder="App Password"
                       className="bg-white border border-gray-300 py-2 px-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)]"
                     />
                   </div>
                 </div>
               </div>

               <div className="mt-6 flex justify-end">
                 <button 
                   className="bg-[var(--color-imamu-blue)] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--color-imamu-blue-light)] transition"
                   onClick={() => handlePostWithMethod('/api/admin/global_settings', 'PUT', globalSettings, () => alert('Settings saved!'))}
                 >
                   Save All Settings
                 </button>
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-5xl w-full mx-auto pb-24 px-4 sm:px-6 bg-transparent">
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-2 inline-flex items-center gap-3">
          <ShieldCheck className="w-10 h-10 text-indigo-600" /> Administrative Panel
        </h1>
        <p className="text-gray-500 max-w-xl">Configure and securely manage platform content across modules.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 lg:gap-16 bg-transparent">
        
        {/* Left Sidebar Menu */}
        <div className="w-full md:w-64 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 px-3">Settings Menu</h3>
          <nav className="flex flex-col space-y-1">
            <button 
              onClick={() => setActiveTab('news_sources')} 
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition ${activeTab === 'news_sources' ? 'bg-[var(--color-imamu-blue)] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
            >
              <Twitter className="w-5 h-5 shrink-0" /> News Sources
            </button>
            <button 
              onClick={() => setActiveTab('majors')} 
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition ${activeTab === 'majors' ? 'bg-[var(--color-imamu-blue)] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
            >
              <FileText className="w-5 h-5 shrink-0" /> Academic Majors
            </button>
            <button 
              onClick={() => setActiveTab('events')} 
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition ${activeTab === 'events' ? 'bg-[var(--color-imamu-blue)] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
            >
              <Calendar className="w-5 h-5 shrink-0" /> Calendar Dates
            </button>
            <button 
              onClick={() => setActiveTab('subjects')} 
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition ${activeTab === 'subjects' ? 'bg-[var(--color-imamu-blue)] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
            >
              <BookOpen className="w-5 h-5 shrink-0" /> Course Resources
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`flex items-center gap-3 w-full px-4 py-3 text-left rounded-xl font-medium transition ${activeTab === 'settings' ? 'bg-[var(--color-imamu-blue)] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}`}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" /> Global Settings
            </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 w-full min-w-0">
          {renderTabContent()}
        </div>
      </div>

      {aiPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
               <Sparkles className="w-6 h-6 text-purple-600" />
               <h3 className="text-xl font-display font-semibold text-gray-900">Review AI Import</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 border-b border-gray-100 space-y-3">
              {aiPreview.data.map((item, i) => {
                let conflict = false;
                const normalizeCode = (c: string) => {
                  if (!c) return '';
                  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                  let str = c.toLowerCase().replace(/\s+/g,'').replace(/-/g, '').replace(/_/g, '').trim();
                  for (let n = 0; n < 10; n++) {
                    str = str.replace(new RegExp(arabicNumbers[n], 'g'), n.toString());
                  }
                  return str;
                };

                if (aiPreview.type === 'subjects') conflict = !!subjects.find(s => normalizeCode(s.code) === normalizeCode(item.code));
                else if (aiPreview.type === 'majors') conflict = !!majors.find(m => m.name === item.name);
                else if (aiPreview.type === 'events') conflict = !!events.find(e => e.title === item.title && e.date === item.date);

                return (
                  <div key={i} className={`p-4 rounded-xl shadow-sm border ${conflict ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${conflict ? 'text-orange-600' : 'text-green-600'}`}>
                        {conflict 
                          ? (aiPreview.type === 'events' ? 'Identical Event & Date (Will Merge)' : 'Conflict Detected (Will Overwrite)') 
                          : 'New Record'}
                      </span>
                      <button onClick={() => {
                        const newData = [...aiPreview.data];
                        newData.splice(i, 1);
                        setAiPreview({...aiPreview, data: newData});
                      }} className="text-gray-400 hover:text-red-500 text-xs font-medium">Remove</button>
                    </div>
                    <div className="text-sm font-mono text-gray-700 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</div>
                  </div>
                );
              })}
              {aiPreview.data.length === 0 && <p className="text-gray-500 text-center py-4">No complete records extracted from the file.</p>}
            </div>
            <div className="p-6 flex gap-3">
              <button onClick={() => setAiPreview(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
              <button 
                onClick={async () => {
                  try {
                    const token = await user?.getIdToken();
                    for(const item of aiPreview.data) {
                      let conflictId = null;
                      const normalizeCode = (c: string) => {
                        if (!c) return '';
                        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                        let str = c.toLowerCase().replace(/\s+/g,'').replace(/-/g, '').replace(/_/g, '').trim();
                        for (let n = 0; n < 10; n++) {
                          str = str.replace(new RegExp(arabicNumbers[n], 'g'), n.toString());
                        }
                        return str;
                      };
                      if (aiPreview.type === 'subjects') conflictId = subjects.find(s => normalizeCode(s.code) === normalizeCode(item.code))?.id;
                      else if (aiPreview.type === 'majors') conflictId = majors.find(m => m.name === item.name)?.id;
                      else if (aiPreview.type === 'events') conflictId = events.find(e => e.title === item.title && e.date === item.date)?.id;
                      
                      const url = conflictId ? `/api/admin/${aiPreview.type}/${conflictId}` : `/api/admin/${aiPreview.type}`;
                      const method = conflictId ? 'PUT' : 'POST';
                      
                      await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(item)
                      });
                    }
                    setAiPreview(null);
                    fetchData();
                  } catch(e) { console.error(e); }
                }}
                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 transition"
              >
                Merge {aiPreview.data.length} Items
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Confirmation</h3>
              <p className="text-sm text-gray-500 mb-6">{deleteModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModal(null)} 
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
