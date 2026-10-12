// BlogPost.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostBySlug, getRelatedPosts } from './blogData';
import { IconArrowLeft, IconBrandFacebook, IconBrandLinkedin, IconBrandX, IconClock, IconLink, IconPhotoOff, IconStarFilled } from '@tabler/icons-react';
import { NAV_H } from '../../lib/layout';


// Professional Image Component. Render it keyed by src: BlogPost stays mounted
// when switching posts, so an index key handed one post's loaded/error state
// to the next post's image.
function BlogImage({ src, alt, caption, width, height }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <figure className="my-8 md:my-12">
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-md">
        {/* Loading skeleton */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 min-h-[200px] animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]"
               style={{ animation: 'shimmer 2s infinite' }} />
        )}

        {/* Actual image */}
        {!hasError ? (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`
              block w-full h-auto
              transition-opacity duration-700 ease-out
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
            `}
          />
        ) : (
          <div className="flex items-center justify-center h-64 md:h-96 bg-slate-100">
            <div className="text-center px-4">
              <IconPhotoOff size={44} stroke={1.5} aria-hidden="true" className="mx-auto mb-3 text-hairline-strong" />
              <p className="text-xs md:text-sm text-slate-600 font-medium">Image not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption className="mt-3 md:mt-4 px-2 md:px-4 text-center">
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed italic">
            {caption}
          </p>
        </figcaption>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </figure>
  );
}

function updateMetaTag(attribute, key, content) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  if (element) {
    element.setAttribute('content', content);
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [prevSlug, setPrevSlug] = useState(slug);
  const [post, setPost] = useState(() => getPostBySlug(slug));
  const [relatedPosts, setRelatedPosts] = useState(() => getRelatedPosts(slug));
  const [shareTooltip, setShareTooltip] = useState('');

  // Derived from `slug`: adjusted directly during render (React's documented
  // pattern for "reset state when a prop changes") rather than in the effect
  // below, so post/relatedPosts are already correct for this render instead
  // of lagging one commit behind.
  if (slug !== prevSlug) {
    setPrevSlug(slug);
    setPost(getPostBySlug(slug));
    setRelatedPosts(getRelatedPosts(slug));
  }

  useEffect(() => {
    // 'instant', not 'auto': 'auto' inherits the page's CSS smooth scrolling,
    // which animated all the way up from the related-posts section.
    window.scrollTo({ top: 0, behavior: 'instant' });

    const currentPost = getPostBySlug(slug);

    if (!currentPost) {
      // replace: keeping the unknown URL in history would make Back bounce
      // straight here again.
      navigate('/blog', { replace: true });
      return;
    }

    // SEO Meta tags
    document.title = `${currentPost.title} | OncoTrace-AI Blog`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', currentPost.metaDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = currentPost.metaDescription;
      document.head.appendChild(meta);
    }

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', currentPost.metaKeywords);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = currentPost.metaKeywords;
      document.head.appendChild(meta);
    }

    // Open Graph tags for social sharing
    updateMetaTag('property', 'og:title', currentPost.title);
    updateMetaTag('property', 'og:description', currentPost.metaDescription);
    updateMetaTag('property', 'og:type', 'article');
    updateMetaTag('property', 'og:url', window.location.href);
    
    // Add first image as OG image if available
    if (currentPost.images && currentPost.images.length > 0) {
      updateMetaTag('property', 'og:image', window.location.origin + currentPost.images[0].src);
    }
    
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', currentPost.title);
    updateMetaTag('name', 'twitter:description', currentPost.metaDescription);
    
    if (currentPost.images && currentPost.images.length > 0) {
      updateMetaTag('name', 'twitter:image', window.location.origin + currentPost.images[0].src);
    }

  }, [slug, navigate]);

  // Post dates are plain 'YYYY-MM-DD', which Date parses as UTC midnight;
  // format in UTC too, or time zones west of UTC show the previous day.
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = post.title;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        setShareTooltip('Copied!');
        setTimeout(() => setShareTooltip(''), 2000);
      } catch (err) {
        // Clipboard denied or unavailable (e.g. not a secure context).
        console.error('Failed to copy:', err);
        setShareTooltip("Couldn't copy link");
        setTimeout(() => setShareTooltip(''), 3000);
      }
    } else {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

  // Helper function to get images by position
  const getImagesByPosition = (position) => {
    if (!post?.images) return [];
    return post.images.filter(img => img.position === position);
  };

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: NAV_H }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-brand mx-auto mb-3 md:mb-4"></div>
          <p className="text-sm md:text-base text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-white"
      style={{ paddingTop: NAV_H }}
    >
      {/* Breadcrumbs */}
      <div className="mx-auto max-w-[52rem] px-4 pt-8 md:px-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[0.8125rem] text-muted md:mb-8">
          <button
            onClick={() => navigate('/')}
            className="rounded transition-colors hover:text-brand"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => navigate('/blog')}
            className="rounded transition-colors hover:text-brand"
          >
            Blog
          </button>
          <span>/</span>
          <span aria-current="page" className="min-w-0 truncate font-medium text-ink">{post.title}</span>
        </nav>
      </div>

      {/* Article Header */}
      <article className="mx-auto max-w-[52rem] px-4 pb-16 md:px-6 md:pb-20">
        <header className="mb-10 md:mb-12 pb-6 md:pb-8 border-b border-slate-200">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
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

          <h1 className="ot-display mb-5 text-[clamp(1.875rem,1.3rem+2.4vw,3rem)]">
            {post.title}
          </h1>

          <p className="ot-lead mb-8">
            {post.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4 text-xs md:text-sm text-slate-600">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-xs md:text-sm">
                  OT
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-xs md:text-sm">{post.author}</div>
                  <div className="text-[0.65rem] md:text-xs text-slate-500">{formatDate(post.date)}</div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <IconClock size={15} stroke={1.75} aria-hidden="true" />
                <span className="text-xs md:text-sm">{post.readTime} min read</span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[0.65rem] md:text-xs font-semibold uppercase tracking-wide text-muted mr-1 hidden sm:inline">Share:</span>
              
              <button
                onClick={() => handleShare('twitter')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-white text-body transition-colors hover:border-hairline-strong hover:text-brand"
                aria-label="Share on Twitter"
              >
                <IconBrandX size={17} stroke={1.75} aria-hidden="true" />
              </button>

              <button
                onClick={() => handleShare('linkedin')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-white text-body transition-colors hover:border-hairline-strong hover:text-brand"
                aria-label="Share on LinkedIn"
              >
                <IconBrandLinkedin size={17} stroke={1.75} aria-hidden="true" />
              </button>

              <button
                onClick={() => handleShare('facebook')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-white text-body transition-colors hover:border-hairline-strong hover:text-brand"
                aria-label="Share on Facebook"
              >
                <IconBrandFacebook size={17} stroke={1.75} aria-hidden="true" />
              </button>

              <div className="relative">
                <button
                  onClick={() => handleShare('copy')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-white text-body transition-colors hover:border-hairline-strong hover:text-brand"
                  aria-label="Copy link"
                >
                  <IconLink size={17} stroke={1.75} aria-hidden="true" />
                </button>
                {/* Always mounted, so screen readers announce the text that
                    appears in it. Right-aligned to the button (the last one in
                    the row): centred, the longer failure text ran off-screen
                    when the row sits at the right edge. */}
                <span role="status">
                  {shareTooltip && (
                    <span className="absolute -top-7 md:-top-8 right-0 px-2 py-1 bg-slate-900 text-white text-[0.65rem] md:text-xs rounded whitespace-nowrap">
                      {shareTooltip}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 md:gap-2 mt-4 md:mt-6">
            {post.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 md:px-3 md:py-1 text-[0.65rem] md:text-xs font-medium bg-slate-100 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        {/* Article Content */}
        <div>
          {/* Introduction */}
          <div className="mb-10 md:mb-12">
            {post.content.intro.map((paragraph, i) => (
              <p key={i} className="mb-4 md:mb-6 text-body text-base md:text-[1.0625rem] leading-[1.75]">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Images after intro */}
          {getImagesByPosition('after-intro').map((img) => (
            <BlogImage key={img.src} src={img.src} alt={img.alt} caption={img.caption} width={img.width} height={img.height} />
          ))}

          {/* Sections */}
          {post.content.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <section className="mb-12 md:mb-16 pb-10 md:pb-12 border-b border-slate-200 last:border-0">
                {section.eyebrow && (
                  <p className="text-[0.65rem] md:text-xs font-bold tracking-widest uppercase text-muted mb-2 md:mb-3">
                    {section.eyebrow}
                  </p>
                )}
                
                <h2 className="text-xl md:text-3xl font-[650] tracking-[-0.02em] text-ink mb-3 md:mb-4 leading-tight">
                  {section.title}
                </h2>
                
                {section.description && (
                  <p className="text-sm md:text-lg text-slate-600 mb-6 md:mb-8">
                    {section.description}
                  </p>
                )}

                {/* Comparison Grid */}
                {section.comparison && (
                  <div className="grid md:grid-cols-2 gap-4 md:gap-6 my-8 md:my-10">
                    {section.comparison.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 md:p-6 border border-slate-200 rounded-lg md:rounded-xl bg-white hover:shadow-lg transition-shadow duration-300"
                      >
                        <h3 className="text-base md:text-xl font-bold text-slate-900 mb-1 md:mb-2">{item.title}</h3>
                        <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">{item.subtitle}</p>
                        <ul className="space-y-1.5 md:space-y-2">
                          {item.points.map((point, j) => (
                            <li key={j} className="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm text-slate-700">
                              <span className="text-blue-500 mt-0.5 md:mt-1">•</span>
                              <span className="text-justify">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats */}
                {section.stats && (
                  <div className="grid md:grid-cols-3 gap-4 md:gap-6 my-8 md:my-10">
                    {section.stats.map((stat, i) => (
                      <div
                        key={i}
                        className="p-4 md:p-6 border border-slate-200 rounded-lg md:rounded-xl bg-slate-50 text-center"
                      >
                        <div className="text-xl md:text-2xl font-[650] tracking-[-0.02em] text-ink mb-1 md:mb-2">{stat.value}</div>
                        <div className="text-xs md:text-sm text-slate-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reasons */}
                {section.reasons && (
                  <ol className="space-y-8 md:space-y-10 my-8 md:my-10">
                    {section.reasons.map((reason, i) => (
                      <li key={i} className="relative pl-10 md:pl-12">
                        <span className="absolute left-0 top-0 text-3xl md:text-4xl font-[650] text-brand/70">
                          {reason.number}
                        </span>
                        <h3 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-4">{reason.title}</h3>
                        
                        {reason.content.map((para, j) => (
                          <p key={j} className="mb-3 md:mb-4 text-body text-base md:text-[1.0625rem] leading-[1.75]">
                            {para}
                          </p>
                        ))}

                        {reason.quote && (
                          <blockquote className="my-4 md:my-6 pl-3 md:pl-4 border-l-3 md:border-l-4 border-blue-500 bg-blue-50 p-3 md:p-4 rounded-r-lg">
                            <p className="text-slate-800 italic text-xs md:text-base">{reason.quote}</p>
                          </blockquote>
                        )}

                        {reason.citations && (
                          <p className="text-[0.65rem] md:text-xs text-slate-500 mt-3 md:mt-4">
                            {reason.citations.join(' · ')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {/* Content Paragraphs */}
                {section.content && (
                  <div className="my-6 md:my-8">
                    {section.content.map((para, i) => (
                      <p key={i} className="mb-4 md:mb-6 text-body text-base md:text-[1.0625rem] leading-[1.75]">
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {/* Pillars */}
                {section.pillars && (
                  <div className="grid md:grid-cols-2 gap-4 md:gap-6 my-8 md:my-10">
                    {section.pillars.map((pillar, i) => (
                      <div
                        key={i}
                        className="p-4 md:p-6 border border-slate-200 rounded-lg md:rounded-xl bg-white hover:shadow-lg transition-shadow duration-300"
                      >
                        <h4 className="text-sm md:text-lg font-bold text-slate-900 mb-1 md:mb-2">{pillar.title}</h4>
                        <p className="text-xs md:text-sm text-slate-600">{pillar.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Images after this section (if any) */}
              {getImagesByPosition(`after-section-${sectionIndex}`).map((img) => (
                <BlogImage key={img.src} src={img.src} alt={img.alt} caption={img.caption} width={img.width} height={img.height} />
              ))}

              {/* Special position: after comparison (first section) */}
              {sectionIndex === 0 && getImagesByPosition('after-comparison').map((img) => (
                <BlogImage key={img.src} src={img.src} alt={img.alt} caption={img.caption} width={img.width} height={img.height} />
              ))}
            </div>
          ))}

          {/* References */}
          {post.content.references && (
            <section className="mb-12 md:mb-16">
              <h2 className="text-xl md:text-3xl font-[650] tracking-[-0.02em] text-ink mb-6 md:mb-8">Scientific References</h2>
              <ol className="space-y-4 md:space-y-6">
                {post.content.references.map((ref) => (
                  <li key={ref.id} className="pb-4 md:pb-6 border-b border-slate-100 last:border-0">
                    <div className="font-bold text-slate-900 text-xs md:text-base mb-1">{ref.title}</div>
                    <div className="text-[0.65rem] md:text-sm text-slate-600 mb-1 md:mb-2">
                      {ref.authors} · {ref.journal} · {ref.year}
                    </div>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.65rem] md:text-sm text-blue-600 hover:text-blue-700 underline break-all"
                    >
                      {ref.url}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Author Info */}
        <div className="mt-12 md:mt-16 p-6 md:p-8 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl md:rounded-2xl border border-blue-100">
          <p className="text-[0.65rem] md:text-xs font-bold tracking-widest uppercase text-muted mb-2 md:mb-3">Author</p>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-base md:text-xl flex-shrink-0">
              OT
            </div>
            <div>
              <h3 className="text-base md:text-xl font-bold text-slate-900 mb-1 md:mb-2">{post.author}</h3>
              <p className="text-xs md:text-base text-slate-600 leading-relaxed">
                Pioneering the future of precision oncology through AI-powered molecular surveillance and liquid biopsy technologies.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-hairline bg-canvas py-12 md:py-16">
          <div className="ot-container">
            <h2 className="text-2xl md:text-3xl font-[650] tracking-[-0.02em] text-ink mb-6 md:mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
              {relatedPosts.map((related) => (
                <article
                  key={related.id}
                  className="group relative overflow-hidden rounded-xl border border-hairline bg-white shadow-soft transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-lift"
                >
                  <div className="p-4 md:p-6">
                    <span className="inline-block px-2.5 py-0.5 md:px-3 md:py-1 text-[0.65rem] md:text-xs font-semibold uppercase bg-blue-50 text-blue-600 rounded-lg mb-2 md:mb-3">
                      {related.category}
                    </span>
                    <h3 className="mb-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
                      <a
                        href={`/blog/${related.slug}`}
                        onClick={(e) => { e.preventDefault(); navigate(`/blog/${related.slug}`); }}
                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                      >
                        {related.title}
                      </a>
                    </h3>
                    <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4 line-clamp-2">
                      {related.subtitle}
                    </p>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[0.65rem] md:text-xs text-slate-500">
                      <span>{formatDate(related.date)}</span>
                      <span>•</span>
                      <span>{related.readTime} min read</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog */}
      <div className="mx-auto max-w-[52rem] px-4 py-10 md:px-6 md:py-12">
        <button
          type="button"
          onClick={() => navigate('/blog')}
          className="ot-btn ot-btn-secondary"
        >
          <IconArrowLeft size={17} stroke={1.75} aria-hidden="true" />
          Back to All Articles
        </button>
      </div>
    </main>
  );
}