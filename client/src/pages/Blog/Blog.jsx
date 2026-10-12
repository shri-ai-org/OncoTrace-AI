// Blog.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogPosts } from './blogData';
import { IconArrowRight, IconCalendar, IconClock, IconNews, IconStarFilled } from '@tabler/icons-react';
import Reveal from '../../components/motion/Reveal';
import { NAV_H } from '../../lib/layout';
import { setSocialMeta } from '../../lib/seo';


export default function Blog() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    
    // SEO Meta tags
    document.title = 'Research Blog | OncoTrace-AI - Precision Oncology Insights';
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Explore cutting-edge research in AI-powered cancer detection, liquid biopsy, ctDNA analysis, and precision oncology from OncoTrace-AI.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Explore cutting-edge research in AI-powered cancer detection, liquid biopsy, ctDNA analysis, and precision oncology from OncoTrace-AI.';
      document.head.appendChild(meta);
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'oncology research, cancer AI, liquid biopsy, ctDNA, precision medicine, cancer detection');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'oncology research, cancer AI, liquid biopsy, ctDNA, precision medicine, cancer detection';
      document.head.appendChild(meta);
    }

    setSocialMeta({
      title: 'Research Blog | OncoTrace-AI - Precision Oncology Insights',
      description: 'Explore cutting-edge research in AI-powered cancer detection, liquid biopsy, ctDNA analysis, and precision oncology from OncoTrace-AI.',
    });
  }, []);

  const handlePostClick = (slug) => {
    navigate(`/blog/${slug}`);
  };

  // Post dates are plain 'YYYY-MM-DD', which Date parses as UTC midnight;
  // format in UTC too, or time zones west of UTC show the previous day.
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <main className="min-h-screen bg-canvas" style={{ paddingTop: NAV_H }}>
      {/* Header */}
      <section className="border-b border-hairline bg-white">
        <div className="ot-container py-14 sm:py-16 lg:py-20">
          <Reveal className="max-w-3xl">
            <h1 className="ot-display">OncoTrace-AI Blog</h1>
            <p className="ot-lead mt-5">
              Exploring the intersection of artificial intelligence, molecular biology, and precision oncology.
              Evidence-based insights into the future of cancer care.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Posts */}
      <section className="ot-container py-12 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
          {blogPosts.map((post, index) => (
            <Reveal key={post.id} delay={index * 0.06}>
              <article className="group relative flex h-full flex-col rounded-xl border border-hairline bg-white p-6 shadow-soft transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="ot-tech rounded-md bg-brand-soft px-2 py-1 uppercase tracking-[0.06em] text-brand">
                    {post.category}
                  </span>
                  {post.featured && (
                    <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ink-2">
                      <IconStarFilled size={13} aria-hidden="true" className="text-amber-500" />
                      Featured
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-[1.3125rem] font-[650] leading-snug tracking-[-0.02em] text-ink sm:text-[1.5rem]">
                  {/* Whole card is the link target via this ::after overlay. */}
                  <a
                    href={`/blog/${post.slug}`}
                    onClick={(e) => { e.preventDefault(); handlePostClick(post.slug); }}
                    className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                  >
                    {post.title}
                  </a>
                </h2>

                <p className="ot-small mt-3 line-clamp-3 flex-1">{post.subtitle}</p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <IconCalendar size={15} stroke={1.75} aria-hidden="true" />
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <IconClock size={15} stroke={1.75} aria-hidden="true" />
                    {post.readTime} min
                  </span>
                </div>

                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                  {post.tags.slice(0, 3).map((tag) => (
                    <li key={tag} className="rounded-md bg-sunken px-2 py-0.5 text-[0.75rem] font-medium text-body">
                      #{tag}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-brand" aria-hidden="true">
                  Read Full Article
                  <IconArrowRight size={15} stroke={2} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Empty state */}
        {blogPosts.length === 0 && (
          <div className="py-16 text-center md:py-20">
            <IconNews size={40} stroke={1.5} aria-hidden="true" className="mx-auto text-hairline-strong" />
            <h2 className="ot-h3 mt-5">No posts yet</h2>
            <p className="ot-small mt-2">Check back soon for new research insights!</p>
          </div>
        )}
      </section>
    </main>
  );
}
