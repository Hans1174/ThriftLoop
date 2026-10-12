import React, { useState, useEffect } from 'react';
import { ExternalLink, BookOpen, Calendar, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function BlogSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/blog/posts`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
        <div>
          <span className="bg-[#2F6B4F]/10 text-[#2F6B4F] text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit mb-1.5">
            <BookOpen size={11} /> Vintage Journal
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A]">
            Stories & Styling Guides
          </h2>
          <p className="text-xs text-[#23313A]/60 font-medium mt-0.5">
            Behind the archives, sustainable garment care, and authentic styling notes.
          </p>
        </div>

        <a
          href="https://blogger.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-[#2F6B4F] hover:text-[#23313A] flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Read All Stories</span>
          <ArrowRight size={13} />
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-[#A8C3A0]/20 rounded-2xl h-80 animate-pulse p-4"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white border border-[#A8C3A0]/30 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#2F6B4F]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-48 sm:h-52 w-full overflow-hidden bg-[#F6F1E8]/50 relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#23313A]/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                    {post.author}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#A8C3A0] font-semibold mb-2">
                    <Calendar size={11} />
                    <span>{new Date(post.published).toLocaleDateString()}</span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#23313A] group-hover:text-[#2F6B4F] transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-[#23313A]/70 font-medium mt-2 leading-relaxed line-clamp-3">
                    {post.snippet}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-1">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6B4F] hover:text-[#23313A] transition-colors"
                >
                  <span>Read Article</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}