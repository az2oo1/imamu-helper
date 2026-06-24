import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FileText, MessageCircle, Lock, LayoutGrid, Search } from 'lucide-react';
import { motion } from 'motion/react';

export function Resources() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      user.getIdToken().then(token => {
        fetch('/api/subjects', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => {
          if (!r.ok) {
            throw new Error(`HTTP error! status: ${r.status}`);
          }
          const contentType = r.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new TypeError("Received non-JSON response from server");
          }
          return r.json();
        })
        .then(data => {
          if(Array.isArray(data)) setSubjects(data);
        }).catch(err => {
          console.error("Error fetching subjects:", err);
        });
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-[rgba(11,50,96,0.06)] rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-[var(--color-imamu-blue)]" />
        </div>
        <h2 className="text-3xl font-display font-semibold mb-4 text-gray-900">Sign In Required</h2>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Resources compiled by students (PDFs, past tests, WhatsApp groups) are restricted to IMAMU students. Please sign in with your IMAMU email to gain access.
        </p>
      </div>
    );
  }

  const filtered = subjects.filter(s => 
    (s.driveLink || s.whatsappLink) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Student Resources</h1>
          <p className="text-gray-500 max-w-xl">Curated study materials, notes, past papers, and group chats, organized by subject.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search code or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-900 py-3 pl-11 pr-4 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none shadow-sm transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(sub => (
          <div key={sub.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{sub.code}</span>
            </div>
            <h3 className="text-xl font-display font-semibold text-gray-900 mb-6">{sub.name}</h3>
            
            <div className="flex flex-col gap-3">
              {sub.driveLink && (
                <a href={sub.driveLink} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full p-3 bg-[rgba(11,50,96,0.06)] text-[var(--color-imamu-blue)] rounded-xl hover:bg-[rgba(11,50,96,0.12)] transition group">
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="w-5 h-5 opacity-70" /> Google Drive
                  </div>
                </a>
              )}
              {sub.whatsappLink && (
                <a href={sub.whatsappLink} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full p-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition group">
                  <div className="flex items-center gap-2 font-medium">
                    <MessageCircle className="w-5 h-5 opacity-70" /> WhatsApp Group
                  </div>
                </a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 bg-white border border-dashed border-gray-200 rounded-3xl">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No resources found for your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
