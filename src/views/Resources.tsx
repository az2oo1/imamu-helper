'use client';

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
        <div className="w-20 h-20 bg-blue-950/20 border border-blue-900/30 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-3xl font-display font-semibold mb-4 text-zinc-50">Sign In Required</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
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
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-zinc-50 mb-4">Student Resources</h1>
          <p className="text-zinc-400 max-w-xl">Curated study materials, notes, past papers, and group chats, organized by subject.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search code or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 py-3 pl-11 pr-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(sub => (
          <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-none flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-xs font-semibold bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md">
                  {sub.code}
                </span>
              </div>
              <h3 className="text-xl font-display font-semibold text-zinc-100 mb-6">{sub.name}</h3>
            </div>
            
            <div className="flex flex-col gap-3 mt-auto">
              {sub.driveLink && (
                <a 
                  href={sub.driveLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-center w-full p-2.5 bg-blue-950/20 text-blue-400 border border-blue-900/30 rounded-xl hover:bg-blue-950/40 transition font-medium text-sm gap-2"
                >
                  <FileText className="w-4.5 h-4.5" /> Google Drive
                </a>
              )}
              {sub.whatsappLink && (
                <a 
                  href={sub.whatsappLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-center w-full p-2.5 bg-emerald-950/20 text-emerald-450 border border-emerald-900/30 rounded-xl hover:bg-emerald-950/40 transition font-medium text-sm gap-2"
                >
                  <MessageCircle className="w-4.5 h-4.5" /> WhatsApp Group
                </a>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20 text-zinc-400" />
            <p>No resources found for your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
