/** Small gradient logo square used in the nav and on the login page. */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10h18" />
        <path d="M12 3l9 7H3l9-7z" />
        <path d="M5 10v8M12 10v8M19 10v8" />
        <path d="M3 21h18" />
      </svg>
    </span>
  );
}
