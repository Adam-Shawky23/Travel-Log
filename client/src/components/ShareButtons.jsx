const buttonClasses =
  'text-sm font-medium bg-white border border-paper-200 text-ink-900 px-4 py-2 rounded-full hover:border-brass-500 transition-colors inline-flex items-center gap-2';

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 6L12 13L20.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5A9.5 9.5 0 0 0 3.6 17L2.5 21.5l4.6-1.2A9.5 9.5 0 1 0 12 2.5Zm0 1.7a7.8 7.8 0 1 1-4.1 14.4l-.3-.2-2.7.7.7-2.6-.2-.3A7.8 7.8 0 0 1 12 4.2Zm-3 3.9c-.2 0-.5 0-.7.3-.2.3-.9.8-.9 2s.9 2.4 1 2.6c.1.1 1.8 2.8 4.4 3.8 2.1.9 2.5.7 3 .6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.4-.3-.1-1.5-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.4c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4Z" />
    </svg>
  );
}

function ShareButtons({ url, title }) {
  const shareText = `Check out this trip: ${title} — ${url}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(`Check out this trip: ${title}`)}&body=${encodeURIComponent(`${title}\n\n${url}`)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="flex flex-wrap gap-3">
      <a href={mailtoHref} className={buttonClasses}>
        <EmailIcon />
        Email
      </a>
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonClasses}>
        <WhatsAppIcon />
        WhatsApp
      </a>
    </div>
  );
}

export default ShareButtons;
