import { SITE } from '../site.config.mjs';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const end = value => /[.!?]$/.test(value) ? value : value + '.';

export function apaBlogCitations(post) {
  const { title, date, url, citationTitleEn, citationTitleSource } = post;
  if (citationTitleSource !== title) throw new Error(`Citation title source drift: ${post.slug}`);
  if (!citationTitleEn || /[가-힣]/.test(citationTitleEn)) throw new Error(`Missing English citation title: ${post.slug}`);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!match) throw new Error(`Invalid citation date: ${post.slug}`);
  const [, y, m, d] = match, stamp = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (Number.isNaN(stamp.getTime()) || stamp.toISOString().slice(0,10) !== `${y}-${m}-${d}`) throw new Error(`Invalid citation date: ${post.slug}`);
  const month = new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(stamp);
  // Korean rendering follows the university APA 7 application guide; not an in-text citation.
  // English rendering cites the English title translation alone, with no romanized transcription (author decision 2026-11-24).
  const make = (lang, author, when, workTitle, blog, inText) => {
    const lead = `${author} ${when} ${end(workTitle)} `;
    const plain = lead + blog + '. ' + url;
    const fragment = `${esc(lead)}<i>${esc(blog)}</i>. <a href="${esc(url)}">${esc(url)}</a>`;
    return {lang,plain,fragment,inText,html:`<p style="margin:0;padding-left:0.5in;text-indent:-0.5in;line-height:2">${fragment}</p>`};
  };
  return {
    ko:make('ko',SITE.citation.ko.author,`(${y}. ${Number(m)}. ${Number(d)}.).`,title,SITE.citation.ko.blog,`(${SITE.citation.ko.inText}, ${y})`),
    en:make('en',SITE.citation.en.author,`(${y}, ${month} ${Number(d)}).`,citationTitleEn,SITE.citation.en.blog,`(${SITE.citation.en.inText}, ${y})`),
  };
}
