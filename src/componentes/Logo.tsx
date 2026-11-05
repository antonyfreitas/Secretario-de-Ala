/** Capela com agulha (sem cruz), inspirada nas capelas da Igreja: agulha clara, arco de tijolo e painel de pedra. */
export default function Logo({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg className="logo" width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#22334D" />
      <circle cx="32" cy="22" r="20" fill="#F2C45A" opacity=".1" />
      <polygon points="32,4 36,31 28,31" fill="#F6E7B4" />
      <rect x="25" y="30" width="14" height="3" fill="#EBD79C" />
      <rect x="27" y="33" width="10" height="8" fill="#F6E7B4" />
      <path d="M30 40v-3.5a2 2 0 0 1 4 0V40z" fill="#22334D" />
      <rect x="15" y="40" width="34" height="60" rx="17" fill="#C0622F" />
      <rect x="20" y="45" width="24" height="60" rx="12" fill="#F2C45A" />
      <rect x="25" y="49" width="14" height="60" rx="7" fill="#B9773A" />
      <path d="M25 56h14M25 62h14M32 49v7M28.5 56v6M35.5 62v2" stroke="#D9A15C" strokeWidth=".8" fill="none" />
    </svg>
  );
}
